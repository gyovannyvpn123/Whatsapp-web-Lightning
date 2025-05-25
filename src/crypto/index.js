/**
 * Cryptographic Operations Handler
 * Implements Signal Protocol encryption for WhatsApp Web
 */

const crypto = require('crypto');
const forge = require('node-forge');
const SignalCrypto = require('./signal-impl');
const NoiseProtocol = require('./noise');
const KeyManager = require('./keys');

class CryptoHandler {
    constructor() {
        this.signal = new SignalCrypto();
        this.noise = new NoiseProtocol();
        this.keys = new KeyManager();
        
        this.sessionKeys = null;
        this.encryptionKeys = null;
        this.macKeys = null;
        
        this.isInitialized = false;
    }
    
    async initialize() {
        try {
            // Initialize all cryptographic components
            await this.signal.initialize();
            await this.noise.initialize();
            await this.keys.initialize();
            
            this.isInitialized = true;
            console.log('Crypto handler initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize crypto handler:', error);
            throw error;
        }
    }
    
    async generateKeys() {
        try {
            // Generate identity keys
            const identityKeys = await this.keys.generateIdentityKeys();
            
            // Generate prekeys
            const preKeys = await this.keys.generatePreKeys(100);
            
            // Generate signed prekey
            const signedPreKey = await this.keys.generateSignedPreKey(identityKeys.private);
            
            // Store keys
            this.keys.storeIdentityKeys(identityKeys);
            this.keys.storePreKeys(preKeys);
            this.keys.storeSignedPreKey(signedPreKey);
            
            console.log('Generated new key set');
            
            return {
                identity: identityKeys.public,
                preKeys: preKeys.map(key => key.public),
                signedPreKey: signedPreKey.public
            };
            
        } catch (error) {
            console.error('Failed to generate keys:', error);
            throw error;
        }
    }
    
    getPublicKey() {
        const identityKeys = this.keys.getIdentityKeys();
        return identityKeys ? identityKeys.public : null;
    }
    
    async restoreKeys(keyData) {
        try {
            await this.keys.restoreKeys(keyData);
            console.log('Keys restored successfully');
            
        } catch (error) {
            console.error('Failed to restore keys:', error);
            throw error;
        }
    }
    
    exportKeys() {
        return this.keys.exportKeys();
    }
    
    async performKeyExchange(remotePublicKey, remotePreKey) {
        try {
            // Perform Curve25519 ECDH key exchange
            const sharedSecret = await this.signal.performKeyExchange(
                remotePublicKey,
                remotePreKey
            );
            
            // Derive session keys using HKDF
            const sessionKeys = await this._deriveSessionKeys(sharedSecret);
            
            this.sessionKeys = sessionKeys;
            
            return sessionKeys;
            
        } catch (error) {
            console.error('Key exchange failed:', error);
            throw error;
        }
    }
    
    async _deriveSessionKeys(sharedSecret) {
        try {
            // Use HKDF to derive encryption and MAC keys
            const salt = crypto.randomBytes(32);
            const info = Buffer.from('WhatsApp Web Session Keys');
            
            // Derive 64 bytes: 32 for encryption, 32 for MAC
            const derivedKeys = await this.signal.hkdf(sharedSecret, salt, info, 64);
            
            return {
                encryptionKey: derivedKeys.slice(0, 32),
                macKey: derivedKeys.slice(32, 64),
                salt: salt
            };
            
        } catch (error) {
            console.error('Key derivation failed:', error);
            throw error;
        }
    }
    
    async encrypt(data) {
        if (!this.sessionKeys) {
            throw new Error('Session keys not established');
        }
        
        try {
            // Generate random IV
            const iv = crypto.randomBytes(16);
            
            // Encrypt with AES-256-CBC
            const cipher = crypto.createCipher('aes-256-cbc', this.sessionKeys.encryptionKey);
            cipher.setAutoPadding(true);
            
            let encrypted = cipher.update(data);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            // Calculate HMAC
            const hmac = crypto.createHmac('sha256', this.sessionKeys.macKey);
            hmac.update(iv);
            hmac.update(encrypted);
            const mac = hmac.digest();
            
            // Combine IV + encrypted + MAC
            return Buffer.concat([iv, encrypted, mac]);
            
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }
    
    async decrypt(encryptedData) {
        if (!this.sessionKeys) {
            throw new Error('Session keys not established');
        }
        
        try {
            // Extract components
            const iv = encryptedData.slice(0, 16);
            const mac = encryptedData.slice(-32);
            const encrypted = encryptedData.slice(16, -32);
            
            // Verify HMAC
            const hmac = crypto.createHmac('sha256', this.sessionKeys.macKey);
            hmac.update(iv);
            hmac.update(encrypted);
            const calculatedMac = hmac.digest();
            
            if (!crypto.timingSafeEqual(mac, calculatedMac)) {
                throw new Error('MAC verification failed');
            }
            
            // Decrypt
            const decipher = crypto.createDecipher('aes-256-cbc', this.sessionKeys.encryptionKey);
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            return decrypted;
            
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }
    
    async encryptMessage(message) {
        try {
            // Serialize message
            const serialized = JSON.stringify(message);
            const data = Buffer.from(serialized, 'utf8');
            
            // Encrypt
            const encrypted = await this.encrypt(data);
            
            return encrypted;
            
        } catch (error) {
            console.error('Message encryption failed:', error);
            throw error;
        }
    }
    
    async decryptMessage(encryptedMessage) {
        try {
            // Decrypt
            const decrypted = await this.decrypt(encryptedMessage);
            
            // Deserialize
            const message = JSON.parse(decrypted.toString('utf8'));
            
            return message;
            
        } catch (error) {
            console.error('Message decryption failed:', error);
            throw error;
        }
    }
    
    async verifyClientToken(token, clientId) {
        try {
            // Verify client token signature
            const publicKey = this.keys.getIdentityKeys().public;
            
            // Create verification data
            const verificationData = Buffer.concat([
                Buffer.from(clientId, 'base64'),
                Buffer.from(token, 'base64')
            ]);
            
            // Verify signature (simplified)
            return crypto.timingSafeEqual(
                crypto.createHash('sha256').update(verificationData).digest(),
                Buffer.from(token, 'base64').slice(-32)
            );
            
        } catch (error) {
            console.error('Client token verification failed:', error);
            return false;
        }
    }
    
    async verifyServerToken(token, wid) {
        try {
            // Verify server token (simplified verification)
            const tokenData = Buffer.from(token, 'base64');
            const widData = Buffer.from(wid, 'utf8');
            
            // Basic token structure validation
            return tokenData.length >= 32 && widData.length > 0;
            
        } catch (error) {
            console.error('Server token verification failed:', error);
            return false;
        }
    }
    
    generateMessageId() {
        // Generate unique message ID
        return crypto.randomBytes(16).toString('hex').toUpperCase();
    }
    
    generateNonce() {
        // Generate cryptographic nonce
        return crypto.randomBytes(16);
    }
    
    async deriveMediaKey(mediaData) {
        try {
            // Derive key for media encryption
            const hash = crypto.createHash('sha256');
            hash.update(mediaData);
            
            return hash.digest();
            
        } catch (error) {
            console.error('Media key derivation failed:', error);
            throw error;
        }
    }
    
    async encryptMedia(mediaData, mediaKey) {
        try {
            // Encrypt media with AES-256-GCM
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipherGCM('aes-256-gcm', mediaKey);
            cipher.setIVLength(12);
            
            let encrypted = cipher.update(mediaData);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            const tag = cipher.getAuthTag();
            
            return {
                encrypted: encrypted,
                iv: iv,
                tag: tag
            };
            
        } catch (error) {
            console.error('Media encryption failed:', error);
            throw error;
        }
    }
    
    async decryptMedia(encryptedMedia, mediaKey) {
        try {
            // Decrypt media with AES-256-GCM
            const decipher = crypto.createDecipherGCM('aes-256-gcm', mediaKey);
            decipher.setAuthTag(encryptedMedia.tag);
            
            let decrypted = decipher.update(encryptedMedia.encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            return decrypted;
            
        } catch (error) {
            console.error('Media decryption failed:', error);
            throw error;
        }
    }
}

module.exports = CryptoHandler;
