/**
 * Session Management for WhatsApp Web
 * Handles session persistence, restoration, and cleanup
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Helpers = require('../utils/helpers');

class Session {
    constructor(sessionPath = './session.json') {
        this.sessionPath = sessionPath;
        this.sessionData = null;
        this.isLoaded = false;
        this.encryptionKey = null;
        
        // Initialize encryption key from environment or generate
        this.encryptionKey = process.env.SESSION_ENCRYPTION_KEY || this._generateEncryptionKey();
    }
    
    /**
     * Load session from file
     */
    async load() {
        try {
            if (!(await Helpers.fileExists(this.sessionPath))) {
                console.log('No session file found');
                return null;
            }
            
            const sessionFileContent = await fs.readFile(this.sessionPath, 'utf8');
            
            // Try to decrypt session if it's encrypted
            let sessionData;
            try {
                sessionData = this._decryptSession(sessionFileContent);
            } catch (error) {
                // Fallback to plain JSON for backward compatibility
                sessionData = JSON.parse(sessionFileContent);
            }
            
            // Validate session structure
            if (!this._validateSession(sessionData)) {
                console.warn('Invalid session structure, ignoring');
                return null;
            }
            
            // Check if session is expired
            if (this._isSessionExpired(sessionData)) {
                console.log('Session expired, ignoring');
                await this.clear();
                return null;
            }
            
            this.sessionData = sessionData;
            this.isLoaded = true;
            
            console.log('Session loaded successfully');
            return sessionData;
            
        } catch (error) {
            console.error('Failed to load session:', error);
            return null;
        }
    }
    
    /**
     * Save session to file
     */
    async save(sessionData) {
        try {
            // Add metadata
            const sessionWithMetadata = {
                ...sessionData,
                lastUpdated: Date.now(),
                version: '1.0.0'
            };
            
            // Encrypt session data
            const encryptedSession = this._encryptSession(sessionWithMetadata);
            
            // Ensure directory exists
            const sessionDir = path.dirname(this.sessionPath);
            await Helpers.ensureDir(sessionDir);
            
            // Write to temporary file first, then rename (atomic operation)
            const tempPath = this.sessionPath + '.tmp';
            await fs.writeFile(tempPath, encryptedSession, 'utf8');
            await fs.rename(tempPath, this.sessionPath);
            
            this.sessionData = sessionWithMetadata;
            this.isLoaded = true;
            
            console.log('Session saved successfully');
            
        } catch (error) {
            console.error('Failed to save session:', error);
            throw error;
        }
    }
    
    /**
     * Update existing session data
     */
    async update(updateData) {
        if (!this.sessionData) {
            throw new Error('No session loaded');
        }
        
        // Merge update data with existing session
        const updatedSession = Helpers.deepMerge(this.sessionData, updateData);
        updatedSession.lastUpdated = Date.now();
        
        await this.save(updatedSession);
    }
    
    /**
     * Clear session file
     */
    async clear() {
        try {
            if (await Helpers.fileExists(this.sessionPath)) {
                await fs.unlink(this.sessionPath);
                console.log('Session file deleted');
            }
            
            this.sessionData = null;
            this.isLoaded = false;
            
        } catch (error) {
            console.error('Failed to clear session:', error);
            throw error;
        }
    }
    
    /**
     * Get session data
     */
    get() {
        return this.sessionData;
    }
    
    /**
     * Check if session is loaded
     */
    isSessionLoaded() {
        return this.isLoaded && this.sessionData !== null;
    }
    
    /**
     * Get specific session field
     */
    getField(fieldPath) {
        if (!this.sessionData) {
            return null;
        }
        
        const keys = fieldPath.split('.');
        let value = this.sessionData;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return null;
            }
        }
        
        return value;
    }
    
    /**
     * Set specific session field
     */
    async setField(fieldPath, value) {
        if (!this.sessionData) {
            this.sessionData = {};
        }
        
        const keys = fieldPath.split('.');
        const lastKey = keys.pop();
        let target = this.sessionData;
        
        // Navigate to the parent object
        for (const key of keys) {
            if (!(key in target) || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }
        
        target[lastKey] = value;
        
        await this.save(this.sessionData);
    }
    
    /**
     * Validate session structure
     */
    _validateSession(sessionData) {
        if (!sessionData || typeof sessionData !== 'object') {
            return false;
        }
        
        // Check for required fields
        const requiredFields = ['clientId'];
        
        for (const field of requiredFields) {
            if (!(field in sessionData)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Check if session is expired
     */
    _isSessionExpired(sessionData) {
        if (!sessionData.lastUpdated) {
            return false; // No expiration info, assume valid
        }
        
        const expirationTime = 30 * 24 * 60 * 60 * 1000; // 30 days
        const now = Date.now();
        
        return (now - sessionData.lastUpdated) > expirationTime;
    }
    
    /**
     * Encrypt session data
     */
    _encryptSession(sessionData) {
        try {
            const sessionJson = JSON.stringify(sessionData);
            const iv = crypto.randomBytes(16);
            
            const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
            
            let encrypted = cipher.update(sessionJson, 'utf8');
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            const authTag = cipher.getAuthTag();
            
            // Combine IV + encrypted data + auth tag
            const combined = Buffer.concat([iv, encrypted, authTag]);
            
            // Return base64 encoded result
            return combined.toString('base64');
            
        } catch (error) {
            console.error('Session encryption failed:', error);
            throw error;
        }
    }
    
    /**
     * Decrypt session data
     */
    _decryptSession(encryptedSession) {
        try {
            const combined = Buffer.from(encryptedSession, 'base64');
            
            // Extract components
            const iv = combined.slice(0, 16);
            const authTag = combined.slice(-16);
            const encrypted = combined.slice(16, -16);
            
            const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            return JSON.parse(decrypted.toString('utf8'));
            
        } catch (error) {
            console.error('Session decryption failed:', error);
            throw error;
        }
    }
    
    /**
     * Generate encryption key
     */
    _generateEncryptionKey() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    /**
     * Export session for backup
     */
    async exportSession() {
        if (!this.sessionData) {
            throw new Error('No session to export');
        }
        
        return {
            session: this.sessionData,
            exported: Date.now(),
            version: '1.0.0'
        };
    }
    
    /**
     * Import session from backup
     */
    async importSession(backupData) {
        try {
            if (!backupData || !backupData.session) {
                throw new Error('Invalid backup data');
            }
            
            // Validate imported session
            if (!this._validateSession(backupData.session)) {
                throw new Error('Invalid session structure in backup');
            }
            
            await this.save(backupData.session);
            console.log('Session imported successfully');
            
        } catch (error) {
            console.error('Session import failed:', error);
            throw error;
        }
    }
    
    /**
     * Get session statistics
     */
    getStats() {
        if (!this.sessionData) {
            return null;
        }
        
        return {
            hasClientId: !!this.sessionData.clientId,
            hasServerToken: !!this.sessionData.serverToken,
            hasClientToken: !!this.sessionData.clientToken,
            hasKeys: !!this.sessionData.keys,
            lastUpdated: this.sessionData.lastUpdated,
            isExpired: this._isSessionExpired(this.sessionData),
            filePath: this.sessionPath,
            fileExists: Helpers.fileExists(this.sessionPath)
        };
    }
    
    /**
     * Create session backup
     */
    async createBackup(backupPath) {
        try {
            const exportData = await this.exportSession();
            
            await Helpers.ensureDir(path.dirname(backupPath));
            await fs.writeFile(backupPath, JSON.stringify(exportData, null, 2));
            
            console.log(`Session backup created: ${backupPath}`);
            
        } catch (error) {
            console.error('Failed to create session backup:', error);
            throw error;
        }
    }
    
    /**
     * Restore from backup
     */
    async restoreFromBackup(backupPath) {
        try {
            if (!(await Helpers.fileExists(backupPath))) {
                throw new Error('Backup file not found');
            }
            
            const backupContent = await fs.readFile(backupPath, 'utf8');
            const backupData = JSON.parse(backupContent);
            
            await this.importSession(backupData);
            console.log(`Session restored from backup: ${backupPath}`);
            
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            throw error;
        }
    }
    
    /**
     * Clean up old session files
     */
    async cleanup() {
        try {
            const sessionDir = path.dirname(this.sessionPath);
            const files = await fs.readdir(sessionDir);
            
            for (const file of files) {
                if (file.endsWith('.tmp') || file.endsWith('.bak')) {
                    const filePath = path.join(sessionDir, file);
                    const stats = await Helpers.getFileStats(filePath);
                    
                    // Delete temporary files older than 1 hour
                    if (stats && (Date.now() - stats.mtime.getTime()) > 3600000) {
                        await fs.unlink(filePath);
                        console.log(`Cleaned up old file: ${file}`);
                    }
                }
            }
            
        } catch (error) {
            console.error('Session cleanup failed:', error);
        }
    }
}

module.exports = Session;
