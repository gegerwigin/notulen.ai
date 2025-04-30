const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { executablePath } = require('puppeteer');

// Plugin untuk menghindari deteksi bot
puppeteer.use(StealthPlugin());

// Konfigurasi direktori dan file
const DATA_DIR = path.join(__dirname, 'data');
const USER_DATA_DIR = path.join(DATA_DIR, 'user-data-dir');
const SESSION_PATH = path.join(DATA_DIR, 'session.json');
const SCREENSHOT_DIR = path.join(DATA_DIR, 'screenshots');
const LOG_DIR = path.join(__dirname, 'logs');

// Pastikan semua direktori ada
[DATA_DIR, USER_DATA_DIR, SCREENSHOT_DIR, LOG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Setup logging
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(path.join(LOG_DIR, 'meet-bot.log'), logMessage);
  console.log(message);
};

// Ambil screenshot untuk debugging
const takeScreenshot = async (page, name) => {
  try {
    const timestamp = Date.now();
    const filename = `${name}-${timestamp}.png`;
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, filename),
      fullPage: true 
    });
    logToFile(`Screenshot saved: ${filename}`);
    return filename;
  } catch (error) {
    logToFile(`Error taking screenshot: ${error.message}`);
    return null;
  }
};

// Simpan cookies setelah login berhasil
const saveCookies = async (page) => {
  try {
    const cookies = await page.cookies();
    fs.writeFileSync(SESSION_PATH, JSON.stringify(cookies, null, 2));
    logToFile('Session cookies tersimpan!');
  } catch (error) {
    logToFile(`Error saving cookies: ${error.message}`);
  }
};

// Load cookies jika ada
const loadCookies = async (page) => {
  try {
    if (fs.existsSync(SESSION_PATH)) {
      const cookies = JSON.parse(fs.readFileSync(SESSION_PATH));
      await page.setCookie(...cookies);
      logToFile('Session cookies dimuat!');
      return true;
    }
  } catch (error) {
    logToFile(`Error loading cookies: ${error.message}`);
  }
  return false;
};

// Login ke Google
const login = async (page, email, password, retries = 3) => {
  logToFile('Memulai proses login Google');

  // Coba load cookies terlebih dulu
  const sessionLoaded = await loadCookies(page);
  
  // Cek apakah sudah login
  await page.goto('https://accounts.google.com', { 
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  await takeScreenshot(page, 'google-accounts-initial');
  
  const isLoggedIn = await page.evaluate(() => {
    return document.body.textContent.includes('Welcome') || 
           document.body.textContent.includes('Selamat datang') ||
           document.querySelector('a[aria-label*="Google Account"]');
  });
  
  if (sessionLoaded && isLoggedIn) {
    logToFile('Sudah login via cookies!');
    return true;
  }
  
  logToFile('Login manual dimulai...');
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      await page.goto('https://accounts.google.com/signin', { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
      });
      
      await takeScreenshot(page, `login-attempt-${attempt+1}-start`);
      
      // Input email
      await page.waitForSelector('input[type="email"]', { visible: true, timeout: 10000 });
      await page.type('input[type="email"]', email, { delay: 100 });
      await page.keyboard.press('Enter');
      
      // Wait untuk halaman password
      await page.waitForSelector('input[type="password"]', { visible: true, timeout: 15000 });
      await takeScreenshot(page, `login-attempt-${attempt+1}-password-page`);
      
      // Input password
      await page.type('input[type="password"]', password, { delay: 100 });
      await page.keyboard.press('Enter');
      
      // Wait for redirect setelah login
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      await takeScreenshot(page, `login-attempt-${attempt+1}-post-login`);
      
      // Verifikasi login berhasil
      const success = await page.evaluate(() => {
        return !document.querySelector('input[type="password"]');
      });
      
      if (success) {
        logToFile('Login berhasil!');
        await saveCookies(page);
        return true;
      }
    } catch (error) {
      logToFile(`Percobaan login #${attempt + 1} gagal: ${error.message}`);
      await takeScreenshot(page, `login-attempt-${attempt+1}-error`);
    }
    
    attempt++;
    logToFile(`Mencoba login lagi (${attempt}/${retries})...`);
    await page.waitForTimeout(3000); // Tunggu 3 detik sebelum retry
  }
  
  throw new Error('Gagal login setelah beberapa percobaan');
};

// Join meeting
const joinMeeting = async (page, meetingUrl) => {
  logToFile(`Mencoba bergabung ke meeting: ${meetingUrl}`);
  
  try {
    // Buka URL meeting
    logToFile('Navigasi ke URL meeting...');
    await page.goto(meetingUrl, { waitUntil: 'networkidle2', timeout: 90000 });
    await takeScreenshot(page, 'meeting-page-initial');
    
    // Tunggu halaman meeting load
    await page.waitForTimeout(5000);
    
    // Cek apakah perlu login
    const needsAuth = await page.evaluate(() => {
      return document.body.textContent.includes('Sign in') || 
             document.body.textContent.includes('Masuk');
    });
    
    if (needsAuth) {
      logToFile('Perlu login, redirecting...');
      await takeScreenshot(page, 'meeting-needs-auth');
      
      // Klik tombol Sign in jika ada
      const signInButtonSelector = 'button:has-text("Sign in"), button:has-text("Masuk")';
      if (await page.$(signInButtonSelector)) {
        await page.click(signInButtonSelector);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        return false; // Perlu login
      }
    }
    
    // Wait for pre-meeting UI to load
    logToFile('Menunggu UI pre-meeting...');
    await page.waitForTimeout(5000);
    await takeScreenshot(page, 'pre-meeting-ui');
    
    // Handle dialog pre-meeting
    logToFile('Mematikan mikrofon dan kamera...');
    
    try {
      // Tunggu tombol microphone dan camera muncul
      await Promise.race([
        page.waitForSelector('div[role="button"][data-is-muted="false"]', { timeout: 15000 }),
        page.waitForSelector('button[aria-label*="microphone"], button[aria-label*="mikrofon"]', { timeout: 15000 }),
        page.waitForSelector('div[role="button"][aria-label*="microphone"], div[role="button"][aria-label*="mikrofon"]', { timeout: 15000 })
      ]);
      
      // Coba berbagai selector untuk mikrofon
      const micSelectors = [
        'div[role="button"][data-is-muted="false"]',
        'button[aria-label*="microphone"], button[aria-label*="mikrofon"]',
        'div[role="button"][aria-label*="microphone"], div[role="button"][aria-label*="mikrofon"]'
      ];
      
      // Coba klik setiap selector
      for (const selector of micSelectors) {
        if (await page.$(selector)) {
          logToFile(`Mencoba klik mikrofon dengan selector: ${selector}`);
          await page.click(selector);
          await page.waitForTimeout(1000);
          break;
        }
      }
      
      // Sama untuk kamera
      const camSelectors = [
        'div[role="button"][data-is-muted="false"][aria-label*="camera"], div[role="button"][data-is-muted="false"][aria-label*="kamera"]',
        'button[aria-label*="camera"], button[aria-label*="kamera"]',
        'div[role="button"][aria-label*="camera"], div[role="button"][aria-label*="kamera"]'
      ];
      
      for (const selector of camSelectors) {
        if (await page.$(selector)) {
          logToFile(`Mencoba klik kamera dengan selector: ${selector}`);
          await page.click(selector);
          await page.waitForTimeout(1000);
          break;
        }
      }
    } catch (error) {
      logToFile(`Warning: Gagal menonaktifkan mic/camera: ${error.message}`);
      // Lanjut ke step berikutnya meskipun gagal mematikan mic/camera
    }
    
    await takeScreenshot(page, 'post-mic-camera-setup');
    
    // Klik tombol Join
    logToFile('Mencoba klik tombol bergabung...');
    const joinButtonSelectors = [
      'button:has-text("Join now")', 
      'button:has-text("Gabung sekarang")', 
      'button:has-text("Ask to join")', 
      'button:has-text("Minta untuk bergabung")',
      'button[aria-label*="Join now"]',
      'button[aria-label*="Gabung sekarang"]',
      'button[jsname="Qx7uuf"]'
    ];
    
    let joinButtonClicked = false;
    
    for (const selector of joinButtonSelectors) {
      try {
        if (await page.$(selector)) {
          logToFile(`Mengklik tombol bergabung dengan selector: ${selector}`);
          await page.click(selector);
          joinButtonClicked = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch (error) {
        logToFile(`Gagal klik tombol ${selector}: ${error.message}`);
      }
    }
    
    if (!joinButtonClicked) {
      logToFile('Tidak dapat menemukan tombol bergabung yang standar, mencoba fallback...');
      await takeScreenshot(page, 'join-button-not-found');
      
      // Fallback untuk selector yang berbeda
      const alternateSelectors = [
        'button:has-text("Join")', 
        'button:has-text("Gabung")',
        'button[jsname="BOHaEe"]',
        'button[jscontroller="soHxf"]'
      ];
      
      for (const selector of alternateSelectors) {
        try {
          if (await page.$(selector)) {
            logToFile(`Mengklik tombol gabung alternatif: ${selector}`);
            await page.click(selector);
            joinButtonClicked = true;
            break;
          }
        } catch (error) {
          logToFile(`Gagal klik tombol alternatif ${selector}: ${error.message}`);
        }
      }
    }
    
    if (!joinButtonClicked) {
      throw new Error('Tidak dapat menemukan tombol untuk bergabung ke meeting');
    }
    
    // Verifikasi berhasil bergabung (tunggu 20 detik)
    logToFile('Menunggu konfirmasi bergabung...');
    await page.waitForTimeout(20000);
    await takeScreenshot(page, 'post-join-click');
    
    // Cek apakah berhasil masuk meeting 
    const inMeeting = await page.evaluate(() => {
      // Cek berbagai elemen yang menandakan berada dalam meeting
      const hasControls = !!document.querySelector('div[role="toolbar"]');
      const hasParticipantList = !!document.querySelector('[aria-label*="participant"], [aria-label*="peserta"]');
      const hasChatButton = !!document.querySelector('[aria-label*="chat"], [aria-label*="obrolan"]');
      const hasMeetingTime = !!document.querySelector('[role="timer"]');
      const hasEndCallButton = !!document.querySelector('[aria-label*="Leave call"], [aria-label*="Tinggalkan panggilan"]');
      
      return hasControls || hasParticipantList || hasChatButton || hasMeetingTime || hasEndCallButton;
    });
    
    if (inMeeting) {
      logToFile('Berhasil bergabung ke meeting!');
      await takeScreenshot(page, 'in-meeting-confirmed');
      return true;
    } else {
      logToFile('Gagal verifikasi bergabung ke meeting');
      await takeScreenshot(page, 'join-verification-failed');
      throw new Error('Tidak dapat memverifikasi keberhasilan bergabung ke meeting');
    }
    
  } catch (error) {
    logToFile(`Error saat mencoba bergabung ke meeting: ${error.message}`);
    await takeScreenshot(page, 'error-join-meeting');
    throw error;
  }
};

// Rekam transkrip dari meeting
const recordTranscript = async (sessionId, page, activeSessions) => {
  const session = activeSessions.get(sessionId);
  if (!session) return;
  
  logToFile(`Memulai rekaman transkrip untuk sesi ${sessionId}`);
  
  // Cek transcript setiap 10 detik
  const intervalId = setInterval(async () => {
    try {
      // Cek subtitle/caption
      const transcript = await page.evaluate(() => {
        // Berbagai selector untuk captions/subtitles di Google Meet
        const captionsElements = [
          document.querySelector('div[jsname="tgaKEf"]'),
          document.querySelector('.VbkSUe'),
          document.querySelector('.a4cQT'),
          document.querySelector('[jsname="r4nke"]'),
          document.querySelector('[data-message-text]')
        ];
        
        // Ambil teks dari elemen yang ditemukan
        for (const el of captionsElements) {
          if (el && el.textContent.trim()) {
            return el.textContent.trim();
          }
        }
        
        return '';
      });
      
      if (transcript && transcript.length > 0) {
        const timestamp = new Date().toISOString();
        session.transcript += `[${timestamp}] ${transcript}\n`;
        logToFile(`Transkrip ditemukan: ${transcript.substring(0, 50)}...`);
      }
    } catch (error) {
      logToFile(`Error saat merekam transkrip (${sessionId}): ${error.message}`);
    }
  }, 10000);
  
  // Simpan intervalId untuk bisa dihentikan nanti
  session.intervalId = intervalId;
};

// Implementasi Bot dengan interface yang bersih
const meetBot = {
  // Launch browser dengan semua konfigurasi yang diperlukan
  async launchBrowser() {
    logToFile('Launching browser dengan konfigurasi terpercaya');
    
    try {
      const browser = await puppeteer.launch({
        headless: "new",
        executablePath: '/usr/bin/google-chrome-stable',
        ignoreHTTPSErrors: true,
        userDataDir: USER_DATA_DIR,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--autoplay-policy=no-user-gesture-required',
          `--window-size=1920,1080`,
          '--start-maximized',
          '--disable-extensions',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-gpu',
          '--mute-audio',
          '--disable-setuid-sandbox'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      });
      
      logToFile('Browser berhasil diluncurkan');
      return browser;
    } catch (error) {
      logToFile(`Error launching browser: ${error.message}`);
      throw error;
    }
  },
  
  // Proses bergabung ke meeting
  async joinMeeting(sessionId, meetingUrl, activeSessions) {
    logToFile(`Starting join meeting process for session ${sessionId}`);
    
    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    try {
      // Launch browser
      const browser = await this.launchBrowser();
      session.browser = browser;
      
      // Buka halaman baru
      const page = await browser.newPage();
      session.page = page;
      
      // Set user agent desktop
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      
      // Login ke Google
      const loggedIn = await login(page, 'bot@notula.ai', '1sampai9');
      
      if (!loggedIn) {
        throw new Error('Failed to login to Google account');
      }
      
      // Join meeting
      const joined = await joinMeeting(page, meetingUrl);
      
      if (joined) {
        session.state = 'joined';
        
        // Start recording transcript
        recordTranscript(sessionId, page, activeSessions);
        
        logToFile(`Session ${sessionId} successfully joined the meeting`);
      } else {
        throw new Error('Failed to join meeting');
      }
    } catch (error) {
      session.state = 'error';
      session.error = error.message;
      logToFile(`Error in joinMeeting process: ${error.message}`);
      
      // Close browser if error
      if (session.browser) {
        await session.browser.close();
      }
      
      throw error;
    }
  },
  
  // Tinggalkan meeting
  async leaveMeeting(sessionId, activeSessions) {
    logToFile(`Leaving meeting for session ${sessionId}`);
    
    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    try {
      // Hentikan interval recording
      if (session.intervalId) {
        clearInterval(session.intervalId);
        session.intervalId = null;
      }
      
      // Klik tombol Leave jika masih di meeting
      if (session.page) {
        try {
          // Simpan transkrip ke file
          const transcriptFile = path.join(DATA_DIR, `transcript-${sessionId}.txt`);
          fs.writeFileSync(transcriptFile, session.transcript || 'No transcript recorded');
          logToFile(`Transcript saved to ${transcriptFile}`);
          
          const hangupSelectors = [
            '[aria-label="Leave call"], [aria-label="Tinggalkan panggilan"]',
            'button[jsname="CQylAd"]',
            'div[jscontroller="lCGUBd"]'
          ];
          
          for (const selector of hangupSelectors) {
            if (await session.page.$(selector)) {
              logToFile(`Clicking leave call button with selector: ${selector}`);
              await session.page.click(selector);
              await session.page.waitForTimeout(2000);
              break;
            }
          }
        } catch (error) {
          logToFile(`Error during manual leave: ${error.message}`);
          // Continue to browser close even if this fails
        }
      }
      
      // Tutup browser
      if (session.browser) {
        await session.browser.close();
        session.browser = null;
        session.page = null;
      }
      
      logToFile(`Successfully left meeting for session ${sessionId}`);
    } catch (error) {
      logToFile(`Error leaving meeting: ${error.message}`);
      throw error;
    }
  }
};

module.exports = { meetBot }; 