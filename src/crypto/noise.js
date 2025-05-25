/**
 * Noise Protocol Implementation
 * Implements the Noise protocol framework for secure channel establishment
 */

const crypto = require('crypto');

class NoiseProtocol {
    constructor() {
        this.pattern = 'Noise_XX_25519_AESGCM_SHA256';
        this.handshakeState = null;
        this.isInitialized = false;
        this.isHandshakeComplete = false;
    }
    
    async initialize() {
        this.handshakeState = {
            localStatic: null,
            localEphemeral: null,
            remoteStatic: null,
            remoteEphemeral: null,
            h: Buffer.alloc(32), // Handshake hash
            ck: Buffer.alloc(32), // Chaining key
            k: null, // Cipher key
            n: 0 // Nonce
        };
        
        // Initialize with protocol name
        const protocolName = Buffer.from(this.pattern, 'utf8');
        if (protocolName.length <= 32) {
            this.handshakeState.h = Buffer.concat([
                protocolName,
                Buffer.alloc(32 - protocolName.length)
            ]);
        } else {
            this.handshakeState.h = crypto.createHash('sha256')
                .update(protocolName)
                .digest();
        }
        
        this.handshakeState.ck = this.handshakeState.h;
        this.isInitialized = true;
        
        console.log('Noise protocol initialized');
    }
    
    /**
     * Generate ephemeral key pair
     */
    async generateEphemeralKeys() {
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
            
            return {
                public: keyPair.publicKey,
                private: keyPair.privateKey
            };
            
        } catch (error) {
            console.error('Failed to generate ephemeral keys:', error);
            throw error;
        }
    }
    
    /**
     * Mix hash function
     */
    mixHash(data) {
        const hash = crypto.createHash('sha256');
        hash.update(this.handshakeState.h);
        hash.update(data);
        this.handshakeState.h = hash.digest();
    }
    
    /**
     * Mix key function
     */
    async mixKey(inputKeyMaterial) {
        const output = await this.hkdf(
            inputKeyMaterial,
            this.handshakeState.ck,
            Buffer.alloc(0),
            64
        );
        
        this.handshakeState.ck = output.slice(0, 32);
        this.handshakeState.k = output.slice(32, 64);
        this.handshakeState.n = 0;
    }
    
    /**
     * HKDF implementation
     */
    async hkdf(inputKeyMaterial, salt, info, length) {
        // Extract
        const prk = crypto.createHmac('sha256', salt)
            .update(inputKeyMaterial)
            .digest();
        
        // Expand
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
    }
    
    /**
     * Encrypt and authenticate
     */
    encryptAndHash(plaintext) {
        if (!this.handshakeState.k) {
            this.mixHash(plaintext);
            return plaintext;
        }
        
        // Create nonce (8 bytes of zeros + 4 bytes of n)
        const nonce = Buffer.alloc(12);
        nonce.writeUInt32LE(this.handshakeState.n, 8);
        
        // Encrypt with AES-256-GCM
        const cipher = crypto.createCipherGCM('aes-256-gcm', this.handshakeState.k);
        cipher.setIVLength(12);
        
        // Set additional authenticated data
        cipher.setAAD(this.handshakeState.h);
        
        let ciphertext = cipher.update(plaintext);
        ciphertext = Buffer.concat([ciphertext, cipher.final()]);
        
        const tag = cipher.getAuthTag();
        const result = Buffer.concat([ciphertext, tag]);
        
        this.mixHash(result);
        this.handshakeState.n++;
        
        return result;
    }
    
    /**
     * Decrypt and verify
     */
    decryptAndHash(ciphertext) {
        if (!this.handshakeState.k) {
            this.mixHash(ciphertext);
            return ciphertext;
        }
        
        // Extract tag (last 16 bytes)
        const tag = ciphertext.slice(-16);
        const encrypted = ciphertext.slice(0, -16);
        
        // Create nonce
        const nonce = Buffer.alloc(12);
        nonce.writeUInt32LE(this.handshakeState.n, 8);
        
        // Decrypt with AES-256-GCM
        const decipher = crypto.createDecipherGCM('aes-256-gcm', this.handshakeState.k);
        decipher.setAuthTag(tag);
        decipher.setAAD(this.handshakeState.h);
        
        let plaintext = decipher.update(encrypted);
        plaintext = Buffer.concat([plaintext, decipher.final()]);
        
        this.mixHash(ciphertext);
        this.handshakeState.n++;
        
        return plaintext;
    }
    
    /**
     * Split function - derives transport keys
     */
    split() {
        const output = this.hkdf(
            Buffer.alloc(0),
            this.handshakeState.ck,
            Buffer.alloc(0),
            64
        );
        
        return {
            sendingKey: output.slice(0, 32),
            receivingKey: output.slice(32, 64)
        };
    }
    
    /**
     * Start handshake as initiator
     */
    async startHandshake(localStaticPrivate, localStaticPublic) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        // Set local static key
        this.handshakeState.localStatic = {
            private: localStaticPrivate,
            public: localStaticPublic
        };
        
        // Generate ephemeral key pair
        const ephemeral = await this.generateEphemeralKeys();
        this.handshakeState.localEphemeral = ephemeral;
        
        // -> e
        this.mixHash(ephemeral.public);
        
        return ephemeral.public;
    }
    
    /**
     * Process first handshake message
     */
    async processHandshakeMessage1(remoteEphemeralPublic, payload = Buffer.alloc(0)) {
        // <- e, ee, s, es
        
        // e
        this.handshakeState.remoteEphemeral = { public: remoteEphemeralPublic };
        this.mixHash(remoteEphemeralPublic);
        
        // ee
        const dh1 = crypto.diffieHellman({
            privateKey: crypto.createPrivateKey({
                key: this.handshakeState.localEphemeral.private,
                format: 'der',
                type: 'pkcs8'
            }),
            publicKey: crypto.createPublicKey({
                key: remoteEphemeralPublic,
                format: 'der',
                type: 'spki'
            })
        });
        
        await this.mixKey(dh1);
        
        // Decrypt payload if present
        const decryptedPayload = this.decryptAndHash(payload);
        
        return decryptedPayload;
    }
    
    /**
     * Create second handshake message
     */
    async createHandshakeMessage2(payload = Buffer.alloc(0)) {
        // -> s, se
        
        // s
        const encryptedStatic = this.encryptAndHash(this.handshakeState.localStatic.public);
        
        // se
        const dh2 = crypto.diffieHellman({
            privateKey: crypto.createPrivateKey({
                key: this.handshakeState.localStatic.private,
                format: 'der',
                type: 'pkcs8'
            }),
            publicKey: crypto.createPublicKey({
                key: this.handshakeState.remoteEphemeral.public,
                format: 'der',
                type: 'spki'
            })
        });
        
        await this.mixKey(dh2);
        
        // Encrypt payload
        const encryptedPayload = this.encryptAndHash(payload);
        
        return Buffer.concat([encryptedStatic, encryptedPayload]);
    }
    
    /**
     * Process second handshake message
     */
    async processHandshakeMessage2(message) {
        // <- s, se
        
        // Extract encrypted static key (assuming 48 bytes: 32 + 16 tag)
        const encryptedStatic = message.slice(0, 48);
        const payload = message.slice(48);
        
        // s
        const remoteStaticPublic = this.decryptAndHash(encryptedStatic);
        this.handshakeState.remoteStatic = { public: remoteStaticPublic };
        
        // se
        const dh2 = crypto.diffieHellman({
            privateKey: crypto.createPrivateKey({
                key: this.handshakeState.localEphemeral.private,
                format: 'der',
                type: 'pkcs8'
            }),
            publicKey: crypto.createPublicKey({
                key: remoteStaticPublic,
                format: 'der',
                type: 'spki'
            })
        });
        
        await this.mixKey(dh2);
        
        // Decrypt payload
        const decryptedPayload = this.decryptAndHash(payload);
        
        // Handshake complete
        this.isHandshakeComplete = true;
        
        return decryptedPayload;
    }
    
    /**
     * Get transport keys after handshake completion
     */
    getTransportKeys() {
        if (!this.isHandshakeComplete) {
            throw new Error('Handshake not complete');
        }
        
        return this.split();
    }
    
    /**
     * Reset handshake state
     */
    reset() {
        this.handshakeState = null;
        this.isHandshakeComplete = false;
        this.isInitialized = false;
    }
}

module.exports = NoiseProtocol;
