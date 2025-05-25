/**
 * WhatsApp Web Library - Pairing Code Example
 * Demonstrează autentificarea cu pairing code ca în aplicația oficială
 */

const WhatsAppClient = require('./src/index');

class WhatsAppPairingExample {
    constructor() {
        this.client = new WhatsAppClient({
            sessionPath: './session.json',
            authMethod: 'pairing', // Folosește pairing code în loc de QR
            qrTimeout: 60000,
            authTimeout: 60000
        });
        
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        // Pairing code event - codul generat pentru introducere în WhatsApp
        this.client.on('pairing_code', (pairingData) => {
            console.log('\n🔑 PAIRING CODE GENERAT!');
            console.log('╔════════════════════════════════════╗');
            console.log(`║          PAIRING CODE              ║`);
            console.log(`║              ${pairingData.code}              ║`);
            console.log('╚════════════════════════════════════╝');
            console.log('\n📱 Pași pentru autentificare:');
            console.log('1. Deschide WhatsApp pe telefon');
            console.log('2. Mergi la Settings → Linked Devices');
            console.log('3. Apasă "Link with Phone Number"');
            console.log(`4. Introdu numărul: ${pairingData.phoneNumber}`);
            console.log(`5. Introdu codul: ${pairingData.code}`);
            console.log(`⏰ Codul expiră în ${pairingData.expiresIn / 1000} secunde\n`);
        });
        
        // Authentication events
        this.client.on('authenticated', () => {
            console.log('✅ Autentificare cu pairing code reușită!');
        });
        
        this.client.on('auth_failure', (error) => {
            console.error('❌ Autentificare eșuată:', error.message);
        });
        
        // Ready event
        this.client.on('ready', () => {
            console.log('🚀 WhatsApp Client gata cu pairing code!');
            this.showClientInfo();
        });
        
        // Message events
        this.client.on('message', (message) => {
            console.log('\n📨 Mesaj nou primit:');
            console.log(`De la: ${message.from}`);
            console.log(`Conținut: ${message.body}`);
        });
        
        // Connection events
        this.client.on('disconnected', (reason) => {
            console.log('🔌 Client deconectat:', reason);
        });
    }
    
    async startWithPairingCode(phoneNumber) {
        try {
            console.log('🔄 Inițializez WhatsApp cu pairing code...');
            console.log(`📞 Numărul de telefon: ${phoneNumber}`);
            
            // Setează numărul de telefon pentru pairing
            this.client.setPairingPhone(phoneNumber);
            
            // Inițializează clientul
            await this.client.initialize();
            
        } catch (error) {
            console.error('💥 Eroare la inițializare:', error);
            process.exit(1);
        }
    }
    
    showClientInfo() {
        const info = this.client.getInfo();
        console.log('\n📋 Informații client:');
        console.log(`• Client ID: ${info.clientId}`);
        console.log(`• Număr telefon: ${info.wid || 'Nu este disponibil'}`);
        console.log(`• Stare: ${this.client.getState()}`);
        console.log('\n🎯 Gata pentru trimitere/primire mesaje!');
    }
    
    async sendTestMessage(chatId, message) {
        try {
            console.log(`📤 Trimit mesaj către ${chatId}...`);
            const result = await this.client.sendMessage(chatId, message);
            console.log('✅ Mesaj trimis cu succes:', result.id);
            return result;
        } catch (error) {
            console.error('❌ Eroare la trimiterea mesajului:', error);
        }
    }
    
    async stop() {
        try {
            console.log('🛑 Opresc clientul WhatsApp...');
            await this.client.destroy();
            console.log('✅ Client oprit cu succes');
        } catch (error) {
            console.error('❌ Eroare la oprirea clientului:', error);
        }
    }
}

// Funcția principală
async function main() {
    const wa = new WhatsAppPairingExample();
    
    // Procesarea argumentelor din linia de comandă
    const args = process.argv.slice(2);
    const phoneNumber = args[0];
    
    if (!phoneNumber) {
        console.log('📞 Utilizare: node example-pairing.js <număr_telefon>');
        console.log('📞 Exemplu: node example-pairing.js +40123456789');
        process.exit(1);
    }
    
    // Gestionarea terminării procesului
    process.on('SIGINT', async () => {
        console.log('\n🛑 Primesc SIGINT, opresc elegant...');
        await wa.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Primesc SIGTERM, opresc elegant...');
        await wa.stop();
        process.exit(0);
    });
    
    // Pornește clientul cu pairing code
    await wa.startWithPairingCode(phoneNumber);
    
    // Exemplu: trimite un mesaj de test după autentificare
    setTimeout(async () => {
        if (wa.client.getState() === 'CONNECTED') {
            try {
                // Înlocuiește cu un număr real pentru test
                // await wa.sendTestMessage('1234567890@s.whatsapp.net', 'Salut din WhatsApp Web Library! 🚀');
            } catch (error) {
                console.error('Test mesaj eșuat:', error);
            }
        }
    }, 5000);
}

// Rulează dacă fișierul este executat direct
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Eroare aplicație:', error);
        process.exit(1);
    });
}

module.exports = WhatsAppPairingExample;