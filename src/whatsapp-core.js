/**
 * WhatsApp Core Implementation
 * Handles the main WhatsApp Web protocol logic
 */

const { EventEmitter } = require('events');
const WebSocketClient = require('./websocket/client');
const Crypto = require('./crypto');
const Auth = require('./auth/qr');
const Session = require('./session');
const ProtoHandler = require('./proto');
const MediaHandler = require('./media');
const { WAState, WAEvents } = require('./utils/constants');

class WhatsAppCore extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = options;
        this.state = WAState.UNPAIRED;
        this.info = null;
        
        // Initialize components
        this.ws = new WebSocketClient(this);
        this.crypto = new Crypto();
        this.auth = new Auth(this);
        this.session = new Session(options.sessionPath);
        this.proto = new (require('./proto/real-proto'))(this);
        this.media = new MediaHandler(this);
        
        // Bind events
        this._setupInternalEvents();
    }
    
    _setupInternalEvents() {
        this.ws.on('open', () => this._onWebSocketOpen());
        this.ws.on('close', (code, reason) => this._onWebSocketClose(code, reason));
        this.ws.on('message', (data) => this._onWebSocketMessage(data));
        this.ws.on('error', (error) => this._onWebSocketError(error));
        
        this.auth.on('qr', (qr) => this.emit('qr', qr));
        this.auth.on('authenticated', (session) => this._onAuthenticated(session));
        
        this.proto.on('message', (msg) => this._handleProtoMessage(msg));
    }
    
    async initialize() {
        try {
            // Try to restore session first
            const savedSession = await this.session.load();
            
            if (savedSession && savedSession.clientId && savedSession.serverToken) {
                this.info = savedSession;
                this.state = WAState.UNPAIRED;
                console.log('Restored session, attempting to reconnect...');
            } else {
                console.log('No valid session found, starting fresh...');
                this.state = WAState.UNPAIRED;
            }
            
            // Connect to WhatsApp servers
            await this.ws.connect();
            
        } catch (error) {
            console.error('Failed to initialize:', error);
            throw error;
        }
    }
    
    async _onWebSocketOpen() {
        console.log('WebSocket connected to WhatsApp servers');
        
        if (this.info && this.info.clientId) {
            // Try to resume session
            await this._resumeSession();
        } else {
            // Start new authentication flow
            await this._startAuthFlow();
        }
    }
    
    async _onWebSocketClose(code, reason) {
        console.log('WebSocket disconnected:', code, reason);
        this.state = WAState.UNPAIRED;
        this.emit('disconnected', { code, reason });
        
        // Attempt reconnection after delay
        setTimeout(() => {
            if (this.state !== WAState.DESTROYED) {
                this._attemptReconnection();
            }
        }, 5000);
    }
    
    _onWebSocketError(error) {
        console.error('WebSocket error:', error);
        this.emit('auth_failure', error);
    }
    
    async _onWebSocketMessage(data) {
        try {
            // Decrypt and process the message
            const decrypted = await this.crypto.decrypt(data);
            const message = this.proto.decode(decrypted);
            
            await this._handleProtoMessage(message);
            
        } catch (error) {
            console.error('Failed to process message:', error);
        }
    }
    
    async _startAuthFlow() {
        this.state = WAState.UNPAIRED;
        
        // Generate client keys
        await this.crypto.generateKeys();
        
        // Start QR authentication
        await this.auth.startQRAuth();
    }
    
    async _resumeSession() {
        try {
            this.state = WAState.UNPAIRED;
            
            // Restore cryptographic state
            await this.crypto.restoreKeys(this.info.keys);
            
            // Send resume message
            const resumeMessage = this.proto.createResumeMessage(this.info);
            await this.ws.send(resumeMessage);
            
        } catch (error) {
            console.error('Failed to resume session:', error);
            // Fallback to new auth
            await this._startAuthFlow();
        }
    }
    
    async _onAuthenticated(sessionData) {
        this.info = sessionData;
        this.state = WAState.CONNECTED;
        
        // Save session
        await this.session.save(sessionData);
        
        console.log('Successfully authenticated with WhatsApp');
        this.emit('authenticated');
        this.emit('ready');
    }
    
    async _handleProtoMessage(message) {
        if (!message) return;
        
        switch (message.tag) {
            case 'stream:error':
                await this._handleStreamError(message);
                break;
                
            case 'iq':
                await this._handleIq(message);
                break;
                
            case 'message':
                await this._handleMessage(message);
                break;
                
            case 'presence':
                await this._handlePresence(message);
                break;
                
            case 'chatstate':
                await this._handleChatState(message);
                break;
                
            case 'ack':
                await this._handleAck(message);
                break;
                
            default:
                console.log('Unknown message type:', message.tag);
        }
    }
    
    async _handleStreamError(message) {
        console.error('Stream error:', message);
        this.state = WAState.UNPAIRED;
        this.emit('auth_failure', new Error(message.text || 'Stream error'));
    }
    
    async _handleIq(message) {
        // Handle IQ (Info/Query) messages
        if (message.type === 'result') {
            // Handle successful responses
            this._handleIqResult(message);
        } else if (message.type === 'error') {
            // Handle error responses
            console.error('IQ Error:', message);
        }
    }
    
    async _handleMessage(message) {
        try {
            // Decrypt message content if encrypted
            if (message.encrypted) {
                const decrypted = await this.crypto.decryptMessage(message);
                message.content = decrypted;
            }
            
            // Emit message event
            this.emit('message', message);
            
            // Send delivery receipt
            if (message.id && message.from) {
                await this._sendDeliveryReceipt(message);
            }
            
        } catch (error) {
            console.error('Failed to handle message:', error);
        }
    }
    
    async _handlePresence(message) {
        // Handle presence updates (online/offline/typing)
        this.emit('presence_update', message);
    }
    
    async _handleChatState(message) {
        // Handle chat state changes (composing, paused, etc.)
        this.emit('chat_state', message);
    }
    
    async _handleAck(message) {
        // Handle message acknowledgments
        this.emit('message_ack', message);
    }
    
    async _handleIqResult(message) {
        // Handle various IQ result types
        if (message.query && message.query.type === 'contacts') {
            this._updateContacts(message.query.contacts);
        } else if (message.query && message.query.type === 'chats') {
            this._updateChats(message.query.chats);
        }
    }
    
    async sendMessage(chatId, content, options = {}) {
        if (this.state !== WAState.CONNECTED) {
            throw new Error('Client not connected');
        }
        
        try {
            const message = this.proto.createTextMessage(chatId, content, options);
            const encrypted = await this.crypto.encryptMessage(message);
            
            await this.ws.send(encrypted);
            
            return message;
            
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        }
    }
    
    async sendMedia(chatId, media, options = {}) {
        if (this.state !== WAState.CONNECTED) {
            throw new Error('Client not connected');
        }
        
        try {
            // Upload media first
            const mediaData = await this.media.upload(media);
            
            // Create media message
            const message = this.proto.createMediaMessage(chatId, mediaData, options);
            const encrypted = await this.crypto.encryptMessage(message);
            
            await this.ws.send(encrypted);
            
            return message;
            
        } catch (error) {
            console.error('Failed to send media:', error);
            throw error;
        }
    }
    
    async _sendDeliveryReceipt(message) {
        try {
            const receipt = this.proto.createDeliveryReceipt(message);
            await this.ws.send(receipt);
        } catch (error) {
            console.error('Failed to send delivery receipt:', error);
        }
    }
    
    async getChatById(chatId) {
        // Implementation for getting chat by ID
        return this.chats ? this.chats.get(chatId) : null;
    }
    
    async getChats() {
        // Implementation for getting all chats
        return this.chats ? Array.from(this.chats.values()) : [];
    }
    
    async getContactById(contactId) {
        // Implementation for getting contact by ID
        return this.contacts ? this.contacts.get(contactId) : null;
    }
    
    async getContacts() {
        // Implementation for getting all contacts
        return this.contacts ? Array.from(this.contacts.values()) : [];
    }
    
    _updateContacts(contacts) {
        if (!this.contacts) {
            this.contacts = new Map();
        }
        
        contacts.forEach(contact => {
            this.contacts.set(contact.id, contact);
        });
    }
    
    _updateChats(chats) {
        if (!this.chats) {
            this.chats = new Map();
        }
        
        chats.forEach(chat => {
            this.chats.set(chat.id, chat);
        });
    }
    
    async _attemptReconnection() {
        if (this.state === WAState.DESTROYED) return;
        
        try {
            console.log('Attempting to reconnect...');
            await this.ws.connect();
        } catch (error) {
            console.error('Reconnection failed:', error);
            
            // Retry after delay
            setTimeout(() => {
                this._attemptReconnection();
            }, 10000);
        }
    }
    
    async logout() {
        try {
            // Send logout message
            const logoutMessage = this.proto.createLogoutMessage();
            await this.ws.send(logoutMessage);
            
            // Clear session
            await this.session.clear();
            
            this.state = WAState.UNPAIRED;
            
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    async destroy() {
        this.state = WAState.DESTROYED;
        
        if (this.ws) {
            await this.ws.disconnect();
        }
        
        this.removeAllListeners();
    }
    
    getInfo() {
        return this.info;
    }
    
    getState() {
        return this.state;
    }
}

module.exports = WhatsAppCore;
