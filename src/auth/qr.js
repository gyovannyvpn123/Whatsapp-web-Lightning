/**
 * QR Code Authentication Handler
 * Implements WhatsApp Web QR authentication flow
 */

const { EventEmitter } = require('events');
const QRCode = require('qrcode');
const crypto = require('crypto');

class QRAuth extends EventEmitter {
    constructor(core) {
        super();
        this.core = core;
        this.qrData = null;
        this.qrTimeout = null;
        this.authTimeout = this.core.options.qrTimeout || 60000;
    }
    
    async startQRAuth() {
        try {
            console.log('Starting QR authentication flow...');
            
            // Generate QR data
            await this._generateQRData();
            
            // Create QR code
            const qrString = await this._createQRCode();
            
            // Emit QR code for display
            this.emit('qr', qrString);
            
            // Set timeout for QR code
            this._setQRTimeout();
            
            // Wait for scan
            await this._waitForScan();
            
        } catch (error) {
            console.error('QR Auth failed:', error);
            throw error;
        }
    }
    
    async _generateQRData() {
        // Generate client ID and keys for QR
        const clientId = crypto.randomBytes(16);
        const publicKey = this.core.crypto.getPublicKey();
        
        // Create QR data structure
        this.qrData = {
            clientId: clientId.toString('base64'),
            publicKey: publicKey.toString('base64'),
            serverRef: this._generateServerRef(),
            timestamp: Date.now()
        };
        
        console.log('Generated QR data:', this.qrData.clientId);
    }
    
    _generateServerRef() {
        // Generate a unique server reference
        return crypto.randomBytes(16).toString('base64');
    }
    
    async _createQRCode() {
        // Format QR data as WhatsApp expects
        const qrContent = [
            this.qrData.serverRef,
            this.qrData.clientId,
            this.qrData.publicKey,
            this.qrData.timestamp.toString()
        ].join(',');
        
        // Generate QR code string
        const qrString = await QRCode.toString(qrContent, {
            type: 'terminal',
            small: true
        });
        
        return qrString;
    }
    
    _setQRTimeout() {
        // Clear existing timeout
        if (this.qrTimeout) {
            clearTimeout(this.qrTimeout);
        }
        
        // Set new timeout
        this.qrTimeout = setTimeout(() => {
            console.log('QR code expired, generating new one...');
            this.startQRAuth(); // Generate new QR
        }, this.authTimeout);
    }
    
    async _waitForScan() {
        return new Promise((resolve, reject) => {
            // Listen for authentication response
            const onMessage = (message) => {
                if (this._isAuthResponse(message)) {
                    this._handleAuthResponse(message)
                        .then(resolve)
                        .catch(reject);
                }
            };
            
            // Listen for messages
            this.core.on('proto_message', onMessage);
            
            // Set timeout
            const timeout = setTimeout(() => {
                this.core.off('proto_message', onMessage);
                reject(new Error('Authentication timeout'));
            }, this.authTimeout);
            
            // Clean up on success
            const cleanup = () => {
                clearTimeout(timeout);
                this.core.off('proto_message', onMessage);
            };
            
            // Override resolve/reject to clean up
            const originalResolve = resolve;
            const originalReject = reject;
            
            resolve = (...args) => {
                cleanup();
                originalResolve(...args);
            };
            
            reject = (...args) => {
                cleanup();
                originalReject(...args);
            };
        });
    }
    
    _isAuthResponse(message) {
        // Check if message is authentication response
        return message && 
               message.tag === 'iq' && 
               message.type === 'result' &&
               message.query &&
               message.query.type === 'auth';
    }
    
    async _handleAuthResponse(message) {
        try {
            console.log('Received authentication response');
            
            // Extract authentication data
            const authData = message.query.auth;
            
            if (!authData || !authData.clientToken || !authData.serverToken) {
                throw new Error('Invalid authentication response');
            }
            
            // Verify authentication
            await this._verifyAuth(authData);
            
            // Create session data
            const sessionData = {
                clientId: this.qrData.clientId,
                clientToken: authData.clientToken,
                serverToken: authData.serverToken,
                wid: authData.wid,
                keys: this.core.crypto.exportKeys(),
                timestamp: Date.now()
            };
            
            // Clear QR timeout
            if (this.qrTimeout) {
                clearTimeout(this.qrTimeout);
                this.qrTimeout = null;
            }
            
            // Emit authentication success
            this.emit('authenticated', sessionData);
            
            return sessionData;
            
        } catch (error) {
            console.error('Authentication verification failed:', error);
            throw error;
        }
    }
    
    async _verifyAuth(authData) {
        // Verify authentication using cryptographic methods
        try {
            // Verify client token signature
            const isValidClient = await this.core.crypto.verifyClientToken(
                authData.clientToken,
                this.qrData.clientId
            );
            
            if (!isValidClient) {
                throw new Error('Invalid client token');
            }
            
            // Verify server token
            const isValidServer = await this.core.crypto.verifyServerToken(
                authData.serverToken,
                authData.wid
            );
            
            if (!isValidServer) {
                throw new Error('Invalid server token');
            }
            
            console.log('Authentication verification successful');
            
        } catch (error) {
            console.error('Auth verification error:', error);
            throw error;
        }
    }
    
    destroy() {
        if (this.qrTimeout) {
            clearTimeout(this.qrTimeout);
            this.qrTimeout = null;
        }
        
        this.removeAllListeners();
    }
}

module.exports = QRAuth;
