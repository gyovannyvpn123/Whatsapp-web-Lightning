/**
 * WhatsApp Web Library - Main Entry Point
 * A complete WhatsApp Web implementation in pure JavaScript
 * Based on reverse engineering from whatsapp-web-reveng
 */

const WhatsAppCore = require('./whatsapp-core');
const { EventEmitter } = require('events');

class WhatsAppClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            sessionPath: options.sessionPath || './session.json',
            headless: options.headless !== false,
            qrTimeout: options.qrTimeout || 60000,
            ...options
        };
        
        this.core = new WhatsAppCore(this.options);
        this._setupEventHandlers();
    }
    
    _setupEventHandlers() {
        this.core.on('qr', (qr) => this.emit('qr', qr));
        this.core.on('ready', () => this.emit('ready'));
        this.core.on('authenticated', () => this.emit('authenticated'));
        this.core.on('auth_failure', (error) => this.emit('auth_failure', error));
        this.core.on('disconnected', (reason) => this.emit('disconnected', reason));
        this.core.on('message', (message) => this.emit('message', message));
        this.core.on('message_ack', (ack) => this.emit('message_ack', ack));
        this.core.on('message_create', (message) => this.emit('message_create', message));
        this.core.on('message_revoke_everyone', (after, before) => this.emit('message_revoke_everyone', after, before));
        this.core.on('message_revoke_me', (message) => this.emit('message_revoke_me', message));
        this.core.on('group_join', (notification) => this.emit('group_join', notification));
        this.core.on('group_leave', (notification) => this.emit('group_leave', notification));
        this.core.on('contact_changed', (contact) => this.emit('contact_changed', contact));
        this.core.on('state_change', (state) => this.emit('state_change', state));
    }
    
    /**
     * Initialize the WhatsApp client
     */
    async initialize() {
        try {
            await this.core.initialize();
            return true;
        } catch (error) {
            this.emit('auth_failure', error);
            throw error;
        }
    }
    
    /**
     * Send a text message
     */
    async sendMessage(chatId, message, options = {}) {
        return await this.core.sendMessage(chatId, message, options);
    }
    
    /**
     * Send media message
     */
    async sendMedia(chatId, media, options = {}) {
        return await this.core.sendMedia(chatId, media, options);
    }
    
    /**
     * Get chat by ID
     */
    async getChatById(chatId) {
        return await this.core.getChatById(chatId);
    }
    
    /**
     * Get all chats
     */
    async getChats() {
        return await this.core.getChats();
    }
    
    /**
     * Get contact by ID
     */
    async getContactById(contactId) {
        return await this.core.getContactById(contactId);
    }
    
    /**
     * Get all contacts
     */
    async getContacts() {
        return await this.core.getContacts();
    }
    
    /**
     * Logout and destroy session
     */
    async logout() {
        await this.core.logout();
    }
    
    /**
     * Destroy the client
     */
    async destroy() {
        await this.core.destroy();
    }
    
    /**
     * Get client info
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
}

module.exports = WhatsAppClient;
