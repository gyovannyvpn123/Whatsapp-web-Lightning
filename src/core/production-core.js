/**
 * Production-Ready WhatsApp Core
 * Implementare completÄ Či robustÄ pentru producČie
 */

const { EventEmitter } = require('events');
const { WAState, WAEvents, Endpoints, Timeouts, RetryLimits } = require('../utils/constants');
const WebSocketClient = require('../websocket/client');
const CryptoHandler = require('../crypto/index');
const Session = require('../session/index');
const MediaHandler = require('../media/index');
const RealProtoHandler = require('../proto/real-proto');
const QRAuth = require('../auth/qr');
const PairingCodeAuth = require('../auth/pairing-code');

class ProductionWhatsAppCore extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            sessionPath: './session.json',
            keysPath: './keys',
            maxReconnectAttempts: 10,
            heartbeatInterval: 30000,
            qrTimeout: 60000,
            authTimeout: 120000,
            rateLimitDelay: 1000,
            messageQueueSize: 100,
            ...options
        };
        
        this.state = WAState.UNPAIRED;
        this.info = null;
        this.isReady = false;
        this.reconnectAttempts = 0;
        this.messageQueue = [];
        this.rateLimitQueue = [];
        this.lastMessageTime = 0;
        
        // Initialize components with error handling
        this._initializeComponents();
        this._setupInternalEvents();
        this._setupHeartbeat();
        this._setupRateLimit();
    }
    
    _initializeComponents() {
        try {
            this.websocket = new WebSocketClient(this);
            this.crypto = new CryptoHandler();
            this.session = new Session(this.options.sessionPath);
            this.proto = new RealProtoHandler(this);
            this.media = new MediaHandler(this);
            this.qrAuth = new QRAuth(this);
            this.pairingAuth = new PairingCodeAuth(this);
            
            console.log('â All components initialized successfully');
        } catch (error) {
            console.error('â Failed to initialize components:', error);
            throw error;
        }
    }
    
    _setupInternalEvents() {
        // WebSocket events with robust error handling
        this.websocket.on('connected', this._onWebSocketConnected.bind(this));
        this.websocket.on('disconnected', this._onWebSocketDisconnected.bind(this));
        this.websocket.on('message', this._onWebSocketMessage.bind(this));
        this.websocket.on('error', this._onWebSocketError.bind(this));
        
        // Authentication events
        this.qrAuth.on('qr', (qr) => this.emit(WAEvents.QR, qr));
        this.qrAuth.on('authenticated', (data) => this.emit(WAEvents.AUTHENTICATED, data));
        this.qrAuth.on('auth_failure', (error) => this.emit(WAEvents.AUTH_FAILURE, error));
        
        this.pairingAuth.on('pairing_code', (data) => this.emit('pairing_code', data));
        this.pairingAuth.on('authenticated', (data) => this.emit(WAEvents.AUTHENTICATED, data));
        this.pairingAuth.on('auth_failure', (error) => this.emit(WAEvents.AUTH_FAILURE, error));
        
        // Protocol events
        this.proto.on('decoded', (message) => this.emit('protocol_message', message));
    }
    
    _setupHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.websocket && this.websocket.isReady()) {
                this._sendHeartbeat();
            }
        }, this.options.heartbeatInterval);
    }

    async _sendHeartbeat() {
        try {
            const heartbeat = this.proto.createPresenceMessage('available');
            await this.websocket.send(heartbeat);
        } catch (error) {
            console.error('â Heartbeat failed:', error);
        }
    }
    
    _setupRateLimit() {
        this.rateLimitInterval = setInterval(() => {
            this._processRateLimitQueue();
        }, this.options.rateLimitDelay);
    }
    
    async initialize() {
        try {
            console.log('đ Initializing production WhatsApp client...');
            
            // Initialize crypto
            await this.crypto.initialize();
            
            // Load existing session
            const sessionData = await this.session.load();
            
            if (sessionData && this._validateSession(sessionData)) {
                console.log('đą Valid session found, attempting resume...');
                await this._resumeSession(sessionData);
            } else {
                console.log('đ No valid session, starting fresh authentication...');
                await this._startFreshAuth();
            }
            
        } catch (error) {
            console.error('đĽ Initialization failed:', error);
            this.emit('error', error);
            throw error;
        }
    }
    
    async _startFreshAuth() {
        try {
            // Connect to WhatsApp
            await this.websocket.connect();
            
            // Generate crypto keys
            await this.crypto.generateKeys();
            
            // Start authentication based on method
            if (this.options.authMethod === 'pairing') {
                await this.pairingAuth.startPairingAuth(this.options.phoneNumber);
            } else {
                await this.qrAuth.startQRAuth();
            }
            
        } catch (error) {
            console.error('â Fresh authentication failed:', error);
            throw error;
        }
    }

    async _startAuthFlow() {
        try {
            await this.crypto.generateKeys();
            
            if (this.options.authMethod === 'pairing') {
                await this.pairingAuth.startPairingAuth(this.options.phoneNumber);
            } else {
                await this.qrAuth.startQRAuth();
            }
        } catch (error) {
            console.error('â Auth flow failed:', error);
            throw error;
        }
    }
    
    async _resumeSession(sessionData) {
        try {
            // Restore crypto keys
            await this.crypto.restoreKeys(sessionData.keys);
            
            // Connect with resume data
            await this.websocket.connect();
            
            // Send resume message
            const resumeMessage = this.proto.createResumeMessage(sessionData);
            await this.websocket.send(resumeMessage);
            
            this.info = sessionData;
            this._setState(WAState.CONNECTED);
            
        } catch (error) {
            console.error('â Session resume failed:', error);
            // Fallback to fresh auth
            await this._startFreshAuth();
        }
    }
    
    async _onWebSocketConnected() {
        console.log('â WebSocket connected to WhatsApp servers');
        this.reconnectAttempts = 0;
        
        if (this.state === WAState.UNPAIRED) {
            await this._startAuthFlow();
        }
    }
    
    async _handleProtocolMessage(message) {
        try {
            switch (message.tag) {
                case 'success':
                    await this._handleAuthSuccess(message);
                    break;
                case 'failure':
                    await this._handleAuthFailure(message);
                    break;
                case 'message':
                    await this._handleIncomingMessage(message);
                    break;
                case 'receipt':
                    await this._handleMessageReceipt(message);
                    break;
                case 'presence':
                    await this._handlePresenceUpdate(message);
                    break;
                case 'iq':
                    await this._handleIQMessage(message);
                    break;
                default:
                    console.log(`đĽ Unhandled message type: ${message.tag}`);
            }
        } catch (error) {
            console.error(`â Error handling ${message.tag} message:`, error);
        }
    }
    
    async _handleAuthSuccess(message) {
        console.log('â Authentication successful!');
        
        const sessionData = {
            clientId: this.info?.clientId || this._generateClientId(),
            serverToken: message.attrs?.serverToken,
            clientToken: message.attrs?.clientToken,
            keys: this.crypto.exportKeys(),
            wid: message.attrs?.wid,
            timestamp: Date.now()
        };
        
        await this.session.save(sessionData);
        this.info = sessionData;
        
        this._setState(WAState.CONNECTED);
        this.isReady = true;
        
        this.emit(WAEvents.AUTHENTICATED);
        this.emit(WAEvents.READY);
    }
    
    async _handleAuthFailure(message) {
        console.error('â Authentication failed:', message);
        this._setState(WAState.UNPAIRED);
        this.emit(WAEvents.AUTH_FAILURE, new Error(message.attrs?.reason || 'Unknown auth failure'));
    }
    
    async _handleIncomingMessage(message) {
        try {
            if (message.content && Buffer.isBuffer(message.content)) {
                message.content = await this.crypto.decryptMessage(message.content);
            }
            
            await this._sendDeliveryReceipt(message);
            this.emit(WAEvents.MESSAGE, message);
            
        } catch (error) {
            console.error('â Error handling incoming message:', error);
        }
    }
    
    async _handleMessageReceipt(message) {
        this.emit(WAEvents.MESSAGE_ACK, message);
    }
    
    async _handlePresenceUpdate(message) {
        this.emit(WAEvents.PRESENCE_UPDATE, message);
    }
    
    async _handleIQMessage(message) {
        console.log('đĽ IQ message received:', message);
    }
    
    async _sendDeliveryReceipt(message) {
        try {
            const receipt = this.proto.createDeliveryReceipt(message);
            await this.websocket.send(receipt);
        } catch (error) {
            console.error('â Failed to send delivery receipt:', error);
        }
    }
    
    async _onWebSocketDisconnected(code, reason) {
        console.log(`đ WebSocket disconnected: ${code} ${reason}`);
        this._setState(WAState.UNPAIRED);
        this.isReady = false;
        
        if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
            await this._scheduleReconnect();
        } else {
            console.error('â Max reconnection attempts reached');
            this.emit('disconnected', { code, reason });
        }
    }
    
    async _onWebSocketError(error) {
        console.error('đĽ WebSocket error:', error);
        this.emit('error', error);
    }
    
    async _onWebSocketMessage(data) {
        try {
            const message = this.proto.decode(data);
            if (message) {
                await this._handleProtocolMessage(message);
            }
        } catch (error) {
            console.error('â Failed to process message:', error);
            // Don't throw - continue processing other messages
        }
    }
    
    async sendMessage(chatId, content, options = {}) {
        if (!this.isReady) {
            throw new Error('Client not ready. Please wait for ready event.');
        }
        
        try {
            // Add to rate limit queue
            return new Promise((resolve, reject) => {
                this.rateLimitQueue.push({
                    action: 'sendMessage',
                    params: { chatId, content, options },
                    resolve,
                    reject
                });
            });
            
        } catch (error) {
            console.error('â Failed to send message:', error);
            throw error;
        }
    }
    
    async _processSendMessage(chatId, content, options = {}) {
        try {
            // Create message
            const message = this.proto.createTextMessage(chatId, content, options);
            
            // Encrypt if needed
            const encryptedMessage = await this.crypto.encryptMessage(message);
            
            // Send via WebSocket
            await this.websocket.send(encryptedMessage);
            
            return {
                id: message.id || this._generateMessageId(),
                chatId,
                content,
                timestamp: Date.now()
            };
            
        } catch (error) {
            console.error('â Send message failed:', error);
            throw error;
        }
    }
    
    async _processRateLimitQueue() {
        if (this.rateLimitQueue.length === 0) return;
        
        const now = Date.now();
        if (now - this.lastMessageTime < this.options.rateLimitDelay) {
            return;
        }
        
        const item = this.rateLimitQueue.shift();
        this.lastMessageTime = now;
        
        try {
            let result;
            switch (item.action) {
                case 'sendMessage':
                    result = await this._processSendMessage(
                        item.params.chatId,
                        item.params.content,
                        item.params.options
                    );
                    break;
                default:
                    throw new Error(`Unknown action: ${item.action}`);
            }
            item.resolve(result);
        } catch (error) {
            item.reject(error);
        }
    }
    
    _generateMessageId() {
        return Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    
    getInfo() {
        return this.info;
    }
    
    getState() {
        return this.state;
    }
    
    isClientReady() {
        return this.isReady && this.state === WAState.CONNECTED;
    }
    
    _setState(newState) {
        const oldState = this.state;
        this.state = newState;
        this.emit(WAEvents.STATE_CHANGE, { from: oldState, to: newState });
    }
    
    _validateSession(sessionData) {
        return sessionData &&
               sessionData.clientId &&
               sessionData.keys &&
               sessionData.timestamp &&
               (Date.now() - sessionData.timestamp) < (30 * 24 * 60 * 60 * 1000); // 30 days
    }
    
    async destroy() {
        try {
            console.log('đ Destroying WhatsApp client...');
            
            // Clear intervals
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            if (this.rateLimitInterval) {
                clearInterval(this.rateLimitInterval);
            }
            
            // Close WebSocket
            if (this.websocket) {
                await this.websocket.disconnect();
            }
            
            // Clear queues
            this.messageQueue = [];
            this.rateLimitQueue = [];
            
            this.isReady = false;
            this._setState(WAState.DESTROYED);
            
            console.log('â Client destroyed successfully');
            
        } catch (error) {
            console.error('â Destroy failed:', error);
            throw error;
        }
    }
}

module.exports = ProductionWhatsAppCore;
