#!/bin/bash

# Script untuk login manual ke Google di Lightsail instance
# Harus dijalankan di instance Lightsail

# Pastikan Chrome terinstall
if ! command -v google-chrome-stable &> /dev/null
then
    echo "Chrome tidak terinstall, menginstall..."
    sudo apt update
    sudo apt install -y xvfb pulseaudio libxss1 libappindicator1 libasound2 \
      libatk-bridge2.0-0 libgtk-3-0 libnss3 libx11-xcb1 libxcomposite1 \
      libxcursor1 libxdamage1 libxfixes3 libxi6 libxrandr2 libxss1 libxtst6 \
      fonts-liberation libgbm1 libu2f-udev libvulkan1 unzip wget curl
      
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    sudo apt install -y ./google-chrome-stable_current_amd64.deb
fi

# Pastikan direktori untuk menyimpan cookies ada
mkdir -p ~/notula-bot/data

# Jalankan script NodeJS untuk login manual dan menyimpan cookies
cat > login-manual.js << 'EOL'
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Use stealth plugin
puppeteer.use(StealthPlugin());

// Configuration
const USER_DATA_DIR = path.join(__dirname, 'data', 'user-data-dir');
const SESSION_PATH = path.join(__dirname, 'data', 'session.json');
const SCREENSHOT_DIR = path.join(__dirname, 'data', 'screenshots');

// Ensure directories exist
[USER_DATA_DIR, SCREENSHOT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Save screenshot helper
const saveScreenshot = async (page, name) => {
  const filename = `${name}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`Screenshot saved: ${filepath}`);
  return filename;
};

// Save cookies
const saveCookies = async (page) => {
  try {
    const cookies = await page.cookies();
    fs.writeFileSync(SESSION_PATH, JSON.stringify(cookies, null, 2));
    console.log(`Cookies saved to ${SESSION_PATH}`);
  } catch (error) {
    console.error('Error saving cookies:', error.message);
  }
};

// Main function
async function loginManually() {
  console.log('Starting manual login process...');
  console.log(`Using user data directory: ${USER_DATA_DIR}`);
  
  const browser = await puppeteer.launch({
    headless: false, // Set headless: false untuk login manual
    executablePath: '/usr/bin/google-chrome-stable',
    ignoreHTTPSErrors: true,
    userDataDir: USER_DATA_DIR,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1280,720',
      '--disable-gpu',
      '--start-maximized'
    ],
    defaultViewport: {
      width: 1280,
      height: 720
    }
  });
  
  try {
    const page = await browser.newPage();
    
    // Set desktop user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    
    // First, go to Google Accounts
    console.log('Navigating to Google Accounts...');
    await page.goto('https://accounts.google.com', { waitUntil: 'networkidle2' });
    await saveScreenshot(page, 'google-accounts');
    
    // Wait for manual login
    console.log('\n=== INSTRUKSI MANUAL LOGIN ===');
    console.log('1. Login dengan akun: bot@notula.ai / 1sampai9');
    console.log('2. Setelah login berhasil, Anda akan diarahkan ke halaman My Account Google');
    console.log('3. Kemudian buka Google Meet dengan memasukkan alamat: https://meet.google.com');
    console.log('4. Setelah berhasil masuk ke halaman Google Meet, cookies akan tersimpan otomatis\n');
    
    // Wait for Google Meet
    console.log('Menunggu navigasi ke Google Meet...');
    
    // Set a timeout for waiting for the Meet page
    let meetPageLoaded = false;
    
    const meetPageWatcher = async () => {
      while (!meetPageLoaded) {
        const url = await page.url();
        if (url.includes('meet.google.com')) {
          console.log('Google Meet terdeteksi! Menunggu 5 detik untuk memastikan halaman terload...');
          await page.waitForTimeout(5000);
          await saveScreenshot(page, 'google-meet-loaded');
          await saveCookies(page);
          meetPageLoaded = true;
          break;
        }
        await page.waitForTimeout(2000);
      }
    };
    
    // Start the watcher
    meetPageWatcher();
    
    // Wait for 5 minutes maximum
    await page.waitForTimeout(5 * 60 * 1000);
    
    if (!meetPageLoaded) {
      console.log('Timeout: Google Meet tidak terdeteksi dalam 5 menit.');
    }
    
    // Final prompt
    console.log('\nProses login manual selesai.');
    console.log('Cookies sudah disimpan ke:', SESSION_PATH);
    console.log('User data directory:', USER_DATA_DIR);
    console.log('\nTekan CTRL+C untuk keluar dari script.\n');
    
    // Keep the browser open for manual inspection
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('Error during manual login:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the main function
loginManually().catch(console.error);
EOL

# Pastikan dependencies terinstall
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
fi

# Jalankan script
node login-manual.js

echo "Jika proses login manual berhasil, cookies sudah tersimpan dan bisa digunakan oleh bot."
echo "Anda bisa menjalankan server bot dengan command:"
echo "cd ~/notula-bot && pm2 start ecosystem.config.js 