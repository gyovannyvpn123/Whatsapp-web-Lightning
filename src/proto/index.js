/**
 * Protocol Buffer Handler for WhatsApp Web
 * Handles encoding/decoding of WhatsApp Web protocol messages using real protocol
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const { whatsappReadBinary } = require('./binary-reader');
const { whatsappWriteBinary } = require('./binary-writer');
const { WATags, WAMetrics, WAFlags } = require('../utils/constants');

class ProtoHandler extends EventEmitter {
    constructor(core) {
        super();
        this.core = core;
        this.messageCounter = 0;
        this.isInitialized = false;
    }
    
    async initialize() {
        this.isInitialized = true;
        console.log('Protocol handler initialized');
    }
    
    /**
     * Create authentication init message using real WhatsApp protocol
     */
    createAuthInit() {
        const node = [
            'admin',
            { type: 'init' },
            [
                ['clientVersion', {}, [0, 4, 2009, 8]],
                ['platform', {}, 'web'],
                ['releaseChannel', {}, 'stable']
            ]
        ];
        
        return whatsappWriteBinary(node);
    }
    
    /**
     * Create resume message for existing session
     */
    createResumeMessage(sessionData) {
        const node = [
            'admin',
            { type: 'login' },
            [
                ['clientToken', {}, sessionData.clientToken],
                ['serverToken', {}, sessionData.serverToken],
                ['clientId', {}, sessionData.clientId]
            ]
        ];
        
        return whatsappWriteBinary(node);
    }
    
    /**
     * Create QR authentication message
     */
    createQRAuthMessage(qrData) {
        const binary = [
            ['ref', qrData.serverRef],
            ['publicKey', Buffer.from(qrData.publicKey, 'base64')],
            ['clientId', Buffer.from(qrData.clientId, 'base64')]
        ];
        
        return this._createBinaryMessage('admin', 'challenge', binary);
    }
    
    /**
     * Create pairing request message
     */
    createPairingRequest(request) {
        const binary = [
            ['phoneNumber', request.phoneNumber],
            ['clientId', Buffer.from(request.clientId, 'base64')],
            ['publicKey', Buffer.from(request.publicKey, 'base64')]
        ];
        
        return this._createBinaryMessage('admin', 'pair', binary);
    }
    
    /**
     * Create pairing confirmation message
     */
    createPairingConfirmation(code) {
        const binary = [
            ['code', code]
        ];
        
        return this._createBinaryMessage('admin', 'pair-confirm', binary);
    }
    
    /**
     * Create text message
     */
    createTextMessage(chatId, content, options = {}) {
        const messageId = this._generateMessageId();
        
        const message = {
            key: {
                remoteJid: chatId,
                fromMe: true,
                id: messageId
            },
            message: {
                conversation: content
            },
            messageTimestamp: Math.floor(Date.now() / 1000),
            status: 1
        };
        
        if (options.quotedMessage) {
            message.message.extendedTextMessage = {
                text: content,
                contextInfo: {
                    quotedMessage: options.quotedMessage
                }
            };
            delete message.message.conversation;
        }
        
        return this._createMessageNode(message);
    }
    
    /**
     * Create media message
     */
    createMediaMessage(chatId, mediaData, options = {}) {
        const messageId = this._generateMessageId();
        
        const message = {
            key: {
                remoteJid: chatId,
                fromMe: true,
                id: messageId
            },
            messageTimestamp: Math.floor(Date.now() / 1000),
            status: 1
        };
        
        // Set media type and data
        switch (mediaData.type) {
            case 'image':
                message.message = {
                    imageMessage: {
                        url: mediaData.url,
                        mimetype: mediaData.mimetype,
                        fileSha256: mediaData.fileSha256,
                        fileLength: mediaData.fileLength,
                        mediaKey: mediaData.mediaKey,
                        caption: options.caption || ''
                    }
                };
                break;
                
            case 'video':
                message.message = {
                    videoMessage: {
                        url: mediaData.url,
                        mimetype: mediaData.mimetype,
                        fileSha256: mediaData.fileSha256,
                        fileLength: mediaData.fileLength,
                        mediaKey: mediaData.mediaKey,
                        caption: options.caption || '',
                        seconds: mediaData.duration || 0
                    }
                };
                break;
                
            case 'audio':
                message.message = {
                    audioMessage: {
                        url: mediaData.url,
                        mimetype: mediaData.mimetype,
                        fileSha256: mediaData.fileSha256,
                        fileLength: mediaData.fileLength,
                        mediaKey: mediaData.mediaKey,
                        seconds: mediaData.duration || 0,
                        ptt: options.ptt || false
                    }
                };
                break;
                
            case 'document':
                message.message = {
                    documentMessage: {
                        url: mediaData.url,
                        mimetype: mediaData.mimetype,
                        fileSha256: mediaData.fileSha256,
                        fileLength: mediaData.fileLength,
                        mediaKey: mediaData.mediaKey,
                        fileName: mediaData.fileName || 'document'
                    }
                };
                break;
        }
        
        return this._createMessageNode(message);
    }
    
    /**
     * Create delivery receipt
     */
    createDeliveryReceipt(message) {
        const receipt = {
            tag: 'receipt',
            attrs: {
                to: message.key.remoteJid,
                type: 'delivery',
                id: message.key.id
            }
        };
        
        return this._serializeNode(receipt);
    }
    
    /**
     * Create read receipt
     */
    createReadReceipt(message) {
        const receipt = {
            tag: 'receipt',
            attrs: {
                to: message.key.remoteJid,
                type: 'read',
                id: message.key.id
            }
        };
        
        return this._serializeNode(receipt);
    }
    
    /**
     * Create presence message
     */
    createPresenceMessage(presence = 'available') {
        const presenceNode = {
            tag: 'presence',
            attrs: {
                type: presence
            }
        };
        
        return this._serializeNode(presenceNode);
    }
    
    /**
     * Create typing indicator
     */
    createTypingMessage(chatId, isTyping = true) {
        const chatState = {
            tag: 'chatstate',
            attrs: {
                to: chatId
            },
            content: [{
                tag: isTyping ? 'composing' : 'paused',
                attrs: {}
            }]
        };
        
        return this._serializeNode(chatState);
    }
    
    /**
     * Create logout message
     */
    createLogoutMessage() {
        const logout = {
            tag: 'iq',
            attrs: {
                type: 'set',
                id: this._generateMessageId(),
                to: 's.whatsapp.net'
            },
            content: [{
                tag: 'remove-companion-device',
                attrs: {
                    jid: this.core.info.wid,
                    reason: 'user_initiated'
                }
            }]
        };
        
        return this._serializeNode(logout);
    }
    
    /**
     * Decode incoming binary message
     */
    decode(data) {
        try {
            if (!Buffer.isBuffer(data)) {
                data = Buffer.from(data);
            }
            
            // Parse WhatsApp binary format
            return this._parseBinaryMessage(data);
            
        } catch (error) {
            console.error('Failed to decode message:', error);
            return null;
        }
    }
    
    /**
     * Encode message to binary format
     */
    encode(message) {
        try {
            return this._serializeNode(message);
            
        } catch (error) {
            console.error('Failed to encode message:', error);
            throw error;
        }
    }
    
    _createBinaryMessage(tag, type, binary) {
        const node = {
            tag: tag,
            attrs: {
                type: type,
                id: this._generateMessageId()
            },
            content: binary
        };
        
        return this._serializeNode(node);
    }
    
    _createMessageNode(message) {
        const node = {
            tag: 'message',
            attrs: {
                to: message.key.remoteJid,
                type: 'text',
                id: message.key.id
            },
            content: message
        };
        
        return this._serializeNode(node);
    }
    
    _serializeNode(node) {
        // Simplified binary serialization for WhatsApp Web format
        try {
            const buffer = Buffer.alloc(1024); // Start with reasonable size
            let offset = 0;
            
            // Write tag
            const tagBuffer = Buffer.from(node.tag, 'utf8');
            buffer.writeUInt8(tagBuffer.length, offset++);
            tagBuffer.copy(buffer, offset);
            offset += tagBuffer.length;
            
            // Write attributes
            if (node.attrs) {
                const attrsData = JSON.stringify(node.attrs);
                const attrsBuffer = Buffer.from(attrsData, 'utf8');
                buffer.writeUInt16BE(attrsBuffer.length, offset);
                offset += 2;
                attrsBuffer.copy(buffer, offset);
                offset += attrsBuffer.length;
            } else {
                buffer.writeUInt16BE(0, offset);
                offset += 2;
            }
            
            // Write content
            if (node.content) {
                const contentData = JSON.stringify(node.content);
                const contentBuffer = Buffer.from(contentData, 'utf8');
                buffer.writeUInt32BE(contentBuffer.length, offset);
                offset += 4;
                contentBuffer.copy(buffer, offset);
                offset += contentBuffer.length;
            } else {
                buffer.writeUInt32BE(0, offset);
                offset += 4;
            }
            
            return buffer.slice(0, offset);
            
        } catch (error) {
            console.error('Node serialization failed:', error);
            throw error;
        }
    }
    
    _parseBinaryMessage(data) {
        try {
            let offset = 0;
            
            // Read tag
            const tagLength = data.readUInt8(offset++);
            const tag = data.slice(offset, offset + tagLength).toString('utf8');
            offset += tagLength;
            
            // Read attributes
            const attrsLength = data.readUInt16BE(offset);
            offset += 2;
            
            let attrs = null;
            if (attrsLength > 0) {
                const attrsData = data.slice(offset, offset + attrsLength).toString('utf8');
                attrs = JSON.parse(attrsData);
                offset += attrsLength;
            }
            
            // Read content
            const contentLength = data.readUInt32BE(offset);
            offset += 4;
            
            let content = null;
            if (contentLength > 0) {
                const contentData = data.slice(offset, offset + contentLength).toString('utf8');
                content = JSON.parse(contentData);
                offset += contentLength;
            }
            
            return {
                tag: tag,
                attrs: attrs,
                content: content
            };
            
        } catch (error) {
            console.error('Binary message parsing failed:', error);
            return null;
        }
    }
    
    _generateMessageId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${timestamp}${random}`.toUpperCase();
    }
    
    /**
     * Create IQ query message
     */
    createIQQuery(type, query) {
        const iq = {
            tag: 'iq',
            attrs: {
                type: 'get',
                id: this._generateMessageId(),
                to: 's.whatsapp.net'
            },
            content: [{
                tag: 'query',
                attrs: {
                    type: type
                },
                content: query
            }]
        };
        
        return this._serializeNode(iq);
    }
    
    /**
     * Create contacts query
     */
    createContactsQuery() {
        return this.createIQQuery('contacts', null);
    }
    
    /**
     * Create chats query
     */
    createChatsQuery() {
        return this.createIQQuery('chats', null);
    }
    
    /**
     * Validate message format
     */
    validateMessage(message) {
        if (!message || typeof message !== 'object') {
            return false;
        }
        
        if (!message.tag || typeof message.tag !== 'string') {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get message type from decoded message
     */
    getMessageType(message) {
        if (!this.validateMessage(message)) {
            return 'unknown';
        }
        
        return message.tag;
    }
}

module.exports = ProtoHandler;
