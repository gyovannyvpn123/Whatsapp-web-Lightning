/**
 * Key Management System
 * Handles generation, storage, and management of cryptographic keys
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class KeyManager {
    constructor() {
        this.identityKeys = null;
        this.preKeys = new Map();
        this.signedPreKeys = new Map();
        this.sessionKeys = new Map();
        this.keyStorePath = './keys';
        
        this.isInitialized = false;
    }
    
    async initialize() {
        try {
            // Ensure key storage directory exists
            await this._ensureKeyDirectory();
            
            // Try to load existing keys
            await this._loadExistingKeys();
            
            this.isInitialized = true;
            console.log('Key manager initialized');
            
        } catch (error) {
            console.error('Failed to initialize key manager:', error);
            throw error;
        }
    }
    
    async _ensureKeyDirectory() {
        try {
            await fs.mkdir(this.keyStorePath, { recursive: true });
        } catch (error) {
            // Directory might already exist
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    
    async _loadExistingKeys() {
        try {
            // Try to load identity keys
            const identityPath = path.join(this.keyStorePath, 'identity.json');
            try {
                const identityData = await fs.readFile(identityPath, 'utf8');
                this.identityKeys = JSON.parse(identityData);
                console.log('Loaded existing identity keys');
            } catch (error) {
                // No existing identity keys
                console.log('No existing identity keys found');
            }
            
            // Try to load prekeys
            const preKeysPath = path.join(this.keyStorePath, 'prekeys.json');
            try {
                const preKeysData = await fs.readFile(preKeysPath, 'utf8');
                const preKeysArray = JSON.parse(preKeysData);
                
                preKeysArray.forEach(key => {
                    this.preKeys.set(key.keyId, key);
                });
                
                console.log(`Loaded ${preKeysArray.length} prekeys`);
            } catch (error) {
                // No existing prekeys
                console.log('No existing prekeys found');
            }
            
            // Try to load signed prekeys
            const signedPreKeysPath = path.join(this.keyStorePath, 'signed-prekeys.json');
            try {
                const signedPreKeysData = await fs.readFile(signedPreKeysPath, 'utf8');
                const signedPreKeysArray = JSON.parse(signedPreKeysData);
                
                signedPreKeysArray.forEach(key => {
                    this.signedPreKeys.set(key.keyId, key);
                });
                
                console.log(`Loaded ${signedPreKeysArray.length} signed prekeys`);
            } catch (error) {
                // No existing signed prekeys
                console.log('No existing signed prekeys found');
            }
            
        } catch (error) {
            console.error('Error loading existing keys:', error);
        }
    }
    
    /**
     * Generate identity key pair
     */
    async generateIdentityKeys() {
        try {
            const keyPair = crypto.generateKeyPairSync('ed25519', {
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'der'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'der'
                }
            });
            
            const identityKeys = {
                public: keyPair.publicKey,
                private: keyPair.privateKey,
                timestamp: Date.now()
            };
            
            console.log('Generated new identity keys');
            return identityKeys;
            
        } catch (error) {
            console.error('Failed to generate identity keys:', error);
            throw error;
        }
    }
    
    /**
     * Generate prekeys
     */
    async generatePreKeys(count = 100) {
        try {
            const preKeys = [];
            
            for (let i = 0; i < count; i++) {
                const keyPair = crypto.generateKeyPairSync('x25519', {
                    publicKeyEncoding: {
                        type: 'spki',
                        format: 'der'
                    },
                    privateKeyEncoding: {
                        type: 'pkcs8',
                        format: 'der'
                    }
                });
                
                const preKey = {
                    keyId: this._generateKeyId(),
                    public: keyPair.publicKey,
                    private: keyPair.privateKey,
                    timestamp: Date.now()
                };
                
                preKeys.push(preKey);
            }
            
            console.log(`Generated ${count} prekeys`);
            return preKeys;
            
        } catch (error) {
            console.error('Failed to generate prekeys:', error);
            throw error;
        }
    }
    
    /**
     * Generate signed prekey
     */
    async generateSignedPreKey(identityPrivateKey) {
        try {
            const keyPair = crypto.generateKeyPairSync('x25519', {
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'der'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'der'
                }
            });
            
            // Sign the public key with identity key
            const signature = await this._signKey(keyPair.publicKey, identityPrivateKey);
            
            const signedPreKey = {
                keyId: this._generateKeyId(),
                public: keyPair.publicKey,
                private: keyPair.privateKey,
                signature: signature,
                timestamp: Date.now()
            };
            
            console.log('Generated signed prekey');
            return signedPreKey;
            
        } catch (error) {
            console.error('Failed to generate signed prekey:', error);
            throw error;
        }
    }
    
    async _signKey(publicKey, privateKey) {
        try {
            // Use HMAC for Curve25519 keys (WhatsApp uses HMAC-based signatures)
            const hmac = crypto.createHmac('sha256', privateKey);
            hmac.update(publicKey);
            return hmac.digest();
            
        } catch (error) {
            console.error('Failed to sign key:', error);
            throw error;
        }
    }
    
    _generateKeyId() {
        return Math.floor(Math.random() * 0xFFFFFF);
    }
    
    /**
     * Store identity keys
     */
    storeIdentityKeys(identityKeys) {
        this.identityKeys = identityKeys;
        this._saveIdentityKeys();
    }
    
    /**
     * Store prekeys
     */
    storePreKeys(preKeys) {
        preKeys.forEach(key => {
            this.preKeys.set(key.keyId, key);
        });
        this._savePreKeys();
    }
    
    /**
     * Store signed prekey
     */
    storeSignedPreKey(signedPreKey) {
        this.signedPreKeys.set(signedPreKey.keyId, signedPreKey);
        this._saveSignedPreKeys();
    }
    
    /**
     * Get identity keys
     */
    getIdentityKeys() {
        return this.identityKeys;
    }
    
    /**
     * Get prekey by ID
     */
    getPreKey(keyId) {
        return this.preKeys.get(keyId);
    }
    
    /**
     * Get all prekeys
     */
    getAllPreKeys() {
        return Array.from(this.preKeys.values());
    }
    
    /**
     * Remove prekey
     */
    removePreKey(keyId) {
        const removed = this.preKeys.delete(keyId);
        if (removed) {
            this._savePreKeys();
        }
        return removed;
    }
    
    /**
     * Get signed prekey by ID
     */
    getSignedPreKey(keyId) {
        return this.signedPreKeys.get(keyId);
    }
    
    /**
     * Get latest signed prekey
     */
    getLatestSignedPreKey() {
        const signedPreKeys = Array.from(this.signedPreKeys.values());
        if (signedPreKeys.length === 0) {
            return null;
        }
        
        return signedPreKeys.reduce((latest, current) => {
            return current.timestamp > latest.timestamp ? current : latest;
        });
    }
    
    /**
     * Store session key
     */
    storeSessionKey(sessionId, sessionKey) {
        this.sessionKeys.set(sessionId, sessionKey);
    }
    
    /**
     * Get session key
     */
    getSessionKey(sessionId) {
        return this.sessionKeys.get(sessionId);
    }
    
    /**
     * Remove session key
     */
    removeSessionKey(sessionId) {
        return this.sessionKeys.delete(sessionId);
    }
    
    /**
     * Export keys for backup
     */
    exportKeys() {
        return {
            identity: this.identityKeys,
            preKeys: Array.from(this.preKeys.values()),
            signedPreKeys: Array.from(this.signedPreKeys.values()),
            sessionKeys: Array.from(this.sessionKeys.entries()),
            timestamp: Date.now()
        };
    }
    
    /**
     * Restore keys from backup
     */
    async restoreKeys(keyData) {
        try {
            if (keyData.identity) {
                this.identityKeys = keyData.identity;
            }
            
            if (keyData.preKeys) {
                this.preKeys.clear();
                keyData.preKeys.forEach(key => {
                    this.preKeys.set(key.keyId, key);
                });
            }
            
            if (keyData.signedPreKeys) {
                this.signedPreKeys.clear();
                keyData.signedPreKeys.forEach(key => {
                    this.signedPreKeys.set(key.keyId, key);
                });
            }
            
            if (keyData.sessionKeys) {
                this.sessionKeys.clear();
                keyData.sessionKeys.forEach(([sessionId, sessionKey]) => {
                    this.sessionKeys.set(sessionId, sessionKey);
                });
            }
            
            // Save restored keys
            await this._saveAllKeys();
            
            console.log('Keys restored successfully');
            
        } catch (error) {
            console.error('Failed to restore keys:', error);
            throw error;
        }
    }
    
    async _saveIdentityKeys() {
        if (!this.identityKeys) return;
        
        try {
            const identityPath = path.join(this.keyStorePath, 'identity.json');
            await fs.writeFile(identityPath, JSON.stringify(this.identityKeys, null, 2));
        } catch (error) {
            console.error('Failed to save identity keys:', error);
        }
    }
    
    async _savePreKeys() {
        try {
            const preKeysPath = path.join(this.keyStorePath, 'prekeys.json');
            const preKeysArray = Array.from(this.preKeys.values());
            await fs.writeFile(preKeysPath, JSON.stringify(preKeysArray, null, 2));
        } catch (error) {
            console.error('Failed to save prekeys:', error);
        }
    }
    
    async _saveSignedPreKeys() {
        try {
            const signedPreKeysPath = path.join(this.keyStorePath, 'signed-prekeys.json');
            const signedPreKeysArray = Array.from(this.signedPreKeys.values());
            await fs.writeFile(signedPreKeysPath, JSON.stringify(signedPreKeysArray, null, 2));
        } catch (error) {
            console.error('Failed to save signed prekeys:', error);
        }
    }
    
    async _saveAllKeys() {
        await Promise.all([
            this._saveIdentityKeys(),
            this._savePreKeys(),
            this._saveSignedPreKeys()
        ]);
    }
    
    /**
     * Clear all keys
     */
    async clearAllKeys() {
        this.identityKeys = null;
        this.preKeys.clear();
        this.signedPreKeys.clear();
        this.sessionKeys.clear();
        
        try {
            await fs.rm(this.keyStorePath, { recursive: true, force: true });
            console.log('All keys cleared');
        } catch (error) {
            console.error('Failed to clear key directory:', error);
        }
    }
}

module.exports = KeyManager;
