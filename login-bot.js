const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Konfigurasi login
const config = {
    email: 'notula.ai2025@gmail.com',
    password: '1sampai9',
    chromeHost: 'localhost',
    chromePort: '3001',
    cookiesPath: path.join(__dirname, 'logs', 'cookies.json'),
    logsDir: path.join(__dirname, 'logs')
};

// Pastikan direktori logs ada
if (!fs.existsSync(config.logsDir)) {
    fs.mkdirSync(config.logsDir, { recursive: true });
}

async function login() {
    console.log('Memulai proses login...');
    
    let browser;
    
    try {
        // Koneksi ke browserless/chrome
        console.log(`Menghubungkan ke browserless/chrome di ws://${config.chromeHost}:${config.chromePort}...`);
        
        browser = await puppeteer.connect({
            browserWSEndpoint: `ws://${config.chromeHost}:${config.chromePort}`,
            defaultViewport: { width: 1280, height: 720 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream'
            ]
        });
        
        console.log('Berhasil terhubung ke browserless/chrome');
        
        // Buat halaman baru
        const page = await browser.newPage();
        
        // Set user agent untuk menghindari deteksi bot
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        // Set izin browser
        const context = browser.defaultBrowserContext();
        await context.overridePermissions('https://meet.google.com', ['camera', 'microphone', 'notifications']);
        
        // Bypass webdriver checks dan berikan mock media devices
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            delete navigator.__proto__.webdriver;
            
            // Bypass notifications
            const originalPermissionQuery = navigator.permissions?.query;
            if (originalPermissionQuery) {
                navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalPermissionQuery(parameters)
                );
            }
            
            // Override media devices
            if (!navigator.mediaDevices) {
                navigator.mediaDevices = {};
            }
            
            navigator.mediaDevices.enumerateDevices = async () => [
                { deviceId: 'default', kind: 'audioinput', label: 'Default Audio Device', groupId: 'default' },
                { deviceId: 'default', kind: 'videoinput', label: 'Default Video Device', groupId: 'default' }
            ];
            
            navigator.mediaDevices.getUserMedia = async (constraints) => {
                const video = constraints?.video ? {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 }
                } : false;
                
                return {
                    getTracks: () => [
                        {
                            enabled: true,
                            id: 'mock-video-track',
                            kind: 'video',
                            label: 'Mock Video Device',
                            stop: () => {}
                        },
                        {
                            enabled: true,
                            id: 'mock-audio-track',
                            kind: 'audio',
                            label: 'Mock Audio Device',
                            stop: () => {}
                        }
                    ],
                    getVideoTracks: () => [
                        {
                            enabled: true,
                            id: 'mock-video-track',
                            kind: 'video',
                            label: 'Mock Video Device',
                            stop: () => {}
                        }
                    ],
                    getAudioTracks: () => [
                        {
                            enabled: true,
                            id: 'mock-audio-track',
                            kind: 'audio',
                            label: 'Mock Audio Device',
                            stop: () => {}
                        }
                    ]
                };
            };
        });
        
        // Navigasi ke halaman login Google
        console.log('Navigasi ke halaman login Google...');
        await page.goto('https://accounts.google.com/signin', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });
        
        // Ambil screenshot untuk debugging
        await page.screenshot({ path: path.join(config.logsDir, 'login-page.png'), fullPage: true });
        
        // Input email
        console.log(`Menginput email: ${config.email}...`);
        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', config.email);
        
        // Klik next
        await page.click('#identifierNext');
        await new Promise(r => setTimeout(r, 3000)); // Delay untuk animasi
        
        // Ambil screenshot setelah input email
        await page.screenshot({ path: path.join(config.logsDir, 'after-email.png'), fullPage: true });
        
        // Tunggu dan input password
        console.log('Menunggu form password...');
        await page.waitForSelector('input[type="password"]', { visible: true, timeout: 10000 });
        await new Promise(r => setTimeout(r, 2000)); // Delay untuk animasi
        
        // Input password
        console.log('Menginput password...');
        await page.type('input[type="password"]', config.password);
        await new Promise(r => setTimeout(r, 1000));
        
        // Ambil screenshot sebelum klik login
        await page.screenshot({ path: path.join(config.logsDir, 'before-login.png'), fullPage: true });
        
        // Klik login button
        await page.click('#passwordNext');
        
        // Tunggu proses login
        console.log('Menunggu proses login selesai...');
        await new Promise(r => setTimeout(r, 10000));
        
        // Ambil screenshot setelah login
        await page.screenshot({ path: path.join(config.logsDir, 'after-login.png'), fullPage: true });
        
        // Cek apakah login berhasil
        const url = page.url();
        console.log(`URL setelah login: ${url}`);
        
        if (url.includes('myaccount.google.com') || 
            url.includes('accounts.google.com/signin/v2/challenge') || 
            !url.includes('accounts.google.com/signin')) {
            console.log('Login berhasil!');
            
            // Navigasi ke Google untuk memastikan cookies terekam dengan baik
            await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
            await page.screenshot({ path: path.join(config.logsDir, 'google-home.png'), fullPage: true });
            
            // Verifikasi cookie Google yang penting
            const cookies = await page.cookies();
            const googleAuthCookies = cookies.filter(cookie => 
                cookie.domain.includes('google.com') && 
                ['SID', 'SSID', 'HSID', 'APISID', 'SAPISID'].includes(cookie.name)
            );
            
            if (googleAuthCookies.length > 0) {
                console.log(`Ditemukan ${googleAuthCookies.length} cookies otentikasi Google yang penting`);
            } else {
                console.log('Peringatan: Tidak menemukan cookies otentikasi Google yang penting');
            }
            
            // Simpan cookies
            fs.writeFileSync(config.cookiesPath, JSON.stringify(cookies, null, 2));
            console.log(`${cookies.length} cookies berhasil disimpan ke ${config.cookiesPath}`);
            
            // Cek akses ke Google Meet untuk memastikan bisa bergabung meeting
            try {
                console.log('Mencoba mengakses Google Meet untuk verifikasi...');
                await page.goto('https://meet.google.com/', { waitUntil: 'networkidle2' });
                await page.screenshot({ path: path.join(config.logsDir, 'meet-home.png'), fullPage: true });
                
                // Cek apakah halaman meminta izin kamera/mikrofon
                const permissionDialog = await page.$('div[role="dialog"]');
                if (permissionDialog) {
                    console.log('Dialog izin terdeteksi, mencoba mengizinkan...');
                    const allowButton = await page.$('button[jsname="j6LnYe"]');
                    if (allowButton) {
                        await allowButton.click();
                        console.log('Berhasil mengizinkan akses kamera/mikrofon');
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
                
                console.log('Verifikasi Google Meet selesai');
            } catch (meetError) {
                console.error(`Error saat mengakses Google Meet: ${meetError.message}`);
            }
            
            return true;
        } else {
            console.log('Login gagal! Masih berada di halaman login');
            await page.screenshot({ path: path.join(config.logsDir, 'login-failed.png'), fullPage: true });
            return false;
        }
    } catch (error) {
        console.error(`Error saat login: ${error.message}`);
        return false;
    } finally {
        if (browser) {
            await browser.disconnect();
            console.log('Browser disconnected');
        }
    }
}

// Eksekusi login
login()
    .then(success => {
        if (success) {
            console.log('Proses login berhasil!');
        } else {
            console.log('Proses login gagal!');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error(`Error tidak terduga: ${error.message}`);
        process.exit(1);
    }); 