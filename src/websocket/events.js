/**
 * WebSocket Event Handler
 * Manages WebSocket events and message routing
 */

const { EventEmitter } = require('events');

class WebSocketEventHandler extends EventEmitter {
    constructor(core) {
        super();
        this.core = core;
        this.messageQueue = [];
        this.isProcessing = false;
        this.eventHandlers = new Map();
        
        this._setupEventHandlers();
    }
    
    _setupEventHandlers() {
        // Register default event handlers
        this.registerHandler('connection', this._handleConnection.bind(this));
        this.registerHandler('disconnection', this._handleDisconnection.bind(this));
        this.registerHandler('message', this._handleMessage.bind(this));
        this.registerHandler('error', this._handleError.bind(this));
        this.registerHandler('heartbeat', this._handleHeartbeat.bind(this));
        this.registerHandler('auth', this._handleAuth.bind(this));
        this.registerHandler('presence', this._handlePresence.bind(this));
        this.registerHandler('typing', this._handleTyping.bind(this));
        this.registerHandler('receipt', this._handleReceipt.bind(this));
        this.registerHandler('notification', this._handleNotification.bind(this));
    }
    
    /**
     * Register event handler
     */
    registerHandler(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        
        this.eventHandlers.get(eventType).push(handler);
    }
    
    /**
     * Unregister event handler
     */
    unregisterHandler(eventType, handler) {
        if (this.eventHandlers.has(eventType)) {
            const handlers = this.eventHandlers.get(eventType);
            const index = handlers.indexOf(handler);
            
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event to registered handlers
     */
    async emitEvent(eventType, data) {
        const handlers = this.eventHandlers.get(eventType) || [];
        
        for (const handler of handlers) {
            try {
                await handler(data);
            } catch (error) {
                console.error(`Event handler error for ${eventType}:`, error);
            }
        }
        
        // Also emit to external listeners
        this.emit(eventType, data);
    }
    
    /**
     * Add message to processing queue
     */
    queueMessage(message) {
        this.messageQueue.push({
            message,
            timestamp: Date.now()
        });
        
        if (!this.isProcessing) {
            this._processMessageQueue();
        }
    }
    
    /**
     * Process message queue
     */
    async _processMessageQueue() {
        this.isProcessing = true;
        
        while (this.messageQueue.length > 0) {
            const { message, timestamp } = this.messageQueue.shift();
            
            try {
                await this._processMessage(message);
                
            } catch (error) {
                console.error('Failed to process queued message:', error);
            }
        }
        
        this.isProcessing = false;
    }
    
    /**
     * Process individual message
     */
    async _processMessage(message) {
        try {
            // Determine message type and route to appropriate handler
            const messageType = this._getMessageType(message);
            
            await this.emitEvent(messageType, message);
            
        } catch (error) {
            console.error('Message processing error:', error);
        }
    }
    
    /**
     * Determine message type from message data
     */
    _getMessageType(message) {
        if (!message || typeof message !== 'object') {
            return 'unknown';
        }
        
        // Check for various message types based on message structure
        if (message.tag) {
            switch (message.tag) {
                case 'message':
                    return 'message';
                case 'presence':
                    return 'presence';
                case 'iq':
                    return this._getIqType(message);
                case 'notification':
                    return 'notification';
                case 'receipt':
                    return 'receipt';
                case 'chatstate':
                    return 'typing';
                default:
                    return message.tag;
            }
        }
        
        return 'unknown';
    }
    
    _getIqType(message) {
        if (message.type === 'result' || message.type === 'error') {
            if (message.query) {
                switch (message.query.type) {
                    case 'auth':
                        return 'auth';
                    case 'contacts':
                        return 'contacts';
                    case 'chats':
                        return 'chats';
                    default:
                        return 'iq';
                }
            }
        }
        
        return 'iq';
    }
    
    // Default event handlers
    
    async _handleConnection(data) {
        console.log('WebSocket connected');
        this.core.emit('connected');
    }
    
    async _handleDisconnection(data) {
        console.log('WebSocket disconnected:', data);
        this.core.emit('disconnected', data);
    }
    
    async _handleMessage(message) {
        try {
            // Process incoming message
            if (message.type === 'chat') {
                await this._processChatMessage(message);
            } else if (message.type === 'media') {
                await this._processMediaMessage(message);
            } else {
                console.log('Unknown message type:', message.type);
            }
            
        } catch (error) {
            console.error('Message handling error:', error);
        }
    }
    
    async _processChatMessage(message) {
        // Decrypt message if encrypted
        if (message.encrypted) {
            const decrypted = await this.core.crypto.decryptMessage(message);
            message.content = decrypted;
        }
        
        // Emit message event
        this.core.emit('message', message);
        
        // Send delivery receipt
        if (message.id && message.from) {
            await this._sendDeliveryReceipt(message);
        }
    }
    
    async _processMediaMessage(message) {
        // Process media message
        if (message.mediaKey) {
            try {
                // Decrypt media if needed
                const decryptedMedia = await this.core.media.decryptMedia(
                    message.media,
                    message.mediaKey
                );
                
                message.decryptedMedia = decryptedMedia;
                
            } catch (error) {
                console.error('Media decryption failed:', error);
            }
        }
        
        this.core.emit('message', message);
    }
    
    async _handleError(error) {
        console.error('WebSocket error:', error);
        this.core.emit('error', error);
    }
    
    async _handleHeartbeat(data) {
        // Handle heartbeat/ping messages
        console.log('Heartbeat received');
    }
    
    async _handleAuth(authData) {
        console.log('Authentication event:', authData.type);
        
        if (authData.type === 'success') {
            this.core.emit('authenticated', authData);
        } else if (authData.type === 'failure') {
            this.core.emit('auth_failure', authData.error);
        }
    }
    
    async _handlePresence(presenceData) {
        // Handle presence updates (online/offline/typing)
        this.core.emit('presence_update', presenceData);
    }
    
    async _handleTyping(typingData) {
        // Handle typing indicators
        this.core.emit('typing', typingData);
    }
    
    async _handleReceipt(receiptData) {
        // Handle message receipts (delivered/read)
        this.core.emit('message_ack', receiptData);
    }
    
    async _handleNotification(notificationData) {
        // Handle various notifications
        switch (notificationData.type) {
            case 'group_participant_add':
                this.core.emit('group_join', notificationData);
                break;
                
            case 'group_participant_remove':
                this.core.emit('group_leave', notificationData);
                break;
                
            case 'contact_update':
                this.core.emit('contact_changed', notificationData);
                break;
                
            default:
                this.core.emit('notification', notificationData);
        }
    }
    
    async _sendDeliveryReceipt(message) {
        try {
            const receipt = {
                tag: 'receipt',
                to: message.from,
                type: 'delivery',
                id: message.id
            };
            
            const serialized = this.core.proto.serialize(receipt);
            await this.core.ws.send(serialized);
            
        } catch (error) {
            console.error('Failed to send delivery receipt:', error);
        }
    }
    
    /**
     * Clear message queue
     */
    clearQueue() {
        this.messageQueue = [];
        this.isProcessing = false;
    }
    
    /**
     * Get queue status
     */
    getQueueStatus() {
        return {
            queueLength: this.messageQueue.length,
            isProcessing: this.isProcessing
        };
    }
    
    /**
     * Shutdown event handler
     */
    shutdown() {
        this.clearQueue();
        this.eventHandlers.clear();
        this.removeAllListeners();
    }
}

module.exports = WebSocketEventHandler;
