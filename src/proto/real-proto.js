/**
 * Real WhatsApp Web Protocol Handler
 * Based on the authentic reverse engineering implementation
 */

const { EventEmitter } = require('events');
const { whatsappReadBinary } = require('./binary-reader');
const { whatsappWriteBinary } = require('./binary-writer');
const { WATags, WAMetrics, WAFlags } = require('../utils/constants');

class RealProtoHandler extends EventEmitter {
    constructor(core) {
        super();
        this.core = core;
        this.messageCounter = 0;
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
        const node = [
            'admin',
            { type: 'challenge' },
            qrData
        ];
        
        return whatsappWriteBinary(node);
    }

    /**
     * Create text message
     */
    createTextMessage(chatId, content, options = {}) {
        const messageId = this._generateMessageId();
        
        const node = [
            'action',
            { type: 'relay', epoch: String(Date.now()) },
            [
                ['message', 
                 { 
                     to: chatId,
                     type: 'text',
                     id: messageId,
                     t: String(Math.floor(Date.now() / 1000))
                 },
                 content
                ]
            ]
        ];
        
        return whatsappWriteBinary(node);
    }

    /**
     * Create presence message
     */
    createPresenceMessage(presence = 'available') {
        const node = [
            'presence',
            { type: presence },
            null
        ];
        
        return whatsappWriteBinary(node);
    }

    /**
     * Create delivery receipt
     */
    createDeliveryReceipt(message) {
        const node = [
            'receipt',
            { 
                to: message.from,
                type: 'delivery',
                id: message.id
            },
            null
        ];
        
        return whatsappWriteBinary(node);
    }

    /**
     * Create logout message
     */
    createLogoutMessage() {
        const node = [
            'admin',
            { type: 'logout' },
            null
        ];
        
        return whatsappWriteBinary(node);
    }

    /**
     * Decode incoming binary message using real WhatsApp protocol
     */
    decode(data) {
        try {
            const node = whatsappReadBinary(data, true);
            
            if (node && Array.isArray(node)) {
                const message = this._nodeToMessage(node);
                if (message) {
                    this.emit('decoded', message);
                }
                return message;
            }
            
            return null;
            
        } catch (error) {
            console.error('Failed to decode message:', error);
            return null;
        }
    }

    /**
     * Encode message to binary format using real WhatsApp protocol
     */
    encode(message) {
        try {
            const node = this._messageToNode(message);
            return whatsappWriteBinary(node);
            
        } catch (error) {
            console.error('Failed to encode message:', error);
            throw error;
        }
    }

    /**
     * Convert node to message object
     */
    _nodeToMessage(node) {
        if (!Array.isArray(node) || node.length < 2) {
            return null;
        }
        
        const [tag, attrs, content] = node;
        
        return {
            tag: tag,
            attrs: attrs || {},
            content: content,
            type: attrs?.type || tag
        };
    }

    /**
     * Convert message to node format
     */
    _messageToNode(message) {
        return [
            message.tag || 'message',
            message.attrs || {},
            message.content || null
        ];
    }

    /**
     * Generate message ID
     */
    _generateMessageId() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        return timestamp + random;
    }

    /**
     * Get message type from decoded message
     */
    getMessageType(message) {
        if (!message || !message.attrs) {
            return 'unknown';
        }
        
        return message.attrs.type || message.tag || 'unknown';
    }

    /**
     * Validate message format
     */
    validateMessage(message) {
        return message && 
               typeof message === 'object' && 
               message.tag && 
               message.attrs;
    }
}

module.exports = RealProtoHandler;
