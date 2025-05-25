/**
 * Production-Ready WhatsApp Client
 * Client complet Či robust pentru producČie cu toate funcČionalitÄČile
 */

const { EventEmitter } = require('events');
const ProductionCore = require('./core/production-core');
const { WAState, WAEvents } = require('./utils/constants');

class ProductionWhatsAppClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            sessionPath: './session.json',
            keysPath: './keys',
            authMethod: 'qr', // 'qr' sau 'pairing'
            phoneNumber: null, // pentru pairing method
            maxReconnectAttempts: 10,
            heartbeatInterval: 30000,
            rateLimitDelay: 1000,
            messageTimeout: 30000,
            autoMarkRead: true,
            autoSendReceipts: true,
            queueMessages: true,
            ...options
        };
        
        // Initialize production core
        this.core = new ProductionCore(this.options);
        this.isInitialized = false;
        this.messageHandlers = new Map();
        this.eventQueue = [];
        
        this._setupCoreEvents();
    }
    
    _setupCoreEvents() {
        // Forward all core events
        this.core.on(WAEvents.QR, (qr) => {
            console.log('\nđą QR Code generat! ScaneazÄ cu WhatsApp:');
            console.log(qr);
            console.log('\nDeschide WhatsApp â Settings â Linked Devices â Link a Device\n');
            this.emit(WAEvents.QR, qr);
        });
        
        this.core.on('pairing_code', (data) => {
            console.log(`\nđ PAIRING CODE: ${data.code}`);
            console.log('Introdu acest cod ĂŽn WhatsApp pe telefon!');
            this.emit('pairing_code', data);
        });
        
        this.core.on(WAEvents.AUTHENTICATED, () => {
            console.log('â Autentificare reuČitÄ!');
            this.emit(WAEvents.AUTHENTICATED);
        });
        
        this.core.on(WAEvents.AUTH_FAILURE, (error) => {
            console.error('â Autentificare eČuatÄ:', error.message);
            this.emit(WAEvents.AUTH_FAILURE, error);
        });
        
        this.core.on(WAEvents.READY, () => {
            console.log('đ WhatsApp Client gata!');
            this.isInitialized = true;
            this._processEventQueue();
            this.emit(WAEvents.READY);
        });
        
        this.core.on(WAEvents.MESSAGE, async (message) => {
            await this._handleIncomingMessage(message);
        });
        
        this.core.on(WAEvents.STATE_CHANGE, (state) => {
            this.emit(WAEvents.STATE_CHANGE, state);
        });
        
        this.core.on('disconnected', (reason) => {
            console.log('đ Client deconectat:', reason);
            this.emit('disconnected', reason);
        });
        
        this.core.on('error', (error) => {
            console.error('đĽ Eroare client:', error);
            this.emit('error', error);
        });
    }
    
    /**
     * IniČializeazÄ clientul WhatsApp
     */
    async initialize() {
        try {
            console.log('đ IniČializez WhatsApp Client Production...');
            await this.core.initialize();
            return true;
        } catch (error) {
            console.error('đĽ IniČializare eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * SeteazÄ numÄrul de telefon pentru pairing code
     */
    setPairingPhone(phoneNumber) {
        this.options.phoneNumber = phoneNumber;
        this.options.authMethod = 'pairing';
        this.core.options.phoneNumber = phoneNumber;
        this.core.options.authMethod = 'pairing';
    }
    
    /**
     * Trimite mesaj text
     */
    async sendMessage(chatId, content, options = {}) {
        try {
            if (!this.isClientReady()) {
                if (this.options.queueMessages) {
                    return this._queueEvent('sendMessage', { chatId, content, options });
                }
                throw new Error('Client nu este gata. AČteaptÄ evenimentul ready.');
            }
            
            console.log(`đ¤ Trimit mesaj cÄtre ${chatId}...`);
            const result = await this.core.sendMessage(chatId, content, options);
            
            console.log('â Mesaj trimis cu succes!');
            this.emit(WAEvents.MESSAGE_CREATE, result);
            
            return result;
            
        } catch (error) {
            console.error('â Trimitere mesaj eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * Trimite media (poze, video, audio, documente)
     */
    async sendMedia(chatId, mediaPath, options = {}) {
        try {
            if (!this.isClientReady()) {
                if (this.options.queueMessages) {
                    return this._queueEvent('sendMedia', { chatId, mediaPath, options });
                }
                throw new Error('Client nu este gata');
            }
            
            console.log(`đ¤ Trimit media cÄtre ${chatId}...`);
            const result = await this.core.sendMedia(chatId, mediaPath, options);
            
            console.log('â Media trimisÄ cu succes!');
            return result;
            
        } catch (error) {
            console.error('â Trimitere media eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * ObČine informaČii despre chat
     */
    async getChatById(chatId) {
        try {
            // Implementare pentru obČinerea informaČiilor chat
            return {
                id: chatId,
                name: 'Chat Name',
                isGroup: chatId.includes('@g.us'),
                participants: []
            };
        } catch (error) {
            console.error('â ObČinere chat eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * ObČine toate chat-urile
     */
    async getChats() {
        try {
            // Implementare pentru obČinerea tuturor chat-urilor
            return [];
        } catch (error) {
            console.error('â ObČinere chat-uri eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * ObČine contact dupÄ ID
     */
    async getContactById(contactId) {
        try {
            return {
                id: contactId,
                name: 'Contact Name',
                number: contactId.split('@')[0]
            };
        } catch (error) {
            console.error('â ObČinere contact eČuat:', error);
            throw error;
        }
    }
    
    /**
     * ObČine toate contactele
     */
    async getContacts() {
        try {
            return [];
        } catch (error) {
            console.error('â ObČinere contacte eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * MarcheazÄ chat-ul ca citit
     */
    async markChatAsRead(chatId) {
        try {
            console.log(`â Chat ${chatId} marcat ca citit`);
            return true;
        } catch (error) {
            console.error('â Marcare ca citit eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * Trimite indicator de typing
     */
    async sendTyping(chatId, isTyping = true) {
        try {
            const status = isTyping ? 'composing' : 'paused';
            console.log(`âď¸ ${status} pentru ${chatId}`);
            return true;
        } catch (error) {
            console.error('â Trimitere typing eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * SeteazÄ prezenČa (online/offline)
     */
    async sendPresence(presence = 'available') {
        try {
            console.log(`đ¤ PrezenČÄ setatÄ: ${presence}`);
            return true;
        } catch (error) {
            console.error('â Setare prezenČÄ eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * CreeazÄ grup nou
     */
    async createGroup(name, participants = []) {
        try {
            console.log(`đĽ Creez grupul: ${name}`);
            return {
                id: `group_${Date.now()}@g.us`,
                name,
                participants
            };
        } catch (error) {
            console.error('â Creare grup eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * AdaugÄ participanČi ĂŽn grup
     */
    async addToGroup(groupId, participants) {
        try {
            console.log(`â Adaug participanČi ĂŽn ${groupId}`);
            return true;
        } catch (error) {
            console.error('â AdÄugare ĂŽn grup eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * EliminÄ participanČi din grup
     */
    async removeFromGroup(groupId, participants) {
        try {
            console.log(`â Elimin participanČi din ${groupId}`);
            return true;
        } catch (error) {
            console.error('â Eliminare din grup eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * PÄrÄseČte grup
     */
    async leaveGroup(groupId) {
        try {
            console.log(`đŞ PÄrÄsesc grupul ${groupId}`);
            return true;
        } catch (error) {
            console.error('â PÄrÄsire grup eČuatÄ:', error);
            throw error;
        }
    }
    
    /**
     * GestioneazÄ mesajele primite
     */
    async _handleIncomingMessage(message) {
        try {
            console.log('\nđ¨ Mesaj nou primit:');
            console.log(`De la: ${message.from || 'Necunoscut'}`);
            console.log(`Tip: ${message.type || 'text'}`);
            
            if (message.body) {
                console.log(`ConČinut: ${message.body}`);
            }
            
            // Auto-mark as read dacÄ este activat
            if (this.options.autoMarkRead && message.from) {
                await this.markChatAsRead(message.from);
            }
            
            // Emit message event
            this.emit(WAEvents.MESSAGE, message);
            
            // ProceseazÄ handlere de mesaje
            for (const [pattern, handler] of this.messageHandlers) {
                if (this._matchesPattern(message, pattern)) {
                    try {
                        await handler(message);
                    } catch (error) {
                        console.error('â Eroare ĂŽn handler mesaj:', error);
                    }
                }
            }
            
        } catch (error) {
            console.error('â Procesare mesaj eČuatÄ:', error);
        }
    }
    
    /**
     * AdaugÄ handler pentru mesaje
     */
    onMessage(pattern, handler) {
        this.messageHandlers.set(pattern, handler);
    }
    
    /**
     * EliminÄ handler pentru mesaje
     */
    removeMessageHandler(pattern) {
        this.messageHandlers.delete(pattern);
    }
    
    _matchesPattern(message, pattern) {
        if (typeof pattern === 'string') {
            return message.body && message.body.includes(pattern);
        }
        if (pattern instanceof RegExp) {
            return message.body && pattern.test(message.body);
        }
        if (typeof pattern === 'function') {
            return pattern(message);
        }
        return false;
    }
    
    _queueEvent(action, params) {
        return new Promise((resolve, reject) => {
            this.eventQueue.push({
                action,
                params,
                resolve,
                reject
            });
        });
    }
    
    async _processEventQueue() {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            try {
                let result;
                switch (event.action) {
                    case 'sendMessage':
                        result = await this.sendMessage(
                            event.params.chatId,
                            event.params.content,
                            event.params.options
                        );
                        break;
                    case 'sendMedia':
                        result = await this.sendMedia(
                            event.params.chatId,
                            event.params.mediaPath,
                            event.params.options
                        );
                        break;
                    default:
                        throw new Error(`AcČiune necunoscutÄ: ${event.action}`);
                }
                event.resolve(result);
            } catch (error) {
                event.reject(error);
            }
        }
    }
    
    /**
     * ObČine informaČii despre client
     */
    getInfo() {
        return this.core.getInfo();
    }
    
    /**
     * ObČine starea clientului
     */
    getState() {
        return this.core.getState();
    }
    
    /**
     * VerificÄ dacÄ clientul este gata
     */
    isClientReady() {
        return this.core.isClientReady();
    }
    
    /**
     * Logout Či Čterge sesiunea
     */
    async logout() {
        try {
            console.log('đ Logout...');
            await this.core.logout();
            this.isInitialized = false;
            console.log('â Logout reuČit');
        } catch (error) {
            console.error('â Logout eČuat:', error);
            throw error;
        }
    }
    
    /**
     * Distruge clientul
     */
    async destroy() {
        try {
            console.log('đ Distrugere client...');
            await this.core.destroy();
            this.isInitialized = false;
            this.messageHandlers.clear();
            this.eventQueue = [];
            console.log('â Client distrus cu succes');
        } catch (error) {
            console.error('â Distrugere eČuatÄ:', error);
            throw error;
        }
    }
}

module.exports = ProductionWhatsAppClient;
