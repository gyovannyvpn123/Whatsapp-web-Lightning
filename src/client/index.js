/**
 * WhatsApp Client Implementation
 * High-level client interface
 */

const { EventEmitter } = require('events');
const WhatsAppCore = require('../whatsapp-core');

class WhatsAppClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            sessionPath: options.sessionPath || './session.json',
            puppeteer: options.puppeteer || {},
            qrTimeout: options.qrTimeout || 60000,
            authTimeout: options.authTimeout || 60000,
            restartOnCrash: options.restartOnCrash !== false,
            ...options
        };
        
        this.core = new WhatsAppCore(this.options);
        this.isReady = false;
        
        this._setupEventHandlers();
    }
    
    _setupEventHandlers() {
        // Forward core events
        this.core.on('qr', (qr) => {
            console.log('QR Code received, scan with WhatsApp');
            this.emit('qr', qr);
        });
        
        this.core.on('authenticated', () => {
            console.log('Client authenticated successfully');
            this.emit('authenticated');
        });
        
        this.core.on('ready', () => {
            console.log('Client is ready');
            this.isReady = true;
            this.emit('ready');
        });
        
        this.core.on('auth_failure', (error) => {
            console.error('Authentication failed:', error);
            this.emit('auth_failure', error);
        });
        
        this.core.on('disconnected', (reason) => {
            console.log('Client disconnected:', reason);
            this.isReady = false;
            this.emit('disconnected', reason);
            
            if (this.options.restartOnCrash) {
                this._attemptRestart();
            }
        });
        
        this.core.on('message', (message) => {
            this.emit('message', message);
        });
        
        this.core.on('message_create', (message) => {
            this.emit('message_create', message);
        });
        
        this.core.on('message_ack', (ack) => {
            this.emit('message_ack', ack);
        });
        
        this.core.on('message_revoke_everyone', (after, before) => {
            this.emit('message_revoke_everyone', after, before);
        });
        
        this.core.on('message_revoke_me', (message) => {
            this.emit('message_revoke_me', message);
        });
        
        this.core.on('group_join', (notification) => {
            this.emit('group_join', notification);
        });
        
        this.core.on('group_leave', (notification) => {
            this.emit('group_leave', notification);
        });
        
        this.core.on('contact_changed', (contact) => {
            this.emit('contact_changed', contact);
        });
        
        this.core.on('state_change', (state) => {
            this.emit('state_change', state);
        });
    }
    
    /**
     * Initialize the WhatsApp client
     */
    async initialize() {
        try {
            console.log('Initializing WhatsApp client...');
            await this.core.initialize();
            
            return true;
            
        } catch (error) {
            console.error('Client initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Send a text message to a chat
     */
    async sendMessage(chatId, content, options = {}) {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        try {
            const message = await this.core.sendMessage(chatId, content, options);
            return message;
            
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        }
    }
    
    /**
     * Send media to a chat
     */
    async sendMedia(chatId, media, options = {}) {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        try {
            const message = await this.core.sendMedia(chatId, media, options);
            return message;
            
        } catch (error) {
            console.error('Failed to send media:', error);
            throw error;
        }
    }
    
    /**
     * Get a chat by its ID
     */
    async getChatById(chatId) {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.getChatById(chatId);
    }
    
    /**
     * Get all chats
     */
    async getChats() {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.getChats();
    }
    
    /**
     * Get a contact by its ID
     */
    async getContactById(contactId) {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.getContactById(contactId);
    }
    
    /**
     * Get all contacts
     */
    async getContacts() {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.getContacts();
    }
    
    /**
     * Search for messages
     */
    async searchMessages(query, options = {}) {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.searchMessages(query, options);
    }
    
    /**
     * Mark a chat as read
     */
    async markChatAsRead(chatId) {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.markChatAsRead(chatId);
    }
    
    /**
     * Send typing indicator
     */
    async sendTyping(chatId, isTyping = true) {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.sendTyping(chatId, isTyping);
    }
    
    /**
     * Send presence (online/offline)
     */
    async sendPresence(presence = 'available') {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.sendPresence(presence);
    }
    
    /**
     * Create a group
     */
    async createGroup(name, participants = []) {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.createGroup(name, participants);
    }
    
    /**
     * Add participants to a group
     */
    async addToGroup(groupId, participants) {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.addToGroup(groupId, participants);
    }
    
    /**
     * Remove participants from a group
     */
    async removeFromGroup(groupId, participants) {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.removeFromGroup(groupId, participants);
    }
    
    /**
     * Leave a group
     */
    async leaveGroup(groupId) {
        if (!this.isReady) {
            throw new Error('Client is not ready. Please wait for the ready event.');
        }
        
        return await this.core.leaveGroup(groupId);
    }
    
    /**
     * Get client information
     */
    getInfo() {
        return this.core.getInfo();
    }
    
    /**
     * Get client state
     */
    getState() {
        return this.core.getState();
    }
    
    /**
     * Check if client is ready
     */
    isClientReady() {
        return this.isReady;
    }
    
    /**
     * Logout and clear session
     */
    async logout() {
        try {
            console.log('Logging out...');
            await this.core.logout();
            this.isReady = false;
            console.log('Logout successful');
            
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }
    
    /**
     * Destroy the client
     */
    async destroy() {
        try {
            console.log('Destroying client...');
            this.isReady = false;
            await this.core.destroy();
            this.removeAllListeners();
            console.log('Client destroyed');
            
        } catch (error) {
            console.error('Failed to destroy client:', error);
            throw error;
        }
    }
    
    async _attemptRestart() {
        if (!this.options.restartOnCrash) return;
        
        try {
            console.log('Attempting to restart client...');
            
            // Wait before restart
            await this._delay(5000);
            
            // Reinitialize
            await this.initialize();
            
        } catch (error) {
            console.error('Client restart failed:', error);
            
            // Try again after delay
            setTimeout(() => {
                this._attemptRestart();
            }, 10000);
        }
    }
    
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = WhatsAppClient;
