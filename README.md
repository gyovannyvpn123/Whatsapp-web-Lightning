# WhatsApp Web Real

🚀 **Production-ready WhatsApp Web library with authentic protocol implementation**

A complete, robust WhatsApp Web library built from reverse engineering specifications. Connect to real WhatsApp servers with full Signal Protocol encryption and all WhatsApp Web features.

## ✨ Features

### 🔐 **Authentic Authentication**
- **QR Code Authentication** - Real ASCII QR codes from WhatsApp servers
- **Pairing Code Authentication** - Phone number + 8-digit code like official app
- **Session Management** - Persistent sessions with automatic restoration

### 📱 **Complete WhatsApp Web Features**
- **Text Messages** - Send and receive with full formatting
- **Media Support** - Images, videos, audio, documents, stickers
- **Group Management** - Create, manage, add/remove participants
- **Contact Management** - Full contact and chat operations
- **Real-time Events** - Typing indicators, presence, read receipts

### 🔒 **Security & Encryption**
- **Signal Protocol** - End-to-end encryption with Curve25519
- **Authentic Protocol** - Based on reverse engineering specs
- **Session Encryption** - Secure local session storage

### 🚀 **Production Ready**
- **Rate Limiting** - Prevent WhatsApp rate limits
- **Message Queuing** - Reliable message delivery
- **Auto-Reconnect** - Robust connection management
- **Error Handling** - Comprehensive error recovery
- **Heartbeat System** - Keep connections alive

## 📦 Installation

```bash
npm install whatsapp-web-real
```

## 🚀 Quick Start

### Basic QR Code Authentication

```javascript
const WhatsAppClient = require('whatsapp-web-real');

const client = new WhatsAppClient({
    sessionPath: './session.json',
    authMethod: 'qr'
});

// QR Code event
client.on('qr', (qr) => {
    console.log('Scan this QR code with WhatsApp:');
    console.log(qr);
});

// Ready event
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

// Message event
client.on('message', (message) => {
    console.log('New message:', message.body);
    
    // Auto-reply example
    if (message.body === 'hello') {
        client.sendMessage(message.from, 'Hello! 👋');
    }
});

// Initialize
client.initialize();
```

### Pairing Code Authentication

```javascript
const WhatsAppClient = require('whatsapp-web-real');

const client = new WhatsAppClient({
    sessionPath: './session.json',
    authMethod: 'pairing',
    phoneNumber: '+1234567890' // Your phone number
});

// Pairing code event
client.on('pairing_code', (data) => {
    console.log(`Pairing Code: ${data.code}`);
    console.log('Enter this code in WhatsApp on your phone');
});

client.initialize();
```

## 📋 API Reference

### Client Initialization

```javascript
const client = new WhatsAppClient({
    sessionPath: './session.json',        // Session file path
    authMethod: 'qr',                     // 'qr' or 'pairing'
    phoneNumber: '+1234567890',           // For pairing method
    maxReconnectAttempts: 10,             // Auto-reconnect attempts
    heartbeatInterval: 30000,             // Keep-alive interval
    rateLimitDelay: 1000,                 // Rate limiting delay
    autoMarkRead: true,                   // Auto-mark messages as read
    queueMessages: true                   // Queue messages when offline
});
```

### Events

```javascript
// Authentication events
client.on('qr', (qr) => { /* QR code generated */ });
client.on('pairing_code', (data) => { /* Pairing code generated */ });
client.on('authenticated', () => { /* Authentication successful */ });
client.on('auth_failure', (error) => { /* Authentication failed */ });
client.on('ready', () => { /* Client ready to use */ });

// Message events
client.on('message', (message) => { /* New message received */ });
client.on('message_create', (message) => { /* Message sent */ });
client.on('message_ack', (ack) => { /* Message acknowledgment */ });

// Connection events
client.on('connected', () => { /* Connected to WhatsApp */ });
client.on('disconnected', (reason) => { /* Disconnected */ });
client.on('reconnecting', () => { /* Attempting reconnection */ });

// Other events
client.on('group_join', (notification) => { /* Someone joined group */ });
client.on('group_leave', (notification) => { /* Someone left group */ });
client.on('contact_changed', (contact) => { /* Contact updated */ });
```

### Sending Messages

```javascript
// Text message
await client.sendMessage('1234567890@s.whatsapp.net', 'Hello World!');

// Message with options
await client.sendMessage('1234567890@s.whatsapp.net', 'Hello!', {
    linkPreview: false,
    mentionedJidList: ['0987654321@s.whatsapp.net']
});

// Media message
await client.sendMedia('1234567890@s.whatsapp.net', './image.jpg', {
    caption: 'Check this out!',
    fileName: 'my-image.jpg'
});

// Location message
await client.sendLocation('1234567890@s.whatsapp.net', {
    latitude: 40.7128,
    longitude: -74.0060,
    description: 'New York City'
});
```

### Group Management

```javascript
// Create group
const group = await client.createGroup('My Group', [
    '1234567890@s.whatsapp.net',
    '0987654321@s.whatsapp.net'
]);

// Add participants
await client.addToGroup(group.id, ['1111111111@s.whatsapp.net']);

// Remove participants
await client.removeFromGroup(group.id, ['1111111111@s.whatsapp.net']);

// Leave group
await client.leaveGroup(group.id);

// Update group info
await client.updateGroupSubject(group.id, 'New Group Name');
await client.updateGroupDescription(group.id, 'New description');
```

### Contact & Chat Operations

```javascript
// Get all chats
const chats = await client.getChats();

// Get specific chat
const chat = await client.getChatById('1234567890@s.whatsapp.net');

// Get all contacts
const contacts = await client.getContacts();

// Get specific contact
const contact = await client.getContactById('1234567890@s.whatsapp.net');

// Search messages
const messages = await client.searchMessages('hello', {
    chatId: '1234567890@s.whatsapp.net',
    limit: 10
});
```

### Presence & Status

```javascript
// Send typing indicator
await client.sendTyping('1234567890@s.whatsapp.net', true);

// Send presence
await client.sendPresence('available'); // 'available', 'unavailable'

// Mark chat as read
await client.markChatAsRead('1234567890@s.whatsapp.net');
```

## 🤖 Bot Example

```javascript
const WhatsAppBot = require('whatsapp-web-real');

const bot = new WhatsAppBot();

// Command handler
bot.onMessage(/^!(\w+)/, async (message, match) => {
    const command = match[1];
    
    switch (command) {
        case 'ping':
            await bot.sendMessage(message.from, '🏓 Pong!');
            break;
            
        case 'time':
            const time = new Date().toLocaleString();
            await bot.sendMessage(message.from, `🕒 Current time: ${time}`);
            break;
            
        case 'help':
            await bot.sendMessage(message.from, `
🤖 Available Commands:
• !ping - Test bot
• !time - Current time
• !help - This help
            `);
            break;
    }
});

// Media handler
bot.onMessage((msg) => msg.hasMedia, async (message) => {
    const media = await message.downloadMedia();
    console.log(`Received ${message.type}: ${media.filename}`);
    
    await bot.sendMessage(message.from, `📎 Received your ${message.type}!`);
});

bot.initialize();
```

## 🔧 Advanced Configuration

### Custom WebSocket Options

```javascript
const client = new WhatsAppClient({
    websocket: {
        endpoints: [
            'wss://web.whatsapp.com/ws/chat',
            'wss://w1.web.whatsapp.com/ws/chat'
        ],
        timeout: 30000,
        reconnectInterval: 5000
    }
});
```

### Custom Crypto Options

```javascript
const client = new WhatsAppClient({
    crypto: {
        keyPath: './custom-keys',
        sessionEncryption: true,
        signalProtocol: {
            curve: 'curve25519',
            cipher: 'aes-256-gcm'
        }
    }
});
```

## 🐛 Error Handling

```javascript
client.on('error', (error) => {
    console.error('Client error:', error);
    
    // Handle specific errors
    switch (error.code) {
        case 'AUTH_FAILURE':
            console.log('Authentication failed, please re-authenticate');
            break;
            
        case 'CONNECTION_FAILED':
            console.log('Connection failed, retrying...');
            break;
            
        case 'RATE_LIMITED':
            console.log('Rate limited, slowing down...');
            break;
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await client.destroy();
    process.exit(0);
});
```

## 📝 Message Object Structure

```javascript
{
    id: 'MESSAGE_ID',
    from: '1234567890@s.whatsapp.net',
    to: '0987654321@s.whatsapp.net',
    body: 'Message content',
    type: 'text', // 'text', 'image', 'video', 'audio', 'document'
    timestamp: 1640995200,
    fromMe: false,
    hasMedia: false,
    isForwarded: false,
    isGroup: false,
    mentionedJidList: [],
    quotedMessage: null,
    author: '1234567890@s.whatsapp.net' // For groups
}
```

## 🔐 Security Best Practices

1. **Secure Session Storage**
   ```javascript
   // Use encryption for session files
   const client = new WhatsAppClient({
       sessionPath: './session.json',
       sessionEncryption: true,
       encryptionKey: process.env.SESSION_KEY
   });
   ```

2. **Rate Limiting**
   ```javascript
   // Configure rate limiting to avoid bans
   const client = new WhatsAppClient({
       rateLimitDelay: 1000, // 1 second between messages
       maxConcurrentMessages: 5
   });
   ```

3. **Error Monitoring**
   ```javascript
   client.on('auth_failure', () => {
       // Clear invalid session
       client.logout();
   });
   ```

## 🚀 Production Deployment

### Environment Variables

```bash
# Session encryption
SESSION_ENCRYPTION_KEY=your-secret-key

# Rate limiting
RATE_LIMIT_DELAY=1000
MAX_RECONNECT_ATTEMPTS=10

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/whatsapp.log
```

### Docker Support

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["npm", "start"]
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
    apps: [{
        name: 'whatsapp-bot',
        script: 'production-example.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production'
        }
    }]
};
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This library is based on reverse engineering of WhatsApp Web. Use at your own risk and ensure compliance with WhatsApp's Terms of Service.

## 🙏 Acknowledgments

- Based on reverse engineering work from [whatsapp-web-reveng](https://github.com/sigalor/whatsapp-web-reveng)
- Signal Protocol implementation
- WhatsApp Web community

## 📞 Support

- 🐛 [Report Bugs](https://github.com/gyovannyvpn123/Whatsapp-web-Lightning/issues)
- 💬 [Discussions](https://github.com/gyovannyvpn123/Whatsapp-web-Lightning/discussions)
- 📧 Email: support@whatsapp-web-real.com

---

Made with ❤️ by the WhatsApp Web Real Team