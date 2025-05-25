/**
 * Production WhatsApp Web Library Example
 * Exemplu complet și robust pentru producție
 */

const ProductionWhatsAppClient = require('./src/production-client');

class ProductionWhatsAppBot {
    constructor() {
        // Configurare production-ready
        this.client = new ProductionWhatsAppClient({
            sessionPath: './session.json',
            keysPath: './keys',
            authMethod: 'qr', // sau 'pairing' 
            maxReconnectAttempts: 10,
            heartbeatInterval: 30000,
            rateLimitDelay: 1000,
            autoMarkRead: true,
            autoSendReceipts: true,
            queueMessages: true
        });
        
        this.isReady = false;
        this.setupEventHandlers();
        this.setupMessageHandlers();
    }
    
    setupEventHandlers() {
        // QR Code pentru scanat
        this.client.on('qr', (qr) => {
            console.log('\n📱 QR CODE GENERAT - SCANEAZĂ CU WHATSAPP!');
            console.log(qr);
            console.log('\n🔗 Deschide WhatsApp → Settings → Linked Devices → Link a Device\n');
        });
        
        // Pairing code pentru autentificare cu numărul
        this.client.on('pairing_code', (data) => {
            console.log('\n🔑 PAIRING CODE GENERAT!');
            console.log(`╔════════════════════════════════════╗`);
            console.log(`║          PAIRING CODE              ║`);
            console.log(`║             ${data.code}             ║`);
            console.log(`╚════════════════════════════════════╝`);
            console.log('📱 Introdu acest cod în WhatsApp pe telefon!\n');
        });
        
        // Autentificare reușită
        this.client.on('authenticated', () => {
            console.log('✅ AUTENTIFICARE REUȘITĂ!');
        });
        
        // Autentificare eșuată
        this.client.on('auth_failure', (error) => {
            console.error('❌ AUTENTIFICARE EȘUATĂ:', error.message);
            process.exit(1);
        });
        
        // Client gata pentru utilizare
        this.client.on('ready', () => {
            console.log('🚀 WHATSAPP CLIENT PRODUCTION GATA!');
            this.isReady = true;
            this.showClientInfo();
            this.showCommands();
        });
        
        // Mesaje primite
        this.client.on('message', (message) => {
            this.handleIncomingMessage(message);
        });
        
        // Mesaje create (trimise)
        this.client.on('message_create', (message) => {
            console.log(`📤 Mesaj trimis către ${message.chatId}`);
        });
        
        // Schimbări de stare
        this.client.on('state_change', (state) => {
            console.log(`🔄 Stare schimbată: ${state.from} → ${state.to}`);
        });
        
        // Deconectare
        this.client.on('disconnected', (reason) => {
            console.log('🔌 Client deconectat:', reason);
            this.isReady = false;
        });
        
        // Erori
        this.client.on('error', (error) => {
            console.error('💥 Eroare client:', error);
        });
    }
    
    setupMessageHandlers() {
        // Handler pentru comenzi
        this.client.onMessage(msg => msg.body?.startsWith('!'), async (message) => {
            await this.handleCommand(message);
        });
        
        // Handler pentru salutări
        this.client.onMessage(/^(salut|hello|hi|buna)/i, async (message) => {
            await this.client.sendMessage(message.from, 
                '👋 Salut! Sunt un bot WhatsApp production-ready! Scrie !help pentru comenzi.');
        });
        
        // Handler pentru media
        this.client.onMessage(msg => msg.type !== 'text', async (message) => {
            await this.handleMedia(message);
        });
    }
    
    async handleIncomingMessage(message) {
        console.log('\n📨 MESAJ NOU PRIMIT:');
        console.log(`📞 De la: ${message.from}`);
        console.log(`📝 Tip: ${message.type || 'text'}`);
        console.log(`⏰ Timp: ${new Date().toLocaleString()}`);
        
        if (message.body) {
            console.log(`💬 Conținut: ${message.body}`);
        }
        
        if (message.hasMedia) {
            console.log(`📎 Media: ${message.type}`);
        }
    }
    
    async handleCommand(message) {
        const command = message.body.toLowerCase().trim();
        const chatId = message.from;
        
        try {
            switch (true) {
                case command === '!help':
                    await this.sendHelpMessage(chatId);
                    break;
                    
                case command === '!ping':
                    await this.client.sendMessage(chatId, '🏓 Pong! Bot functional!');
                    break;
                    
                case command === '!info':
                    await this.sendInfoMessage(chatId);
                    break;
                    
                case command === '!time':
                    const now = new Date().toLocaleString('ro-RO');
                    await this.client.sendMessage(chatId, `🕒 Timpul curent: ${now}`);
                    break;
                    
                case command.startsWith('!echo '):
                    const text = message.body.slice(6);
                    await this.client.sendMessage(chatId, `🔁 Echo: ${text}`);
                    break;
                    
                case command === '!status':
                    await this.sendStatusMessage(chatId);
                    break;
                    
                default:
                    await this.client.sendMessage(chatId, 
                        '❓ Comandă necunoscută. Scrie !help pentru lista de comenzi.');
            }
            
        } catch (error) {
            console.error('❌ Eroare la procesarea comenzii:', error);
            await this.client.sendMessage(chatId, 
                '❌ Eroare la procesarea comenzii. Încearcă din nou.');
        }
    }
    
    async handleMedia(message) {
        try {
            console.log(`📎 Procesez media de tip: ${message.type}`);
            
            const chatId = message.from;
            const responses = {
                'image': '🖼️ Imagine primită! Arată super!',
                'video': '🎥 Video primit! Foarte interesant!',
                'audio': '🎵 Audio primit! Sună bine!',
                'document': '📄 Document primit! Mulțumesc!',
                'sticker': '😄 Sticker primit! Foarte drăguț!'
            };
            
            const response = responses[message.type] || '📎 Media primit!';
            await this.client.sendMessage(chatId, response);
            
        } catch (error) {
            console.error('❌ Eroare la procesarea media:', error);
        }
    }
    
    async sendHelpMessage(chatId) {
        const helpText = `🤖 BOT WHATSAPP PRODUCTION

📋 COMENZI DISPONIBILE:
• !ping - Test conectivitate
• !info - Informații bot
• !time - Timp curent
• !echo <text> - Repetă textul
• !status - Status sistem
• !help - Această listă

🎯 FUNCȚIONALITĂȚI:
✅ Mesaje text și media
✅ Răspunsuri automate
✅ Rate limiting
✅ Queue management
✅ Error handling robust
✅ Session management
✅ Auto-reconnect

🚀 Bot production-ready!`;

        await this.client.sendMessage(chatId, helpText);
    }
    
    async sendInfoMessage(chatId) {
        const info = this.client.getInfo();
        const state = this.client.getState();
        
        const infoText = `ℹ️ INFORMAȚII BOT:

📱 Client ID: ${info?.clientId?.substring(0, 8)}...
🔗 Stare: ${state}
⚡ Status: ${this.isReady ? 'Online' : 'Offline'}
🕒 Timp rulare: ${this.getUptime()}

🛠️ SPECIFICAȚII TEHNICE:
• Protocol WhatsApp autentic
• Signal Protocol encryption
• Production-ready features
• Rate limiting activ
• Auto-reconnect funcțional`;

        await this.client.sendMessage(chatId, infoText);
    }
    
    async sendStatusMessage(chatId) {
        const status = `📊 STATUS SISTEM:

✅ WhatsApp Client: ${this.isReady ? 'ONLINE' : 'OFFLINE'}
✅ Conexiune: ${this.client.getState()}
✅ Rate Limiting: ACTIV
✅ Message Queue: FUNCȚIONAL
✅ Auto-reconnect: ACTIV
✅ Error Handling: ROBUST

🚀 Toate sistemele funcționează normal!`;

        await this.client.sendMessage(chatId, status);
    }
    
    showClientInfo() {
        const info = this.client.getInfo();
        console.log('\n📋 INFORMAȚII CLIENT:');
        console.log(`• Client ID: ${info?.clientId || 'N/A'}`);
        console.log(`• Număr telefon: ${info?.wid || 'N/A'}`);
        console.log(`• Stare: ${this.client.getState()}`);
        console.log(`• Session activ: ${info?.timestamp ? 'Da' : 'Nu'}`);
    }
    
    showCommands() {
        console.log('\n🤖 BOT COMMANDS:');
        console.log('• !ping - Test bot');
        console.log('• !info - Bot info');
        console.log('• !time - Current time');
        console.log('• !echo <text> - Echo text');
        console.log('• !status - System status');
        console.log('• !help - Show help');
    }
    
    getUptime() {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    
    // Testează trimiterea de mesaje
    async sendTestMessage(phoneNumber, message) {
        if (!this.isReady) {
            console.error('❌ Client nu este gata');
            return;
        }
        
        try {
            const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
            
            console.log(`📤 Trimit mesaj test către ${chatId}...`);
            const result = await this.client.sendMessage(chatId, message);
            
            console.log('✅ Mesaj test trimis cu succes:', result.id);
            return result;
            
        } catch (error) {
            console.error('❌ Trimitere mesaj test eșuată:', error);
            throw error;
        }
    }
    
    // Testează trimiterea de media
    async sendTestMedia(phoneNumber, mediaPath, caption = '') {
        if (!this.isReady) {
            console.error('❌ Client nu este gata');
            return;
        }
        
        try {
            const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
            
            console.log(`📤 Trimit media test către ${chatId}...`);
            const result = await this.client.sendMedia(chatId, mediaPath, { caption });
            
            console.log('✅ Media test trimisă cu succes:', result.id);
            return result;
            
        } catch (error) {
            console.error('❌ Trimitere media test eșuată:', error);
            throw error;
        }
    }
    
    async start() {
        try {
            console.log('🚀 PORNESC WHATSAPP BOT PRODUCTION...');
            await this.client.initialize();
            
        } catch (error) {
            console.error('💥 Pornire bot eșuată:', error);
            process.exit(1);
        }
    }
    
    async stop() {
        try {
            console.log('🛑 Opresc WhatsApp bot...');
            await this.client.destroy();
            console.log('✅ Bot oprit cu succes');
            
        } catch (error) {
            console.error('❌ Oprire bot eșuată:', error);
        }
    }
}

// Funcția principală
async function main() {
    const bot = new ProductionWhatsAppBot();
    
    // Gestionarea semnalelor de terminare
    process.on('SIGINT', async () => {
        console.log('\n🛑 Primesc SIGINT, opresc elegant...');
        await bot.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Primesc SIGTERM, opresc elegant...');
        await bot.stop();
        process.exit(0);
    });
    
    // Pornește bot-ul
    await bot.start();
    
    // Exemplu: trimite mesaj de test după 10 secunde
    setTimeout(async () => {
        if (bot.isReady) {
            try {
                // Înlocuiește cu numărul tău pentru test
                // await bot.sendTestMessage('+40123456789', 'Salut din WhatsApp Bot Production! 🚀');
            } catch (error) {
                console.error('Test mesaj eșuat:', error);
            }
        }
    }, 10000);
}

// Rulează dacă fișierul este executat direct
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Eroare aplicație:', error);
        process.exit(1);
    });
}

module.exports = ProductionWhatsAppBot;