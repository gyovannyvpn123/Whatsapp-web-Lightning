/**
 * WebSocket Client for WhatsApp Web
 * Handles the low-level WebSocket connection to WhatsApp servers
 */

const { EventEmitter } = require('events');
const WebSocket = require('ws');

class WebSocketClient extends EventEmitter {
    constructor(core) {
        super();
        this.core = core;
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.pingInterval = null;
        this.pongTimeout = null;
        
        // WhatsApp Web endpoints
        this.endpoints = [
            'wss://web.whatsapp.com/ws/chat',
            'wss://w1.web.whatsapp.com/ws/chat',
            'wss://w2.web.whatsapp.com/ws/chat',
            'wss://w3.web.whatsapp.com/ws/chat',
            'wss://w4.web.whatsapp.com/ws/chat'
        ];
        
        this.currentEndpointIndex = 0;
    }
    
    async connect() {
        if (this.ws && this.isConnected) {
            console.log('WebSocket already connected');
            return;
        }
        
        try {
            await this._createConnection();
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            throw error;
        }
    }
    
    async _createConnection() {
        return new Promise((resolve, reject) => {
            try {
                const endpoint = this.endpoints[this.currentEndpointIndex];
                console.log(`Connecting to WhatsApp WebSocket: ${endpoint}`);
                
                // Create WebSocket connection with proper headers
                this.ws = new WebSocket(endpoint, {
                    headers: {
                        'Origin': 'https://web.whatsapp.com',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    perMessageDeflate: false
                });
                
                // Set up event handlers
                this.ws.on('open', () => {
                    console.log('WebSocket connection established');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this._startHeartbeat();
                    this.emit('open');
                    resolve();
                });
                
                this.ws.on('close', (code, reason) => {
                    console.log(`WebSocket connection closed: ${code} ${reason}`);
                    this.isConnected = false;
                    this._stopHeartbeat();
                    this.emit('close', code, reason);
                    
                    // Attempt reconnection
                    this._scheduleReconnection();
                });
                
                this.ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.emit('error', error);
                    reject(error);
                });
                
                this.ws.on('message', (data) => {
                    this._handleMessage(data);
                });
                
                this.ws.on('ping', (data) => {
                    this.ws.pong(data);
                });
                
                this.ws.on('pong', () => {
                    if (this.pongTimeout) {
                        clearTimeout(this.pongTimeout);
                        this.pongTimeout = null;
                    }
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    _handleMessage(data) {
        try {
            // Emit raw message data
            this.emit('message', data);
            
        } catch (error) {
            console.error('Failed to handle WebSocket message:', error);
        }
    }
    
    async send(data) {
        if (!this.ws || !this.isConnected) {
            throw new Error('WebSocket not connected');
        }
        
        if (this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not ready');
        }
        
        try {
            // Send data through WebSocket
            this.ws.send(data);
            
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            throw error;
        }
    }
    
    _startHeartbeat() {
        // Send ping every 30 seconds
        this.pingInterval = setInterval(() => {
            if (this.ws && this.isConnected) {
                this.ws.ping();
                
                // Set timeout for pong response
                this.pongTimeout = setTimeout(() => {
                    console.log('Pong timeout, closing connection');
                    this.ws.terminate();
                }, 10000);
            }
        }, 30000);
    }
    
    _stopHeartbeat() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
    }
    
    _scheduleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('reconnect_failed');
            return;
        }
        
        this.reconnectAttempts++;
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelay
        );
        
        console.log(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            this._attemptReconnection();
        }, delay);
    }
    
    async _attemptReconnection() {
        try {
            // Try next endpoint
            this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
            
            console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            await this._createConnection();
            
        } catch (error) {
            console.error('Reconnection failed:', error);
            this._scheduleReconnection();
        }
    }
    
    async disconnect() {
        if (this.ws) {
            this._stopHeartbeat();
            this.ws.close(1000, 'Normal closure');
            this.ws = null;
        }
        
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }
    
    isReady() {
        return this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN;
    }
    
    getConnectionInfo() {
        if (!this.ws) {
            return null;
        }
        
        return {
            readyState: this.ws.readyState,
            url: this.ws.url,
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            endpoint: this.endpoints[this.currentEndpointIndex]
        };
    }
    
    /**
     * Send binary message
     */
    async sendBinary(buffer) {
        if (!this.isReady()) {
            throw new Error('WebSocket not ready');
        }
        
        try {
            this.ws.send(buffer, { binary: true });
            
        } catch (error) {
            console.error('Failed to send binary message:', error);
            throw error;
        }
    }
    
    /**
     * Send text message
     */
    async sendText(text) {
        if (!this.isReady()) {
            throw new Error('WebSocket not ready');
        }
        
        try {
            this.ws.send(text);
            
        } catch (error) {
            console.error('Failed to send text message:', error);
            throw error;
        }
    }
    
    /**
     * Get current endpoint
     */
    getCurrentEndpoint() {
        return this.endpoints[this.currentEndpointIndex];
    }
    
    /**
     * Force endpoint switch
     */
    switchEndpoint() {
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
        console.log(`Switched to endpoint: ${this.getCurrentEndpoint()}`);
    }
    
    /**
     * Reset connection state
     */
    reset() {
        this.disconnect();
        this.reconnectAttempts = 0;
        this.currentEndpointIndex = 0;
    }
}

module.exports = WebSocketClient;
