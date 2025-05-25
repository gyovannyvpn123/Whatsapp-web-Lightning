/**
 * Utility Helper Functions
 * Common utility functions used throughout the WhatsApp Web library
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class Helpers {
    /**
     * Generate unique ID
     */
    static generateId(length = 16) {
        return crypto.randomBytes(length).toString('hex');
    }
    
    /**
     * Generate WhatsApp message ID format
     */
    static generateWhatsAppId() {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(8).toString('hex');
        return `${timestamp}${random}`.toUpperCase();
    }
    
    /**
     * Format phone number to WhatsApp JID format
     */
    static formatJID(phoneNumber, type = 'individual') {
        // Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        if (type === 'group') {
            return `${cleaned}@g.us`;
        }
        
        return `${cleaned}@s.whatsapp.net`;
    }
    
    /**
     * Parse JID to get phone number
     */
    static parseJID(jid) {
        if (!jid || typeof jid !== 'string') {
            return null;
        }
        
        const parts = jid.split('@');
        if (parts.length !== 2) {
            return null;
        }
        
        return {
            phone: parts[0],
            server: parts[1],
            isGroup: parts[1] === 'g.us'
        };
    }
    
    /**
     * Validate phone number
     */
    static validatePhoneNumber(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return false;
        }
        
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Basic validation: should be between 7 and 15 digits
        return cleaned.length >= 7 && cleaned.length <= 15;
    }
    
    /**
     * Format timestamp to WhatsApp format
     */
    static formatTimestamp(timestamp) {
        if (!timestamp) {
            timestamp = Date.now();
        }
        
        return Math.floor(timestamp / 1000);
    }
    
    /**
     * Parse WhatsApp timestamp
     */
    static parseTimestamp(whatsappTimestamp) {
        return whatsappTimestamp * 1000;
    }
    
    /**
     * Validate file type for media messages
     */
    static validateMediaType(mimetype, mediaType) {
        const allowedTypes = {
            image: [
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/gif'
            ],
            video: [
                'video/mp4',
                'video/3gpp',
                'video/quicktime',
                'video/x-msvideo'
            ],
            audio: [
                'audio/aac',
                'audio/mp4',
                'audio/mpeg',
                'audio/amr',
                'audio/ogg'
            ],
            document: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'application/zip',
                'application/x-rar-compressed'
            ]
        };
        
        return allowedTypes[mediaType] && allowedTypes[mediaType].includes(mimetype);
    }
    
    /**
     * Get media type from mimetype
     */
    static getMediaTypeFromMimetype(mimetype) {
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        return 'document';
    }
    
    /**
     * Calculate file hash
     */
    static async calculateFileHash(filePath, algorithm = 'sha256') {
        try {
            const fileBuffer = await fs.readFile(filePath);
            return crypto.createHash(algorithm).update(fileBuffer).digest();
            
        } catch (error) {
            console.error('Failed to calculate file hash:', error);
            throw error;
        }
    }
    
    /**
     * Calculate buffer hash
     */
    static calculateBufferHash(buffer, algorithm = 'sha256') {
        return crypto.createHash(algorithm).update(buffer).digest();
    }
    
    /**
     * Convert buffer to base64
     */
    static bufferToBase64(buffer) {
        return buffer.toString('base64');
    }
    
    /**
     * Convert base64 to buffer
     */
    static base64ToBuffer(base64String) {
        return Buffer.from(base64String, 'base64');
    }
    
    /**
     * Sleep function
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Retry function with exponential backoff
     */
    static async retry(fn, maxAttempts = 3, baseDelay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
                
            } catch (error) {
                lastError = error;
                
                if (attempt === maxAttempts) {
                    break;
                }
                
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }
        
        throw lastError;
    }
    
    /**
     * Validate file size
     */
    static validateFileSize(fileSize, mediaType) {
        const limits = {
            image: 16 * 1024 * 1024,      // 16 MB
            video: 64 * 1024 * 1024,      // 64 MB
            audio: 16 * 1024 * 1024,      // 16 MB
            document: 100 * 1024 * 1024   // 100 MB
        };
        
        return fileSize <= (limits[mediaType] || limits.document);
    }
    
    /**
     * Generate thumbnail for media
     */
    static async generateThumbnail(filePath, mediaType) {
        // This is a simplified implementation
        // In a real implementation, you would use image/video processing libraries
        try {
            const fileBuffer = await fs.readFile(filePath);
            
            if (mediaType === 'image') {
                // For images, use a portion of the original as thumbnail
                return fileBuffer.slice(0, Math.min(fileBuffer.length, 8192));
            }
            
            // For other media types, generate a placeholder
            return Buffer.alloc(100).fill(0);
            
        } catch (error) {
            console.error('Failed to generate thumbnail:', error);
            return Buffer.alloc(100).fill(0);
        }
    }
    
    /**
     * Sanitize filename
     */
    static sanitizeFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            return 'untitled';
        }
        
        // Remove or replace invalid characters
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_{2,}/g, '_')
            .trim();
    }
    
    /**
     * Get file extension from filename
     */
    static getFileExtension(filename) {
        if (!filename || typeof filename !== 'string') {
            return '';
        }
        
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
    }
    
    /**
     * Format file size for display
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Deep clone object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Buffer) {
            return Buffer.from(obj);
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        
        return cloned;
    }
    
    /**
     * Merge objects deeply
     */
    static deepMerge(target, source) {
        const result = this.deepClone(target);
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Buffer.isBuffer(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }
    
    /**
     * Check if string is valid JSON
     */
    static isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Escape special characters for regex
     */
    static escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Generate random string
     */
    static generateRandomString(length = 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }
    
    /**
     * Create directory if it doesn't exist
     */
    static async ensureDir(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    
    /**
     * Check if file exists
     */
    static async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get file stats
     */
    static async getFileStats(filePath) {
        try {
            return await fs.stat(filePath);
        } catch (error) {
            return null;
        }
    }
}

module.exports = Helpers;
