/**
 * Signal Protocol Implementation
 * Core cryptographic primitives for WhatsApp's Signal Protocol
 */

const crypto = require('crypto');
const forge = require('node-forge');

class SignalProtocolImpl {
    constructor() {
        this.curve = 'secp256k1';
        this.hashAlgorithm = 'sha256';
    }
    
    async initialize() {
        console.log('Signal Protocol implementation initialized');
    }
    
    /**
     * Generate Curve25519 key pair
     */
    async generateKeyPair() {
        try {
            // Generate Ed25519 key pair (compatible with Curve25519)
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
            
            return {
                public: keyPair.publicKey,
                private: keyPair.privateKey
            };
            
        } catch (error) {
            console.error('Failed to generate key pair:', error);
            throw error;
        }
    }
    
    /**
     * Perform ECDH key exchange
     */
    async performKeyExchange(privateKey, publicKey) {
        try {
            // Convert keys to appropriate format for ECDH
            const privateKeyObject = crypto.createPrivateKey({
                key: privateKey,
                format: 'der',
                type: 'pkcs8'
            });
            
            const publicKeyObject = crypto.createPublicKey({
                key: publicKey,
                format: 'der',
                type: 'spki'
            });
            
            // Perform ECDH
            const sharedSecret = crypto.diffieHellman({
                privateKey: privateKeyObject,
                publicKey: publicKeyObject
            });
            
            return sharedSecret;
            
        } catch (error) {
            console.error('Key exchange failed:', error);
            throw error;
        }
    }
    
    /**
     * HKDF (HMAC-based Key Derivation Function)
     */
    async hkdf(inputKeyMaterial, salt, info, length) {
        try {
            // Extract step
            const prk = crypto.createHmac('sha256', salt)
                .update(inputKeyMaterial)
                .digest();
            
            // Expand step
            const n = Math.ceil(length / 32);
            const t = [];
            
            for (let i = 0; i < n; i++) {
                const hmac = crypto.createHmac('sha256', prk);
                
                if (i > 0) {
                    hmac.update(t[i - 1]);
                }
                
                hmac.update(info);
                hmac.update(Buffer.from([i + 1]));
                
                t[i] = hmac.digest();
            }
            
            const okm = Buffer.concat(t);
            return okm.slice(0, length);
            
        } catch (error) {
            console.error('HKDF failed:', error);
            throw error;
        }
    }
    
    /**
     * Generate prekey bundle
     */
    async generatePreKeyBundle(identityKey, signedPreKey, preKeys) {
        try {
            const bundle = {
                identityKey: identityKey,
                signedPreKey: {
                    keyId: signedPreKey.keyId,
                    publicKey: signedPreKey.publicKey,
                    signature: signedPreKey.signature
                },
                preKeys: preKeys.map(key => ({
                    keyId: key.keyId,
                    publicKey: key.publicKey
                }))
            };
            
            return bundle;
            
        } catch (error) {
            console.error('Failed to generate prekey bundle:', error);
            throw error;
        }
    }
    
    /**
     * Sign data with private key
     */
    async sign(data, privateKey) {
        try {
            const sign = crypto.createSign('sha256');
            sign.update(data);
            sign.end();
            
            const signature = sign.sign({
                key: privateKey,
                format: 'der',
                type: 'pkcs8'
            });
            
            return signature;
            
        } catch (error) {
            console.error('Signing failed:', error);
            throw error;
        }
    }
    
    /**
     * Verify signature
     */
    async verify(data, signature, publicKey) {
        try {
            const verify = crypto.createVerify('sha256');
            verify.update(data);
            verify.end();
            
            const isValid = verify.verify({
                key: publicKey,
                format: 'der',
                type: 'spki'
            }, signature);
            
            return isValid;
            
        } catch (error) {
            console.error('Verification failed:', error);
            return false;
        }
    }
    
    /**
     * Generate message keys from chain key
     */
    async generateMessageKeys(chainKey) {
        try {
            // Message key = HMAC(chain_key, 0x01)
            const messageKey = crypto.createHmac('sha256', chainKey)
                .update(Buffer.from([0x01]))
                .digest();
            
            // Derive encryption and MAC keys from message key
            const kdfInput = Buffer.concat([messageKey, Buffer.from('WhatsApp Message Keys')]);
            
            const keys = await this.hkdf(
                kdfInput,
                Buffer.alloc(32), // Salt
                Buffer.from('message'), // Info
                80 // 32 + 32 + 16 (enc + mac + iv)
            );
            
            return {
                cipherKey: keys.slice(0, 32),
                macKey: keys.slice(32, 64),
                iv: keys.slice(64, 80)
            };
            
        } catch (error) {
            console.error('Message key generation failed:', error);
            throw error;
        }
    }
    
    /**
     * Generate next chain key
     */
    async generateNextChainKey(chainKey) {
        try {
            // Next chain key = HMAC(chain_key, 0x02)
            const nextChainKey = crypto.createHmac('sha256', chainKey)
                .update(Buffer.from([0x02]))
                .digest();
            
            return nextChainKey;
            
        } catch (error) {
            console.error('Next chain key generation failed:', error);
            throw error;
        }
    }
    
    /**
     * Encrypt message with Double Ratchet
     */
    async encryptWithDoubleRatchet(plaintext, sessionState) {
        try {
            // Generate message keys
            const messageKeys = await this.generateMessageKeys(sessionState.sendingChainKey);
            
            // Encrypt plaintext
            const cipher = crypto.createCipherGCM('aes-256-gcm', messageKeys.cipherKey);
            cipher.setIVLength(12);
            
            let ciphertext = cipher.update(plaintext);
            ciphertext = Buffer.concat([ciphertext, cipher.final()]);
            
            const tag = cipher.getAuthTag();
            
            // Update chain key
            sessionState.sendingChainKey = await this.generateNextChainKey(sessionState.sendingChainKey);
            sessionState.previousCounter++;
            
            return {
                ciphertext: ciphertext,
                tag: tag,
                iv: messageKeys.iv.slice(0, 12),
                counter: sessionState.previousCounter
            };
            
        } catch (error) {
            console.error('Double Ratchet encryption failed:', error);
            throw error;
        }
    }
    
    /**
     * Decrypt message with Double Ratchet
     */
    async decryptWithDoubleRatchet(encryptedMessage, sessionState) {
        try {
            // Generate message keys for the specific counter
            const messageKeys = await this._getMessageKeysForCounter(
                sessionState.receivingChainKey,
                encryptedMessage.counter
            );
            
            // Decrypt ciphertext
            const decipher = crypto.createDecipherGCM('aes-256-gcm', messageKeys.cipherKey);
            decipher.setAuthTag(encryptedMessage.tag);
            
            let plaintext = decipher.update(encryptedMessage.ciphertext);
            plaintext = Buffer.concat([plaintext, decipher.final()]);
            
            return plaintext;
            
        } catch (error) {
            console.error('Double Ratchet decryption failed:', error);
            throw error;
        }
    }
    
    async _getMessageKeysForCounter(chainKey, counter) {
        // Generate chain keys up to the desired counter
        let currentChainKey = chainKey;
        
        for (let i = 0; i < counter; i++) {
            currentChainKey = await this.generateNextChainKey(currentChainKey);
        }
        
        return await this.generateMessageKeys(currentChainKey);
    }
    
    /**
     * Generate random bytes
     */
    generateRandomBytes(length) {
        return crypto.randomBytes(length);
    }
    
    /**
     * Hash function
     */
    hash(data) {
        return crypto.createHash('sha256').update(data).digest();
    }
    
    /**
     * HMAC function
     */
    hmac(key, data) {
        return crypto.createHmac('sha256', key).update(data).digest();
    }
}

module.exports = SignalProtocolImpl;
