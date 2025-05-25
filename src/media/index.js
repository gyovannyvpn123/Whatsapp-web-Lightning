/**
 * Media Handler for WhatsApp Web
 * Handles media upload, download, encryption, and decryption
 */

const fs = require('fs').promises;
const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');
const Helpers = require('../utils/helpers');
const { FileLimits, SupportedMimeTypes, Endpoints } = require('../utils/constants');

class MediaHandler {
    constructor(core) {
        this.core = core;
        this.uploadEndpoint = process.env.WHATSAPP_MEDIA_UPLOAD || Endpoints.MEDIA_UPLOAD;
        this.downloadEndpoint = process.env.WHATSAPP_MEDIA_DOWNLOAD || Endpoints.MEDIA_DOWNLOAD;
    }
    
    /**
     * Upload media file
     */
    async upload(mediaPath, options = {}) {
        try {
            // Validate file
            const fileStats = await Helpers.getFileStats(mediaPath);
            if (!fileStats) {
                throw new Error('File not found');
            }
            
            // Read file
            const fileBuffer = await fs.readFile(mediaPath);
            
            // Determine media type and validate
            const mediaType = options.type || this._detectMediaType(mediaPath, fileBuffer);
            this._validateMedia(fileBuffer, mediaType);
            
            // Generate media keys
            const mediaKey = crypto.randomBytes(32);
            const mediaKeyExpanded = await this._expandMediaKey(mediaKey);
            
            // Encrypt media
            const encryptedMedia = await this._encryptMedia(fileBuffer, mediaKeyExpanded);
            
            // Calculate hashes
            const fileSha256 = Helpers.calculateBufferHash(fileBuffer, 'sha256');
            const fileEncSha256 = Helpers.calculateBufferHash(encryptedMedia.ciphertext, 'sha256');
            
            // Upload encrypted media
            const uploadResult = await this._uploadToServer(encryptedMedia.ciphertext, mediaType);
            
            // Generate thumbnail if needed
            let thumbnail = null;
            if (mediaType === 'image' || mediaType === 'video') {
                thumbnail = await this._generateThumbnail(fileBuffer, mediaType);
            }
            
            return {
                type: mediaType,
                url: uploadResult.url,
                directPath: uploadResult.directPath,
                mediaKey: mediaKey,
                fileSha256: fileSha256,
                fileEncSha256: fileEncSha256,
                fileLength: fileBuffer.length,
                mimetype: options.mimetype || this._getMimetype(mediaPath),
                fileName: options.fileName || Helpers.sanitizeFilename(mediaPath.split('/').pop()),
                thumbnail: thumbnail
            };
            
        } catch (error) {
            console.error('Media upload failed:', error);
            throw error;
        }
    }
    
    /**
     * Download and decrypt media
     */
    async download(mediaMessage, outputPath) {
        try {
            if (!mediaMessage.url || !mediaMessage.mediaKey) {
                throw new Error('Invalid media message: missing URL or media key');
            }
            
            // Download encrypted media
            const encryptedBuffer = await this._downloadFromServer(mediaMessage.url);
            
            // Verify encrypted file hash
            if (mediaMessage.fileEncSha256) {
                const downloadedHash = Helpers.calculateBufferHash(encryptedBuffer, 'sha256');
                if (!downloadedHash.equals(mediaMessage.fileEncSha256)) {
                    throw new Error('Downloaded file hash mismatch');
                }
            }
            
            // Expand media key
            const mediaKeyExpanded = await this._expandMediaKey(mediaMessage.mediaKey);
            
            // Decrypt media
            const decryptedBuffer = await this._decryptMedia(encryptedBuffer, mediaKeyExpanded);
            
            // Verify decrypted file hash
            if (mediaMessage.fileSha256) {
                const decryptedHash = Helpers.calculateBufferHash(decryptedBuffer, 'sha256');
                if (!decryptedHash.equals(mediaMessage.fileSha256)) {
                    throw new Error('Decrypted file hash mismatch');
                }
            }
            
            // Save to file if output path provided
            if (outputPath) {
                await Helpers.ensureDir(require('path').dirname(outputPath));
                await fs.writeFile(outputPath, decryptedBuffer);
            }
            
            return decryptedBuffer;
            
        } catch (error) {
            console.error('Media download failed:', error);
            throw error;
        }
    }
    
    /**
     * Encrypt media using AES-256-CBC + HMAC
     */
    async _encryptMedia(buffer, expandedKey) {
        try {
            const iv = crypto.randomBytes(16);
            const cipherKey = expandedKey.slice(0, 32);
            const macKey = expandedKey.slice(32, 64);
            
            // Encrypt with AES-256-CBC
            const cipher = crypto.createCipher('aes-256-cbc', cipherKey);
            let ciphertext = cipher.update(buffer);
            ciphertext = Buffer.concat([ciphertext, cipher.final()]);
            
            // Calculate HMAC
            const hmac = crypto.createHmac('sha256', macKey);
            hmac.update(iv);
            hmac.update(ciphertext);
            const mac = hmac.digest().slice(0, 10); // Use first 10 bytes
            
            // Combine IV + ciphertext + MAC
            const encryptedData = Buffer.concat([iv, ciphertext, mac]);
            
            return {
                ciphertext: encryptedData,
                iv: iv,
                mac: mac
            };
            
        } catch (error) {
            console.error('Media encryption failed:', error);
            throw error;
        }
    }
    
    /**
     * Decrypt media using AES-256-CBC + HMAC verification
     */
    async _decryptMedia(encryptedBuffer, expandedKey) {
        try {
            const cipherKey = expandedKey.slice(0, 32);
            const macKey = expandedKey.slice(32, 64);
            
            // Extract components
            const iv = encryptedBuffer.slice(0, 16);
            const mac = encryptedBuffer.slice(-10);
            const ciphertext = encryptedBuffer.slice(16, -10);
            
            // Verify HMAC
            const hmac = crypto.createHmac('sha256', macKey);
            hmac.update(iv);
            hmac.update(ciphertext);
            const calculatedMac = hmac.digest().slice(0, 10);
            
            if (!crypto.timingSafeEqual(mac, calculatedMac)) {
                throw new Error('HMAC verification failed');
            }
            
            // Decrypt
            const decipher = crypto.createDecipher('aes-256-cbc', cipherKey);
            let plaintext = decipher.update(ciphertext);
            plaintext = Buffer.concat([plaintext, decipher.final()]);
            
            return plaintext;
            
        } catch (error) {
            console.error('Media decryption failed:', error);
            throw error;
        }
    }
    
    /**
     * Expand media key using HKDF
     */
    async _expandMediaKey(mediaKey) {
        const info = Buffer.from('WhatsApp Media Keys');
        const salt = Buffer.alloc(32);
        
        return await this._hkdf(mediaKey, salt, info, 112); // 32 + 32 + 48 bytes
    }
    
    /**
     * HKDF implementation
     */
    async _hkdf(inputKeyMaterial, salt, info, length) {
        // Extract
        const prk = crypto.createHmac('sha256', salt)
            .update(inputKeyMaterial)
            .digest();
        
        // Expand
        const n = Math.ceil(length / 32);
        const t = [];
        
        for (let i = 0; i < n; i++) {
            const hmac = crypto.createHmac('sha256', prk);
            
            if (i > 0) {
                hmac.update(t[i - 1]);
            }
            
            hmac.update(info);
            hmac.update(Buffer.from([i + 1]));
            
            t[i] = hmac.digest();
        }
        
        const okm = Buffer.concat(t);
        return okm.slice(0, length);
    }
    
    /**
     * Upload encrypted media to WhatsApp servers
     */
    async _uploadToServer(encryptedBuffer, mediaType) {
        return new Promise((resolve, reject) => {
            try {
                const url = new URL(this.uploadEndpoint);
                
                const postData = JSON.stringify({
                    data: encryptedBuffer.toString('base64'),
                    type: mediaType
                });
                
                const options = {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData),
                        'User-Agent': 'WhatsApp/2.2009.8 Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                };
                
                const req = https.request(options, (res) => {
                    let data = '';
                    
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    res.on('end', () => {
                        try {
                            if (res.statusCode !== 200) {
                                reject(new Error(`Upload failed with status: ${res.statusCode}`));
                                return;
                            }
                            
                            const response = JSON.parse(data);
                            
                            if (!response.url) {
                                reject(new Error('Invalid upload response: missing URL'));
                                return;
                            }
                            
                            resolve({
                                url: response.url,
                                directPath: response.directPath || response.url
                            });
                            
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
                
                req.on('error', (error) => {
                    reject(error);
                });
                
                req.write(postData);
                req.end();
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Download encrypted media from WhatsApp servers
     */
    async _downloadFromServer(mediaUrl) {
        return new Promise((resolve, reject) => {
            try {
                const url = new URL(mediaUrl);
                
                const options = {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname + url.search,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'WhatsApp/2.2009.8 Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                };
                
                const req = https.request(options, (res) => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`Download failed with status: ${res.statusCode}`));
                        return;
                    }
                    
                    const chunks = [];
                    
                    res.on('data', (chunk) => {
                        chunks.push(chunk);
                    });
                    
                    res.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        resolve(buffer);
                    });
                });
                
                req.on('error', (error) => {
                    reject(error);
                });
                
                req.end();
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Detect media type from file
     */
    _detectMediaType(filePath, buffer) {
        // Try to detect from file extension first
        const ext = Helpers.getFileExtension(filePath).toLowerCase();
        
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        const videoExts = ['mp4', '3gp', 'mov', 'avi', 'mkv'];
        const audioExts = ['mp3', 'aac', 'm4a', 'amr', 'ogg', 'wav'];
        
        if (imageExts.includes(ext)) return 'image';
        if (videoExts.includes(ext)) return 'video';
        if (audioExts.includes(ext)) return 'audio';
        
        // Try to detect from file signature (magic bytes)
        if (buffer.length >= 4) {
            const signature = buffer.slice(0, 4);
            
            // JPEG
            if (signature[0] === 0xFF && signature[1] === 0xD8) {
                return 'image';
            }
            
            // PNG
            if (signature[0] === 0x89 && signature[1] === 0x50 && 
                signature[2] === 0x4E && signature[3] === 0x47) {
                return 'image';
            }
            
            // MP4
            if (buffer.length >= 8) {
                const ftyp = buffer.slice(4, 8).toString('ascii');
                if (ftyp === 'ftyp') {
                    return 'video';
                }
            }
        }
        
        return 'document';
    }
    
    /**
     * Get MIME type from file path
     */
    _getMimetype(filePath) {
        const ext = Helpers.getFileExtension(filePath).toLowerCase();
        
        const mimetypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'mp4': 'video/mp4',
            '3gp': 'video/3gpp',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'mkv': 'video/x-matroska',
            'mp3': 'audio/mpeg',
            'aac': 'audio/aac',
            'm4a': 'audio/mp4',
            'amr': 'audio/amr',
            'ogg': 'audio/ogg',
            'wav': 'audio/wav',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed'
        };
        
        return mimetypes[ext] || 'application/octet-stream';
    }
    
    /**
     * Validate media file
     */
    _validateMedia(buffer, mediaType) {
        // Check file size
        if (!Helpers.validateFileSize(buffer.length, mediaType)) {
            throw new Error(`File too large for ${mediaType}. Max size: ${Helpers.formatFileSize(FileLimits[mediaType.toUpperCase()])}`);
        }
        
        // Additional validations can be added here
        console.log(`Media validation passed: ${mediaType}, size: ${Helpers.formatFileSize(buffer.length)}`);
    }
    
    /**
     * Generate thumbnail for media
     */
    async _generateThumbnail(buffer, mediaType) {
        try {
            if (mediaType === 'image') {
                // For images, create a smaller version
                // This is a simplified implementation - in production, use image processing library
                return buffer.slice(0, Math.min(buffer.length, 8192));
            }
            
            if (mediaType === 'video') {
                // For videos, this would extract a frame - simplified here
                return Buffer.alloc(100).fill(0x42);
            }
            
            return null;
            
        } catch (error) {
            console.error('Thumbnail generation failed:', error);
            return null;
        }
    }
    
    /**
     * Decrypt media message (for incoming messages)
     */
    async decryptMedia(mediaMessage, mediaKey) {
        try {
            if (!mediaMessage.url || !mediaKey) {
                throw new Error('Invalid media message or key');
            }
            
            // Download encrypted media
            const encryptedBuffer = await this._downloadFromServer(mediaMessage.url);
            
            // Expand media key
            const expandedKey = await this._expandMediaKey(mediaKey);
            
            // Decrypt
            const decryptedBuffer = await this._decryptMedia(encryptedBuffer, expandedKey);
            
            return decryptedBuffer;
            
        } catch (error) {
            console.error('Media decryption failed:', error);
            throw error;
        }
    }
    
    /**
     * Get media info from message
     */
    getMediaInfo(message) {
        const content = message.message;
        
        if (content.imageMessage) {
            return {
                type: 'image',
                ...content.imageMessage
            };
        }
        
        if (content.videoMessage) {
            return {
                type: 'video',
                ...content.videoMessage
            };
        }
        
        if (content.audioMessage) {
            return {
                type: 'audio',
                ...content.audioMessage
            };
        }
        
        if (content.documentMessage) {
            return {
                type: 'document',
                ...content.documentMessage
            };
        }
        
        return null;
    }
}

module.exports = MediaHandler;
