/**
 * WhatsApp Web Message Definitions
 * Defines message structures and types used in WhatsApp Web protocol
 */

class Messages {
    constructor() {
        this.messageTypes = new Map();
        this.isInitialized = false;
    }
    
    async initialize() {
        this._defineMessageTypes();
        this.isInitialized = true;
        console.log('Message definitions loaded');
    }
    
    _defineMessageTypes() {
        // Text message structure
        this.messageTypes.set('text', {
            key: {
                remoteJid: 'string',
                fromMe: 'boolean',
                id: 'string'
            },
            message: {
                conversation: 'string'
            },
            messageTimestamp: 'number',
            status: 'number'
        });
        
        // Extended text message (with formatting, quotes, etc.)
        this.messageTypes.set('extendedText', {
            key: {
                remoteJid: 'string',
                fromMe: 'boolean',
                id: 'string'
            },
            message: {
                extendedTextMessage: {
                    text: 'string',
                    matchedText: 'string',
                    canonicalUrl: 'string',
                    description: 'string',
                    title: 'string',
                    textArgb: 'number',
                    backgroundArgb: 'number',
                    font: 'number',
                    contextInfo: 'object'
                }
            },
            messageTimestamp: 'number',
            status: 'number'
        });
        
        // Image message structure
        this.messageTypes.set('image', {
            key: {
                remoteJid: 'string',
                fromMe: 'boolean',
                id: 'string'
            },
            message: {
                imageMessage: {
                    url: 'string',
                    mimetype: 'string',
                    caption: 'string',
                    fileSha256: 'buffer',
                    fileLength: 'number',
                    height: 'number',
                    width: 'number',
                    mediaKey: 'buffer',
                    fileEncSha256: 'buffer',
                    directPath: 'string',
                    mediaKeyTimestamp: 'number',
                    jpegThumbnail: 'buffer'
                }
            },
            messageTimestamp: 'number',
            status: 'number'
        });
        
        // Video message structure
        this.messageTypes.set('video', {
            key: {
                remoteJid: 'string',
                fromMe: 'boolean',
                id: 'string'
            },
            message: {
                videoMessage: {
                    url: 'string',
                    mimetype: 'string',
                    caption: 'string',
                    fileSha256: 'buffer',
                    fileLength: 'number',
                    seconds: 'number',
                    mediaKey: 'buffer',
                    fileEncSha256: 'buffer',
                    directPath: 'string',
                    mediaKeyTimestamp: 'number',
                    jpegThumbnail: 'buffer',
                    height: 'number',
                    width: 'number'
                }
            },
            messageTimestamp: 'number',
            status: 'number'
        });
        
        // Audio message structure
        this.messageTypes.set('audio', {
            key: {
                remoteJid: 'string',
                fromMe: 'boolean',
                id: 'string'
            },
            message: {
                audioMessage: {
                    url: 'string',
                    mimetype: 'string',
                    fileSha256: 'buffer',
                    fileLength: 'number',
                    seconds: 'number',
                    ptt: 'boolean',
                    mediaKey: 'buffer',
                    fileEncSha256: 'buffer',
                    directPath: 'string',
                    mediaKeyTimestamp: 'number',
                    waveform: 'buffer'
                }
            },
            messageTimestamp: 'number',
            status: 'number'
        });
        
        // Document message structure
        this.messageTypes.set('document', {
            key: {
                remoteJid: 'string',
                fromMe: 'boolean',
                id: 'string'
            },
            message: {
                documentMessage: {
                    url: 'string',
                    mimetype: 'string',
                    title: 'string',
                    fileSha256: 'buffer',
                    fileLength: 'number',
                    pageCount: 'number',
                    mediaKey: 'buffer',
                    fileName: 'string',
                    fileEncSha256: 'buffer',
                    directPath: 'string',
                    mediaKeyTimestamp: 'number',
                    jpegThumbnail: 'buffer'
                }
            },
            messageTimestamp: 'number',
            status: 'number'
        });
        
        // Contact message structure
        this.messageTypes.set('contact', {
            key: {
                remoteJid: 'string',
                fromMe: 'boolean',
                id: 'string'
            },
            message: {
                contactMessage: {
                    displayName: 'string',
                    vcard: 'string'
                }
            },
            messageTimestamp: 'number',
            status: 'number'
        });
        
        // Location message structure
        this.messageTypes.set('location', {
            key: {
                remoteJid: 'string',
                fromMe: 'boolean',
                id: 'string'
            },
            message: {
                locationMessage: {
                    degreesLatitude: 'number',
                    degreesLongitude: 'number',
                    name: 'string',
                    address: 'string',
                    url: 'string',
                    jpegThumbnail: 'buffer'
                }
            },
            messageTimestamp: 'number',
            status: 'number'
        });
        
        // Group invite message structure
        this.messageTypes.set('groupInvite', {
            key: {
                remoteJid: 'string',
                fromMe: 'boolean',
                id: 'string'
            },
            message: {
                groupInviteMessage: {
                    groupJid: 'string',
                    inviteCode: 'string',
                    inviteExpiration: 'number',
                    groupName: 'string',
                    jpegThumbnail: 'buffer',
                    caption: 'string'
                }
            },
            messageTimestamp: 'number',
            status: 'number'
        });
        
        // Protocol messages (non-chat messages)
        this.messageTypes.set('receipt', {
            tag: 'receipt',
            attrs: {
                to: 'string',
                type: 'string',
                id: 'string',
                t: 'string'
            }
        });
        
        this.messageTypes.set('presence', {
            tag: 'presence',
            attrs: {
                type: 'string',
                from: 'string'
            }
        });
        
        this.messageTypes.set('chatstate', {
            tag: 'chatstate',
            attrs: {
                from: 'string'
            },
            content: 'string'
        });
        
        this.messageTypes.set('iq', {
            tag: 'iq',
            attrs: {
                type: 'string',
                id: 'string',
                from: 'string',
                to: 'string'
            },
            content: 'object'
        });
    }
    
    /**
     * Get message template by type
     */
    getMessageTemplate(type) {
        return this.messageTypes.get(type);
    }
    
    /**
     * Validate message against template
     */
    validateMessage(message, type) {
        const template = this.getMessageTemplate(type);
        if (!template) {
            return { valid: false, error: 'Unknown message type' };
        }
        
        return this._validateObject(message, template);
    }
    
    _validateObject(obj, template) {
        const errors = [];
        
        for (const [key, expectedType] of Object.entries(template)) {
            if (!(key in obj)) {
                errors.push(`Missing required field: ${key}`);
                continue;
            }
            
            if (!this._validateType(obj[key], expectedType)) {
                errors.push(`Invalid type for field ${key}: expected ${expectedType}, got ${typeof obj[key]}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    _validateType(value, expectedType) {
        if (expectedType === 'object') {
            return typeof value === 'object' && value !== null;
        }
        
        if (expectedType === 'buffer') {
            return Buffer.isBuffer(value);
        }
        
        if (expectedType === 'array') {
            return Array.isArray(value);
        }
        
        return typeof value === expectedType;
    }
    
    /**
     * Create message structure from type and data
     */
    createMessage(type, data) {
        const template = this.getMessageTemplate(type);
        if (!template) {
            throw new Error(`Unknown message type: ${type}`);
        }
        
        // Deep clone template and fill with data
        const message = this._deepClone(template);
        return this._fillTemplate(message, data);
    }
    
    _deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this._deepClone(item));
        }
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this._deepClone(obj[key]);
            }
        }
        
        return cloned;
    }
    
    _fillTemplate(template, data) {
        for (const key in data) {
            if (key in template) {
                if (typeof template[key] === 'object' && template[key] !== null && !Buffer.isBuffer(template[key])) {
                    template[key] = this._fillTemplate(template[key], data[key]);
                } else {
                    template[key] = data[key];
                }
            }
        }
        
        return template;
    }
    
    /**
     * Get supported message types
     */
    getSupportedTypes() {
        return Array.from(this.messageTypes.keys());
    }
    
    /**
     * Check if message type is supported
     */
    isTypeSupported(type) {
        return this.messageTypes.has(type);
    }
    
    /**
     * Get media message types
     */
    getMediaTypes() {
        return ['image', 'video', 'audio', 'document'];
    }
    
    /**
     * Check if message type is media
     */
    isMediaType(type) {
        return this.getMediaTypes().includes(type);
    }
    
    /**
     * Get protocol message types
     */
    getProtocolTypes() {
        return ['receipt', 'presence', 'chatstate', 'iq'];
    }
    
    /**
     * Check if message type is protocol message
     */
    isProtocolType(type) {
        return this.getProtocolTypes().includes(type);
    }
    
    /**
     * Extract message content based on type
     */
    extractContent(message) {
        if (!message || !message.message) {
            return null;
        }
        
        const messageContent = message.message;
        
        // Text message
        if (messageContent.conversation) {
            return {
                type: 'text',
                text: messageContent.conversation
            };
        }
        
        // Extended text message
        if (messageContent.extendedTextMessage) {
            return {
                type: 'text',
                text: messageContent.extendedTextMessage.text,
                contextInfo: messageContent.extendedTextMessage.contextInfo
            };
        }
        
        // Image message
        if (messageContent.imageMessage) {
            return {
                type: 'image',
                caption: messageContent.imageMessage.caption,
                url: messageContent.imageMessage.url,
                mediaKey: messageContent.imageMessage.mediaKey,
                mimetype: messageContent.imageMessage.mimetype,
                fileLength: messageContent.imageMessage.fileLength
            };
        }
        
        // Video message
        if (messageContent.videoMessage) {
            return {
                type: 'video',
                caption: messageContent.videoMessage.caption,
                url: messageContent.videoMessage.url,
                mediaKey: messageContent.videoMessage.mediaKey,
                mimetype: messageContent.videoMessage.mimetype,
                fileLength: messageContent.videoMessage.fileLength,
                seconds: messageContent.videoMessage.seconds
            };
        }
        
        // Audio message
        if (messageContent.audioMessage) {
            return {
                type: 'audio',
                url: messageContent.audioMessage.url,
                mediaKey: messageContent.audioMessage.mediaKey,
                mimetype: messageContent.audioMessage.mimetype,
                fileLength: messageContent.audioMessage.fileLength,
                seconds: messageContent.audioMessage.seconds,
                ptt: messageContent.audioMessage.ptt
            };
        }
        
        // Document message
        if (messageContent.documentMessage) {
            return {
                type: 'document',
                fileName: messageContent.documentMessage.fileName,
                url: messageContent.documentMessage.url,
                mediaKey: messageContent.documentMessage.mediaKey,
                mimetype: messageContent.documentMessage.mimetype,
                fileLength: messageContent.documentMessage.fileLength
            };
        }
        
        // Contact message
        if (messageContent.contactMessage) {
            return {
                type: 'contact',
                displayName: messageContent.contactMessage.displayName,
                vcard: messageContent.contactMessage.vcard
            };
        }
        
        // Location message
        if (messageContent.locationMessage) {
            return {
                type: 'location',
                latitude: messageContent.locationMessage.degreesLatitude,
                longitude: messageContent.locationMessage.degreesLongitude,
                name: messageContent.locationMessage.name,
                address: messageContent.locationMessage.address
            };
        }
        
        return {
            type: 'unknown',
            raw: messageContent
        };
    }
}

module.exports = Messages;
