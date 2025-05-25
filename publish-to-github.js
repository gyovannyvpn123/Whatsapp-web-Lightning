/**
 * Script pentru publicarea bibliotecii WhatsApp Web pe GitHub
 * Publică TOATE fișierele bibliotecii funcționale
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class GitHubPublisher {
    constructor() {
        this.token = process.env.GITHUB_TOKEN;
        this.owner = 'gyovannyvpn123';
        this.repo = 'Whatsapp-web-Lightning';
        this.email = 'mdanut159@gmail.com';
        this.baseUrl = 'api.github.com';
        
        if (!this.token) {
            throw new Error('GITHUB_TOKEN environment variable is required');
        }
    }
    
    /**
     * Face request către GitHub API
     */
    async makeRequest(method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseUrl,
                path: endpoint,
                method: method,
                headers: {
                    'Authorization': `token ${this.token}`,
                    'User-Agent': 'WhatsApp-Web-Library-Publisher',
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                }
            };
            
            if (data) {
                const jsonData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(jsonData);
            }
            
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = responseData ? JSON.parse(responseData) : {};
                        
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            reject(new Error(`GitHub API error: ${res.statusCode} - ${response.message || responseData}`));
                        }
                    } catch (error) {
                        reject(new Error(`Parse error: ${error.message}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            if (data) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }
    
    /**
     * Verifică dacă repository-ul există
     */
    async checkRepository() {
        try {
            await this.makeRequest('GET', `/repos/${this.owner}/${this.repo}`);
            console.log('✅ Repository-ul există deja');
            return true;
        } catch (error) {
            console.log('ℹ️ Repository-ul nu există, va fi creat');
            return false;
        }
    }
    
    /**
     * Creează repository-ul dacă nu există
     */
    async createRepository() {
        try {
            const repoData = {
                name: this.repo,
                description: 'Production-ready WhatsApp Web library with authentic protocol implementation - Biblioteca WhatsApp Web completă și funcțională',
                private: false,
                has_issues: true,
                has_projects: true,
                has_wiki: true,
                auto_init: false
            };
            
            await this.makeRequest('POST', '/user/repos', repoData);
            console.log('✅ Repository creat cu succes!');
            return true;
        } catch (error) {
            console.error('❌ Eroare la crearea repository-ului:', error.message);
            return false;
        }
    }
    
    /**
     * Obține toate fișierele din directorul curent
     */
    async getAllFiles(dir = '.', baseDir = '.') {
        const files = [];
        const items = await fs.readdir(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relativePath = path.relative(baseDir, fullPath);
            
            // Skip node_modules, .git, și alte directoare temporare
            if (item === 'node_modules' || item === '.git' || item === '.replit' || 
                item.startsWith('.') || item === 'keys' || item === 'downloads') {
                continue;
            }
            
            const stats = await fs.stat(fullPath);
            
            if (stats.isDirectory()) {
                const subFiles = await this.getAllFiles(fullPath, baseDir);
                files.push(...subFiles);
            } else {
                files.push({
                    path: relativePath.replace(/\\/g, '/'), // Normalize pentru GitHub
                    fullPath: fullPath
                });
            }
        }
        
        return files;
    }
    
    /**
     * Creează conținutul fișierului pentru GitHub
     */
    async createFileContent(filePath) {
        try {
            const content = await fs.readFile(filePath);
            return Buffer.from(content).toString('base64');
        } catch (error) {
            console.error(`❌ Eroare la citirea fișierului ${filePath}:`, error.message);
            return null;
        }
    }
    
    /**
     * Publică un fișier pe GitHub
     */
    async publishFile(filePath, content) {
        try {
            const data = {
                message: `Add ${filePath} - WhatsApp Web Library`,
                content: content,
                committer: {
                    name: 'WhatsApp Web Library Bot',
                    email: this.email
                },
                author: {
                    name: 'gyovannyvpn123',
                    email: this.email
                }
            };
            
            await this.makeRequest('PUT', `/repos/${this.owner}/${this.repo}/contents/${filePath}`, data);
            console.log(`✅ Publicat: ${filePath}`);
            return true;
        } catch (error) {
            console.error(`❌ Eroare la publicarea ${filePath}:`, error.message);
            return false;
        }
    }
    
    /**
     * Publică toată biblioteca pe GitHub
     */
    async publishLibrary() {
        try {
            console.log('🚀 PORNESC PUBLICAREA BIBLIOTECII WHATSAPP WEB PE GITHUB!');
            console.log(`📦 Repository: ${this.owner}/${this.repo}`);
            console.log(`📧 Email: ${this.email}\n`);
            
            // Verifică/creează repository-ul
            const repoExists = await this.checkRepository();
            if (!repoExists) {
                const created = await this.createRepository();
                if (!created) {
                    throw new Error('Nu s-a putut crea repository-ul');
                }
                // Așteaptă puțin după crearea repository-ului
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Obține toate fișierele
            console.log('📂 Scanez toate fișierele bibliotecii...');
            const files = await this.getAllFiles();
            
            console.log(`📋 Găsite ${files.length} fișiere pentru publicare:`);
            files.forEach(file => console.log(`   • ${file.path}`));
            
            // Publică fișierele
            console.log('\n📤 Încep publicarea fișierelor...');
            let successCount = 0;
            let errorCount = 0;
            
            for (const file of files) {
                try {
                    const content = await this.createFileContent(file.fullPath);
                    if (content) {
                        const success = await this.publishFile(file.path, content);
                        if (success) {
                            successCount++;
                        } else {
                            errorCount++;
                        }
                        
                        // Delay între fișiere pentru a evita rate limiting
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`❌ Eroare la procesarea ${file.path}:`, error.message);
                    errorCount++;
                }
            }
            
            // Rezultate finale
            console.log('\n🎉 PUBLICARE COMPLETĂ!');
            console.log('═══════════════════════════════════════');
            console.log(`✅ Fișiere publicate cu succes: ${successCount}`);
            console.log(`❌ Fișiere cu erori: ${errorCount}`);
            console.log(`📊 Total fișiere: ${files.length}`);
            console.log('═══════════════════════════════════════');
            console.log(`🔗 Repository disponibil la: https://github.com/${this.owner}/${this.repo}`);
            console.log('🚀 Biblioteca WhatsApp Web este acum LIVE pe GitHub!');
            
            if (successCount > 0) {
                console.log('\n📦 Biblioteca include:');
                console.log('• WhatsApp Web client complet și funcțional');
                console.log('• Autentificare QR și Pairing Code');
                console.log('• Signal Protocol encryption autentic');
                console.log('• Production-ready features');
                console.log('• Documentație completă în engleză');
                console.log('• Exemple funcționale');
                console.log('• Rate limiting și error handling');
                console.log('• Session management persistent');
                console.log('• Auto-reconnect robust');
            }
            
            return successCount > 0;
            
        } catch (error) {
            console.error('💥 Eroare în procesul de publicare:', error.message);
            throw error;
        }
    }
    
    /**
     * Creează README actualizat cu link-uri GitHub
     */
    async updateReadmeWithLinks() {
        try {
            const readmeContent = await fs.readFile('README.md', 'utf8');
            const updatedReadme = readmeContent.replace(
                /https:\/\/github\.com\/whatsapp-web-real\/whatsapp-web-real/g,
                `https://github.com/${this.owner}/${this.repo}`
            );
            
            await fs.writeFile('README.md', updatedReadme);
            console.log('✅ README actualizat cu link-urile GitHub corecte');
        } catch (error) {
            console.error('❌ Eroare la actualizarea README:', error.message);
        }
    }
}

// Funcția principală
async function main() {
    try {
        const publisher = new GitHubPublisher();
        
        // Actualizează README cu link-urile corecte
        await publisher.updateReadmeWithLinks();
        
        // Publică biblioteca
        const success = await publisher.publishLibrary();
        
        if (success) {
            console.log('\n🎊 SUCCES TOTAL! Biblioteca WhatsApp Web a fost publicată pe GitHub!');
            console.log('🌟 Poți acum să o distribui și să o folosești în proiecte!');
        } else {
            console.log('\n⚠️ Publicarea a fost completată cu unele erori. Verifică log-urile de mai sus.');
        }
        
    } catch (error) {
        console.error('💥 Eroare fatală:', error.message);
        process.exit(1);
    }
}

// Rulează scriptul
if (require.main === module) {
    main();
}

module.exports = GitHubPublisher;