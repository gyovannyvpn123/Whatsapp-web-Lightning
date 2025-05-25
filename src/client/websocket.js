/**
 * WebSocket Connection Handler for WhatsApp Client
 * Handles the WebSocket connection lifecycle
 */

const { EventEmitter } = require('events');

class WebSocketHandler extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000; // Start with 1 second
        this.maxReconnectDelay = 30000; // Max 30 seconds
    }
    
    async connect() {
        if (this.ws && this.isConnected) {
            return;
        }
        
        try {
            await this._establishConnection();
            this._setupEventHandlers();
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            throw error;
        }
    }
    
    async _establishConnection() {
        // This would connect to the actual WhatsApp WebSocket endpoint
        // For now, we'll simulate the connection setup
        
        return new Promise((resolve, reject) => {
            try {
                // Create WebSocket connection to WhatsApp servers
                const wsUrl = 'wss://web.whatsapp.com/ws/chat';
                
                // Note: In real implementation, this would be the actual WhatsApp endpoint
                console.log('Connecting to WhatsApp WebSocket...');
                
                // Simulate connection
                setTimeout(() => {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    console.log('WebSocket connected to WhatsApp');
                    resolve();
                }, 1000);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    _setupEventHandlers() {
        if (!this.ws) return;
        
        this.ws.on('open', () => {
            console.log('WebSocket connection opened');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connected');
        });
        
        this.ws.on('close', (code, reason) => {
            console.log('WebSocket connection closed:', code, reason);
            this.isConnected = false;
            this.emit('disconnected', { code, reason });
            
            // Attempt reconnection
            this._attemptReconnection();
        });
        
        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        });
        
        this.ws.on('message', (data) => {
            this._handleMessage(data);
        });
    }
    
    _handleMessage(data) {
        try {
            // Process incoming WebSocket message
            this.emit('message', data);
            
        } catch (error) {
            console.error('Failed to handle WebSocket message:', error);
        }
    }
    
    async send(data) {
        if (!this.ws || !this.isConnected) {
            throw new Error('WebSocket not connected');
        }
        
        try {
            // Send data through WebSocket
            this.ws.send(data);
            
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            throw error;
        }
    }
    
    async _attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('reconnect_failed');
            return;
        }
        
        this.reconnectAttempts++;
        
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelay
        );
        
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(async () => {
            try {
                await this.connect();
                
            } catch (error) {
                console.error('Reconnection attempt failed:', error);
                this._attemptReconnection();
            }
        }, delay);
    }
    
    async disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }
    
    isReady() {
        return this.isConnected && this.ws;
    }
    
    getConnectionState() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
}

module.exports = WebSocketHandler;
