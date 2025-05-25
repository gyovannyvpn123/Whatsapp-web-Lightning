/**
 * Pairing Code Authentication Handler
 * Alternative authentication method using pairing codes
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

class PairingCodeAuth extends EventEmitter {
    constructor(core) {
        super();
        this.core = core;
        this.pairingCode = null;
        this.authTimeout = 60000; // 1 minute
    }
    
    async startPairingAuth(phoneNumber) {
        try {
            console.log('Starting pairing code authentication for:', phoneNumber);
            
            // Validate phone number
            const normalizedPhone = this._normalizePhoneNumber(phoneNumber);
            
            // Generate pairing request
            const pairingRequest = await this._generatePairingRequest(normalizedPhone);
            
            // Send pairing request
            await this._sendPairingRequest(pairingRequest);
            
            // Wait for pairing code
            const code = await this._waitForPairingCode();
            
            return code;
            
        } catch (error) {
            console.error('Pairing authentication failed:', error);
            throw error;
        }
    }
    
    _normalizePhoneNumber(phoneNumber) {
        // Remove all non-digit characters
        let normalized = phoneNumber.replace(/\D/g, '');
        
        // Add country code if missing
        if (!normalized.startsWith('1') && normalized.length === 10) {
            normalized = '1' + normalized; // Default to US
        }
        
        return normalized;
    }
    
    async _generatePairingRequest(phoneNumber) {
        // Generate client ID and keys
        const clientId = crypto.randomBytes(16);
        const publicKey = this.core.crypto.getPublicKey();
        
        return {
            phoneNumber,
            clientId: clientId.toString('base64'),
            publicKey: publicKey.toString('base64'),
            timestamp: Date.now()
        };
    }
    
    async _sendPairingRequest(request) {
        // Create pairing request message
        const message = this.core.proto.createPairingRequest(request);
        
        // Send through WebSocket
        await this.core.ws.send(message);
        
        console.log('Pairing request sent for:', request.phoneNumber);
    }
    
    async _waitForPairingCode() {
        return new Promise((resolve, reject) => {
            let timeout;
            
            const onMessage = (message) => {
                if (this._isPairingResponse(message)) {
                    clearTimeout(timeout);
                    this.core.off('proto_message', onMessage);
                    
                    const code = this._extractPairingCode(message);
                    resolve(code);
                }
            };
            
            // Listen for pairing response
            this.core.on('proto_message', onMessage);
            
            // Set timeout
            timeout = setTimeout(() => {
                this.core.off('proto_message', onMessage);
                reject(new Error('Pairing code timeout'));
            }, this.authTimeout);
        });
    }
    
    _isPairingResponse(message) {
        return message &&
               message.tag === 'iq' &&
               message.type === 'result' &&
               message.query &&
               message.query.type === 'pairing';
    }
    
    _extractPairingCode(message) {
        const pairingData = message.query.pairing;
        
        if (!pairingData || !pairingData.code) {
            throw new Error('Invalid pairing response');
        }
        
        return pairingData.code;
    }
    
    async confirmPairingCode(code) {
        try {
            // Send confirmation with pairing code
            const confirmation = this.core.proto.createPairingConfirmation(code);
            await this.core.ws.send(confirmation);
            
            // Wait for authentication result
            const authResult = await this._waitForAuthResult();
            
            return authResult;
            
        } catch (error) {
            console.error('Pairing confirmation failed:', error);
            throw error;
        }
    }
    
    async _waitForAuthResult() {
        return new Promise((resolve, reject) => {
            let timeout;
            
            const onMessage = (message) => {
                if (this._isAuthResult(message)) {
                    clearTimeout(timeout);
                    this.core.off('proto_message', onMessage);
                    
                    if (message.type === 'result') {
                        resolve(message.query.auth);
                    } else {
                        reject(new Error('Authentication failed'));
                    }
                }
            };
            
            this.core.on('proto_message', onMessage);
            
            timeout = setTimeout(() => {
                this.core.off('proto_message', onMessage);
                reject(new Error('Authentication timeout'));
            }, this.authTimeout);
        });
    }
    
    _isAuthResult(message) {
        return message &&
               message.tag === 'iq' &&
               message.query &&
               message.query.type === 'auth';
    }
}

module.exports = PairingCodeAuth;
