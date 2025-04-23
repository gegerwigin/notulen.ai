const puppeteer = require('puppeteer');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

class GoogleMeetBot {
    constructor(logger) {
        this.browser = null;
        this.page = null;
        this.isInitialized = false;
        this.config = {
            chromeHost: process.env.CHROME_HOST || 'chrome',
            chromePort: process.env.CHROME_PORT || '3000',
            chromeWSEndpoint: process.env.CHROME_WS_ENDPOINT || null,
            maxRetries: 3,
            retryDelay: 5000,
            screenshotDir: path.join(__dirname, 'screenshots'),
            connectionTimeout: 60000 // 60 detik timeout untuk koneksi
        };
        
        // Menggunakan logger yang diberikan atau membuat logger baru
        this.logger = logger || this.createLogger();
        
        // Buat direktori untuk screenshots jika belum ada
        if (!fs.existsSync(this.config.screenshotDir)) {
            fs.mkdirSync(this.config.screenshotDir, { recursive: true });
        }
    }
    
    createLogger() {
        const logsDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        return winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ level, message, timestamp }) => {
                    return `${timestamp} ${level.toUpperCase()}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                new winston.transports.File({ 
                    filename: path.join(logsDir, 'bot.log') 
                })
            ]
        });
    }
    
    // Fungsi utility untuk retry operasi
    async retry(operation, description, maxRetries = this.config.maxRetries) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.info(`${description} - Percobaan ${attempt}/${maxRetries}`);
                return await operation();
            } catch (error) {
                lastError = error;
                this.logger.error(`${description} gagal - Percobaan ${attempt}/${maxRetries}: ${error.message}`);
                
                if (attempt < maxRetries) {
                    this.logger.info(`Menunggu ${this.config.retryDelay}ms sebelum mencoba lagi...`);
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                }
            }
        }
        
        throw new Error(`${description} gagal setelah ${maxRetries} percobaan: ${lastError.message}`);
    }
    
    // Mengambil screenshot dan menyimpannya
    async takeScreenshot(name) {
        try {
            if (!this.page) {
                throw new Error('Browser page belum diinisialisasi');
            }
            
            const filename = `${name}_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
            const filepath = path.join(this.config.screenshotDir, filename);
            
            await this.page.screenshot({ path: filepath, fullPage: true });
            this.logger.info(`Screenshot disimpan ke ${filepath}`);
            return filepath;
        } catch (error) {
            this.logger.error(`Gagal mengambil screenshot: ${error.message}`);
            return null;
        }
    }
    
    // Inisialisasi browser dan page
    async initialize() {
        try {
            this.logger.info('Menginisialisasi bot Google Meet...');
            
            // Daftar endpoint yang akan dicoba
            const wsEndpoints = [
                this.config.chromeWSEndpoint, // Dari environment
                `ws://${this.config.chromeHost}:${this.config.chromePort}`, // Default
                'ws://chrome:3000', // Nama container
                'ws://127.0.0.1:3001', // Localhost
                'ws://172.27.0.2:3000' // IP internal container docker
            ].filter(Boolean); // Hapus nilai null/undefined
            
            this.logger.info(`Akan mencoba ${wsEndpoints.length} endpoint chrome: ${wsEndpoints.join(', ')}`);
            
            let lastError = null;
            
            // Coba semua endpoint
            for (const browserWSEndpoint of wsEndpoints) {
                try {
                    this.logger.info(`Mencoba koneksi ke ${browserWSEndpoint}...`);
                    
                    // Konek ke browserless/chrome
                    this.browser = await puppeteer.connect({
                        browserWSEndpoint,
                        defaultViewport: {
                            width: 1280,
                            height: 720
                        },
                        timeout: this.config.connectionTimeout
                    });
                    
                    this.logger.info(`Berhasil terhubung ke browserless/chrome via ${browserWSEndpoint}`);
                    break; // Keluar dari loop jika berhasil
                } catch (connError) {
                    lastError = connError;
                    this.logger.error(`Koneksi ke ${browserWSEndpoint} gagal: ${connError.message}`);
                    // Lanjutkan ke endpoint berikutnya
                }
            }
            
            // Jika tidak ada endpoint yang berhasil
            if (!this.browser) {
                this.logger.error('Semua koneksi ke chrome-headless gagal');
                throw lastError || new Error('Tidak dapat terhubung ke browserless/chrome');
            }
            
            // Buat browser context baru untuk isolasi (seperti profil terpisah)
            const context = await this.browser.createBrowserContext();
            this.page = await context.newPage();
            
            // Set User Agent
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
            
            // Override permission untuk kamera dan mikrofon
            await this.page.setPermissions(['camera', 'microphone'], 'granted');
            
            // Tangani dialog yang muncul (misalnya alert, confirm, prompt)
            this.page.on('dialog', async dialog => {
                this.logger.info(`Dialog terdeteksi: ${dialog.type()} - ${dialog.message()}`);
                await dialog.dismiss();
            });
            
            // Log console message dari halaman browser
            this.page.on('console', message => {
                const type = message.type();
                const text = message.text();
                if (type === 'error') {
                    this.logger.error(`Browser console error: ${text}`);
                } else if (type === 'warning') {
                    this.logger.warn(`Browser console warning: ${text}`);
                } else {
                    this.logger.debug(`Browser console [${type}]: ${text}`);
                }
            });
            
            this.isInitialized = true;
            this.logger.info('Bot Google Meet berhasil diinisialisasi');
            return true;
        } catch (error) {
            this.logger.error(`Gagal menginisialisasi bot: ${error.message}`);
            
            // Tutup browser jika ada
            if (this.browser) {
                try {
                    await this.browser.close();
                } catch (closeError) {
                    this.logger.error(`Gagal menutup browser: ${closeError.message}`);
                }
                this.browser = null;
                this.page = null;
            }
            
            this.isInitialized = false;
            throw error;
        }
    }
    
    // Bergabung ke meeting Google Meet
    async joinMeeting(url, username) {
        if (!this.isInitialized) {
            throw new Error('Bot belum diinisialisasi, panggil initialize() terlebih dahulu');
        }
        
        this.logger.info(`Bergabung ke meeting: ${url} sebagai ${username}`);
        
        try {
            // Navigasi ke URL meeting
            await this.retry(async () => {
                this.logger.info(`Navigasi ke ${url}`);
                await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
                this.logger.info('Berhasil memuat halaman meeting');
            }, 'Navigasi ke URL meeting');
            
            // Ambil screenshot halaman awal
            await this.takeScreenshot('before_join');
            
            // Tunggu beberapa waktu untuk memastikan halaman terinisialisasi dengan benar
            await this.page.waitForTimeout(3000);
            
            // Cek apakah ada input nama dan isi dengan username
            await this.retry(async () => {
                const nameInputSelector = 'input[aria-label="Your name"]';
                const nameInputExists = await this.page.evaluate((selector) => {
                    return document.querySelector(selector) !== null;
                }, nameInputSelector);
                
                if (nameInputExists) {
                    this.logger.info('Input nama ditemukan, mengisi nama...');
                    await this.page.type(nameInputSelector, username, { delay: 100 });
                    this.logger.info(`Nama berhasil diisi: ${username}`);
                } else {
                    this.logger.warn('Input nama tidak ditemukan');
                    throw new Error('Tidak dapat menemukan input nama');
                }
            }, 'Mengisi nama pengguna');
            
            // Ambil screenshot setelah mengisi nama
            await this.takeScreenshot('after_name_input');
            
            // Selectors untuk tombol join
            const joinButtonSelectors = [
                'button[aria-label="Join now"]',
                'button[aria-label="Ask to join"]',
                'button:has-text("Join now")',
                'button:has-text("Ask to join")'
            ];
            
            // Klik tombol join
            await this.retry(async () => {
                for (const selector of joinButtonSelectors) {
                    try {
                        this.logger.info(`Mencoba klik tombol join dengan selector: ${selector}`);
                        
                        // Cek apakah tombol ada
                        const buttonExists = await this.page.evaluate((sel) => {
                            const button = document.querySelector(sel);
                            if (button) {
                                // Cek apakah tombol terlihat
                                const style = window.getComputedStyle(button);
                                const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                                return {
                                    exists: true,
                                    isVisible,
                                    isDisabled: button.disabled,
                                    text: button.textContent.trim()
                                };
                            }
                            return { exists: false };
                        }, selector);
                        
                        if (buttonExists.exists) {
                            this.logger.info(`Tombol join ditemukan: ${JSON.stringify(buttonExists)}`);
                            
                            if (!buttonExists.isVisible) {
                                this.logger.warn('Tombol join tidak terlihat');
                                continue;
                            }
                            
                            if (buttonExists.isDisabled) {
                                this.logger.warn('Tombol join dinonaktifkan');
                                continue;
                            }
                            
                            // Klik tombol join
                            await this.page.click(selector);
                            this.logger.info('Berhasil klik tombol join');
                            
                            // Ambil screenshot setelah join
                            await this.takeScreenshot('after_join_click');
                            
                            // Tunggu hingga berhasil masuk meeting (loading screen hilang)
                            await this.page.waitForFunction(() => {
                                // Cek jika elemen loading tidak terlihat lagi
                                const loadingElements = document.querySelectorAll('[role="progressbar"]');
                                return loadingElements.length === 0 || !Array.from(loadingElements).some(el => {
                                    const style = window.getComputedStyle(el);
                                    return style.display !== 'none' && style.visibility !== 'hidden';
                                });
                            }, { timeout: 30000 });
                            
                            this.logger.info('Berhasil bergabung ke meeting');
                            return true;
                        }
                    } catch (error) {
                        this.logger.error(`Gagal dengan selector ${selector}: ${error.message}`);
                    }
                }
                
                throw new Error('Tidak dapat menemukan tombol join yang valid');
            }, 'Klik tombol join');
            
            // Ambil screenshot saat di dalam meeting
            await this.takeScreenshot('inside_meeting');
            
            this.logger.info('Sukses bergabung ke meeting Google Meet');
            return true;
        } catch (error) {
            this.logger.error(`Gagal bergabung ke meeting: ${error.message}`);
            await this.takeScreenshot('join_error');
            throw new Error(`Gagal bergabung ke meeting: ${error.message}`);
        }
    }
    
    // Meninggalkan meeting Google Meet
    async leaveMeeting() {
        if (!this.isInitialized || !this.page) {
            throw new Error('Bot belum diinisialisasi atau sudah ditutup');
        }
        
        this.logger.info('Mencoba meninggalkan meeting Google Meet...');
        
        try {
            // Ambil screenshot sebelum meninggalkan meeting
            await this.takeScreenshot('before_leave');
            
            // Selectors untuk tombol keluar (leave/hangup)
            const leaveButtonSelectors = [
                'button[aria-label="Leave call"]',
                'button[data-tooltip="Leave call"]',
                'button[aria-label="Hang up"]',
                'button[data-tooltip="Hang up"]',
                '[aria-label="Leave call"]',
                '[data-tooltip="Leave call"]'
            ];
            
            // Klik tombol keluar
            await this.retry(async () => {
                for (const selector of leaveButtonSelectors) {
                    try {
                        this.logger.info(`Mencoba klik tombol keluar dengan selector: ${selector}`);
                        
                        // Cek apakah tombol ada
                        const buttonExists = await this.page.evaluate((sel) => {
                            const button = document.querySelector(sel);
                            return button !== null;
                        }, selector);
                        
                        if (buttonExists) {
                            await this.page.click(selector);
                            this.logger.info(`Berhasil klik tombol keluar dengan selector: ${selector}`);
                            
                            // Tunggu beberapa saat untuk memastikan proses keluar
                            await this.page.waitForTimeout(3000);
                            
                            // Ambil screenshot setelah keluar
                            await this.takeScreenshot('after_leave');
                            return true;
                        }
                    } catch (error) {
                        this.logger.error(`Gagal dengan selector ${selector}: ${error.message}`);
                    }
                }
                
                throw new Error('Tidak dapat menemukan tombol keluar yang valid');
            }, 'Klik tombol keluar');
            
            this.logger.info('Berhasil meninggalkan meeting Google Meet');
            return true;
        } catch (error) {
            this.logger.error(`Gagal meninggalkan meeting: ${error.message}`);
            await this.takeScreenshot('leave_error');
            throw error;
        }
    }
    
    // Menutup browser dan menyelesaikan sesi
    async close() {
        this.logger.info('Menutup sesi browser...');
        
        if (this.browser) {
            try {
                await this.browser.close();
                this.logger.info('Browser berhasil ditutup');
            } catch (error) {
                this.logger.error(`Gagal menutup browser: ${error.message}`);
                throw error;
            } finally {
                this.browser = null;
                this.page = null;
                this.isInitialized = false;
            }
        } else {
            this.logger.info('Browser sudah ditutup atau belum diinisialisasi');
        }
    }
}

module.exports = GoogleMeetBot;