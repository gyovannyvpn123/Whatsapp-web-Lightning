/**
 * WhatsApp Web Library Example
 * Demonstrates how to use the WhatsApp Web library
 */

const WhatsAppClient = require('./src/index');
const fs = require('fs').promises;
const path = require('path');

class WhatsAppExample {
    constructor() {
        // Initialize client with configuration
        this.client = new WhatsAppClient({
            sessionPath: './session.json',
            qrTimeout: 60000,
            authTimeout: 60000,
            restartOnCrash: true
        });
        
        this.isReady = false;
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        // QR Code event - scan this with WhatsApp mobile app
        this.client.on('qr', (qr) => {
            console.log('\n📱 QR Code received! Scan with WhatsApp mobile app:');
            console.log(qr);
            console.log('\nOpen WhatsApp on your phone → Settings → Linked Devices → Link a Device');
        });
        
        // Authentication events
        this.client.on('authenticated', () => {
            console.log('✅ Authentication successful!');
        });
        
        this.client.on('auth_failure', (error) => {
            console.error('❌ Authentication failed:', error.message);
            process.exit(1);
        });
        
        // Ready event - client is connected and ready
        this.client.on('ready', () => {
            console.log('🚀 WhatsApp Client is ready!');
            this.isReady = true;
            this.showClientInfo();
        });
        
        // Incoming message events
        this.client.on('message', (message) => {
            this.handleIncomingMessage(message);
        });
        
        // Message acknowledgment events
        this.client.on('message_ack', (ack) => {
            console.log(`📬 Message ${ack.id} status: ${this.getAckStatus(ack.ack)}`);
        });
        
        // Presence updates (online/offline/typing)
        this.client.on('presence_update', (presence) => {
            console.log(`👤 ${presence.from} is ${presence.type}`);
        });
        
        // Typing indicators
        this.client.on('typing', (typing) => {
            if (typing.isTyping) {
                console.log(`✍️ ${typing.from} is typing...`);
            } else {
                console.log(`✋ ${typing.from} stopped typing`);
            }
        });
        
        // Group events
        this.client.on('group_join', (notification) => {
            console.log(`➕ ${notification.participant} joined group ${notification.from}`);
        });
        
        this.client.on('group_leave', (notification) => {
            console.log(`➖ ${notification.participant} left group ${notification.from}`);
        });
        
        // Connection events
        this.client.on('disconnected', (reason) => {
            console.log('🔌 Client disconnected:', reason);
            this.isReady = false;
        });
        
        // Error handling
        this.client.on('error', (error) => {
            console.error('💥 Client error:', error);
        });
    }
    
    async handleIncomingMessage(message) {
        try {
            console.log('\n📨 New message received:');
            console.log(`From: ${message.from}`);
            console.log(`Type: ${message.type}`);
            console.log(`Time: ${new Date(message.timestamp * 1000).toLocaleString()}`);
            
            if (message.body) {
                console.log(`Content: ${message.body}`);
                
                // Respond to specific commands
                await this.handleCommands(message);
            }
            
            if (message.hasMedia) {
                console.log(`Media: ${message.type} (${message.filename || 'no filename'})`);
                
                // Optionally download media
                if (message.type === 'image') {
                    await this.downloadMedia(message);
                }
            }
            
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }
    
    async handleCommands(message) {
        const body = message.body.toLowerCase().trim();
        
        try {
            // Ping command
            if (body === '!ping') {
                await this.client.sendMessage(message.from, '🏓 Pong!');
            }
            
            // Info command
            else if (body === '!info') {
                const info = this.client.getInfo();
                const response = `ℹ️ Bot Info:\n` +
                    `• Client ID: ${info.clientId?.slice(0, 8)}...\n` +
                    `• Connected: ${this.isReady ? 'Yes' : 'No'}\n` +
                    `• State: ${this.client.getState()}`;
                
                await this.client.sendMessage(message.from, response);
            }
            
            // Help command
            else if (body === '!help') {
                const helpText = `🤖 Available Commands:\n\n` +
                    `• !ping - Test bot responsiveness\n` +
                    `• !info - Show bot information\n` +
                    `• !time - Show current time\n` +
                    `• !echo <text> - Echo your message\n` +
                    `• !help - Show this help message`;
                
                await this.client.sendMessage(message.from, helpText);
            }
            
            // Time command
            else if (body === '!time') {
                const now = new Date().toLocaleString();
                await this.client.sendMessage(message.from, `🕒 Current time: ${now}`);
            }
            
            // Echo command
            else if (body.startsWith('!echo ')) {
                const text = message.body.slice(6);
                await this.client.sendMessage(message.from, `🔁 Echo: ${text}`);
            }
            
        } catch (error) {
            console.error('Error handling command:', error);
            await this.client.sendMessage(message.from, '❌ Error processing command');
        }
    }
    
    async downloadMedia(message) {
        try {
            console.log('📥 Downloading media...');
            
            const media = await message.downloadMedia();
            if (media) {
                const filename = message.filename || `image_${Date.now()}.jpg`;
                const filepath = path.join('./downloads', filename);
                
                // Ensure downloads directory exists
                await fs.mkdir('./downloads', { recursive: true });
                
                // Save media file
                await fs.writeFile(filepath, media.data);
                console.log(`💾 Media saved: ${filepath}`);
            }
            
        } catch (error) {
            console.error('Error downloading media:', error);
        }
    }
    
    showClientInfo() {
        const info = this.client.getInfo();
        console.log('\n📋 Client Information:');
        console.log(`• Client ID: ${info.clientId}`);
        console.log(`• Phone Number: ${info.wid || 'Not available'}`);
        console.log(`• State: ${this.client.getState()}`);
        console.log(`• Session loaded: ${info.timestamp ? 'Yes' : 'No'}`);
        console.log('\n🎯 Ready to send/receive messages!');
        
        // Show example usage
        this.showExamples();
    }
    
    showExamples() {
        console.log('\n📚 Example Usage:');
        console.log('• Send message: await client.sendMessage("1234567890@s.whatsapp.net", "Hello!")');
        console.log('• Send image: await client.sendMedia("1234567890@s.whatsapp.net", "./image.jpg")');
        console.log('• Get chats: await client.getChats()');
        console.log('• Get contacts: await client.getContacts()');
    }
    
    getAckStatus(ack) {
        const statuses = {
            '-1': 'Error',
            '0': 'Pending',
            '1': 'Sent',
            '2': 'Delivered',
            '3': 'Read',
            '4': 'Played'
        };
        
        return statuses[ack] || 'Unknown';
    }
    
    async sendTestMessage(phoneNumber, message) {
        if (!this.isReady) {
            console.error('❌ Client not ready');
            return;
        }
        
        try {
            const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
            
            console.log(`📤 Sending message to ${chatId}...`);
            const result = await this.client.sendMessage(chatId, message);
            
            console.log('✅ Message sent successfully:', result.id);
            return result;
            
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            throw error;
        }
    }
    
    async sendTestMedia(phoneNumber, mediaPath, caption = '') {
        if (!this.isReady) {
            console.error('❌ Client not ready');
            return;
        }
        
        try {
            const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
            
            console.log(`📤 Sending media to ${chatId}...`);
            const result = await this.client.sendMedia(chatId, mediaPath, { caption });
            
            console.log('✅ Media sent successfully:', result.id);
            return result;
            
        } catch (error) {
            console.error('❌ Failed to send media:', error);
            throw error;
        }
    }
    
    async start() {
        try {
            console.log('🔄 Initializing WhatsApp Web client...');
            await this.client.initialize();
            
        } catch (error) {
            console.error('💥 Failed to initialize client:', error);
            process.exit(1);
        }
    }
    
    async stop() {
        try {
            console.log('🛑 Stopping WhatsApp client...');
            await this.client.destroy();
            console.log('✅ Client stopped successfully');
            
        } catch (error) {
            console.error('❌ Error stopping client:', error);
        }
    }
}

// Example usage
async function main() {
    const wa = new WhatsAppExample();
    
    // Handle process termination
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await wa.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        await wa.stop();
        process.exit(0);
    });
    
    // Start the client
    await wa.start();
    
    // Example: Send a test message after client is ready
    // Uncomment and modify the phone number to test
    /*
    setTimeout(async () => {
        if (wa.isReady) {
            try {
                await wa.sendTestMessage('1234567890', 'Hello from WhatsApp Web Library! 🚀');
            } catch (error) {
                console.error('Test message failed:', error);
            }
        }
    }, 5000);
    */
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Application error:', error);
        process.exit(1);
    });
}

module.exports = WhatsAppExample;
