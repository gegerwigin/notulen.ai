# Rencana Implementasi Bot Meeting Terpercaya

## Permasalahan yang Sering Muncul

1. Google Meet mendeteksi bot dan menolak akses
2. Gagal menyimpan cookies/session login Google
3. Masalah koneksi dan antar port di environment containerized (Cloud Run)
4. Timeout saat navigasi/joining meeting

## Pendekatan Baru (Tertarget)

Kita akan menggunakan pendekatan yang lebih terpercaya dengan memanfaatkan instance Lightsail yang telah dibuat (IP: 47.129.100.3):

### 1. Implementasi Puppeteer dengan Chrome Browser Asli

Kita akan menggunakan Chrome browser asli, bukan Chromium, untuk menghindari deteksi bot:

```javascript
// Implementasi untuk menghindari deteksi bot
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Plugin tambahan untuk manajemen cookies
const { executablePath } = require('puppeteer');

// Gunakan path Chrome asli
const browser = await puppeteer.launch({
  headless: "new",
  executablePath: '/usr/bin/google-chrome-stable',
  ignoreHTTPSErrors: true,
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
    '--disable-setuid-sandbox'
  ],
  defaultViewport: {
    width: 1920,
    height: 1080
  }
});
```

### 2. Persistent Session Storage

Menyimpan dan menggunakan cookies/session secara persistent:

```javascript
// Implementasi persistent cookie storage
const userDataDir = '/home/ubuntu/notula-bot/user-data-dir';
const sessionPath = '/home/ubuntu/notula-bot/session.json';
const fs = require('fs');

// Buat direktori jika belum ada
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

// Launch dengan user data dir tetap
const browser = await puppeteer.launch({
  // konfigurasi lainnya seperti di atas
  userDataDir,
});

// Simpan cookies setelah login berhasil
const saveCookies = async (page) => {
  const cookies = await page.cookies();
  fs.writeFileSync(sessionPath, JSON.stringify(cookies, null, 2));
  console.log('Session tersimpan!');
};

// Load cookies jika ada
const loadCookies = async (page) => {
  if (fs.existsSync(sessionPath)) {
    const cookies = JSON.parse(fs.readFileSync(sessionPath));
    await page.setCookie(...cookies);
    console.log('Session dimuat!');
    return true;
  }
  return false;
};
```

### 3. Login Otomatis dengan Retry

Implementasi login otomatis yang robust dengan mekanisme retry:

```javascript
const login = async (page, email, password, retries = 3) => {
  // Coba load cookies terlebih dulu
  const sessionLoaded = await loadCookies(page);
  
  // Cek apakah sudah login
  await page.goto('https://accounts.google.com', { waitUntil: 'networkidle2' });
  const isLoggedIn = await page.evaluate(() => {
    return document.body.textContent.includes('Welcome') || 
           document.body.textContent.includes('Selamat datang');
  });
  
  if (sessionLoaded && isLoggedIn) {
    console.log('Sudah login via cookies!');
    return true;
  }
  
  console.log('Login manual dimulai...');
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      await page.goto('https://accounts.google.com/signin', { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Input email
      await page.waitForSelector('input[type="email"]', { visible: true, timeout: 10000 });
      await page.type('input[type="email"]', email, { delay: 100 });
      await page.keyboard.press('Enter');
      
      // Wait for password field to appear and type password
      await page.waitForSelector('input[type="password"]', { visible: true, timeout: 15000 });
      await page.type('input[type="password"]', password, { delay: 100 });
      await page.keyboard.press('Enter');
      
      // Wait for redirect after login
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      // Verify login success
      const success = await page.evaluate(() => {
        return !document.querySelector('input[type="password"]');
      });
      
      if (success) {
        console.log('Login berhasil!');
        await saveCookies(page);
        return true;
      }
    } catch (error) {
      console.error(`Percobaan login #${attempt + 1} gagal:`, error.message);
    }
    
    attempt++;
    console.log(`Mencoba login lagi (${attempt}/${retries})...`);
    await page.waitForTimeout(3000); // Tunggu 3 detik sebelum retry
  }
  
  throw new Error('Gagal login setelah beberapa percobaan');
};
```

### 4. Join Meeting dengan Robust Error Handling

```javascript
const joinMeeting = async (page, meetingUrl) => {
  console.log(`Mencoba bergabung ke meeting: ${meetingUrl}`);
  
  try {
    // Buka URL meeting
    await page.goto(meetingUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Tunggu halaman meeting load
    await page.waitForTimeout(5000);
    
    // Cek apakah perlu login
    const needsAuth = await page.evaluate(() => {
      return document.body.textContent.includes('Sign in') || 
             document.body.textContent.includes('Masuk');
    });
    
    if (needsAuth) {
      console.log('Perlu login, redirecting...');
      // Klik tombol Sign in jika ada
      const signInButtonSelector = 'button:has-text("Sign in"), button:has-text("Masuk")';
      if (await page.$(signInButtonSelector)) {
        await page.click(signInButtonSelector);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      return false; // Perlu login
    }
    
    // Handle dialog pre-meeting
    console.log('Mematikan mikrofon dan kamera...');
    
    // Tunggu tombol microphone dan camera muncul
    await Promise.race([
      page.waitForSelector('button[aria-label*="microphone"], button[aria-label*="mikrofon"]', { timeout: 15000 }),
      page.waitForSelector('div[role="button"][aria-label*="microphone"], div[role="button"][aria-label*="mikrofon"]', { timeout: 15000 })
    ]);
    
    // Periksa dan matikan mikrofon jika belum mati
    const micSelector = 'button[aria-label*="microphone"], button[aria-label*="mikrofon"], div[role="button"][aria-label*="microphone"], div[role="button"][aria-label*="mikrofon"]';
    const isMicOn = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el && (el.getAttribute('aria-label').includes('Turn off') || 
                     el.getAttribute('aria-label').includes('Matikan'));
    }, micSelector);
    
    if (isMicOn) {
      console.log('Mematikan mikrofon...');
      await page.click(micSelector);
      await page.waitForTimeout(1000);
    }
    
    // Periksa dan matikan kamera jika belum mati
    const camSelector = 'button[aria-label*="camera"], button[aria-label*="kamera"], div[role="button"][aria-label*="camera"], div[role="button"][aria-label*="kamera"]';
    const isCamOn = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el && (el.getAttribute('aria-label').includes('Turn off') || 
                     el.getAttribute('aria-label').includes('Matikan'));
    }, camSelector);
    
    if (isCamOn) {
      console.log('Mematikan kamera...');
      await page.click(camSelector);
      await page.waitForTimeout(1000);
    }
    
    // Klik tombol Join atau "Minta untuk bergabung"
    console.log('Bergabung ke meeting...');
    const joinButtonSelector = 'button:has-text("Join now"), button:has-text("Gabung sekarang"), button:has-text("Ask to join"), button:has-text("Minta untuk bergabung")';
    
    if (await page.$(joinButtonSelector)) {
      await page.click(joinButtonSelector);
      console.log('Tombol bergabung diklik!');
    } else {
      console.log('Tombol bergabung tidak ditemukan.');
      // Terkadang ada dialog berbeda, coba tombol Join atau Gabung saja
      const alternateSelector = 'button:has-text("Join"), button:has-text("Gabung")';
      if (await page.$(alternateSelector)) {
        await page.click(alternateSelector);
        console.log('Tombol gabung alternatif diklik!');
      } else {
        throw new Error('Tidak dapat menemukan tombol untuk bergabung ke meeting');
      }
    }
    
    // Verifikasi berhasil bergabung (tunggu 20 detik)
    console.log('Menunggu konfirmasi bergabung...');
    await page.waitForTimeout(10000);
    
    // Cek apakah berhasil masuk meeting (biasanya ada UI controls meeting)
    const inMeeting = await page.evaluate(() => {
      // Cek adanya elemen yang biasanya muncul saat di dalam meeting
      const hasControls = !!document.querySelector('div[role="toolbar"]');
      const hasParticipantList = !!document.querySelector('button[aria-label*="participant"], button[aria-label*="peserta"]');
      const hasChatButton = !!document.querySelector('button[aria-label*="chat"], button[aria-label*="obrolan"]');
      
      return hasControls || hasParticipantList || hasChatButton;
    });
    
    if (inMeeting) {
      console.log('Berhasil bergabung ke meeting!');
      return true;
    } else {
      throw new Error('Tidak dapat memverifikasi keberhasilan bergabung ke meeting');
    }
    
  } catch (error) {
    console.error('Error saat mencoba bergabung ke meeting:', error.message);
    // Tambahkan screenshot untuk debugging
    await page.screenshot({ path: 'error-join-meeting.png', fullPage: true });
    throw error;
  }
};
```

### 5. Struktur API Server yang Improved

```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;
const API_KEY = process.env.BOT_API_KEY || 'notulen-ai-bot-key-2024';

// State management (dalam produksi sebaiknya gunakan database)
const activeSessions = new Map();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Auth middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  const token = authHeader.substring(7);
  
  if (token !== API_KEY) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid API key' 
    });
  }
  
  next();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', version: '1.0.0' });
});

// Join meeting endpoint
app.post('/api/join-meeting', authenticate, async (req, res) => {
  const { url } = req.body;
  
  // Validate input
  if (!url || !url.includes('meet.google.com')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid meeting URL. Must contain meet.google.com'
    });
  }
  
  const sessionId = Date.now().toString();
  
  // Create new session
  activeSessions.set(sessionId, {
    url,
    state: 'joining',
    startTime: Date.now(),
    transcript: '',
    browser: null,
    page: null
  });
  
  // Start meeting join process in background
  joinMeetingProcess(sessionId, url)
    .catch(error => {
      console.error(`[Session ${sessionId}] Error:`, error.message);
      
      const session = activeSessions.get(sessionId);
      if (session) {
        session.state = 'error';
        session.error = error.message;
      }
    });
  
  res.json({ 
    success: true, 
    sessionId, 
    message: 'Joining meeting process started' 
  });
});

// Get meeting status endpoint
app.get('/api/meeting-status/:sessionId', authenticate, (req, res) => {
  const { sessionId } = req.params;
  
  if (!activeSessions.has(sessionId)) {
    return res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }
  
  const session = activeSessions.get(sessionId);
  
  res.json({
    success: true,
    status: {
      state: session.state,
      startTime: session.startTime,
      transcript: session.transcript,
      error: session.error
    }
  });
});

// Leave meeting endpoint
app.post('/api/leave-meeting/:sessionId', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  
  if (!activeSessions.has(sessionId)) {
    return res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }
  
  const session = activeSessions.get(sessionId);
  
  try {
    if (session.browser) {
      await session.browser.close();
    }
    
    session.state = 'completed';
    
    res.json({
      success: true,
      message: 'Left meeting successfully'
    });
  } catch (error) {
    console.error(`[Session ${sessionId}] Error leaving meeting:`, error.message);
    
    res.status(500).json({
      success: false,
      message: 'Error leaving meeting: ' + error.message
    });
  }
});

// Implementasi async proses untuk join meeting
async function joinMeetingProcess(sessionId, meetingUrl) {
  // Get session
  const session = activeSessions.get(sessionId);
  if (!session) return;
  
  try {
    // Launch browser
    const browser = await puppeteer.launch({
      // konfigurasi seperti sebelumnya
    });
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
      
      // Start recording transcript (contoh sederhana)
      recordTranscript(sessionId, page);
    } else {
      throw new Error('Failed to join meeting');
    }
  } catch (error) {
    session.state = 'error';
    session.error = error.message;
    
    // Close browser if error
    if (session.browser) {
      await session.browser.close();
    }
    
    throw error;
  }
}

// Fungsi untuk merekam transkrip
async function recordTranscript(sessionId, page) {
  const session = activeSessions.get(sessionId);
  if (!session) return;
  
  // Cek transcript setiap 10 detik
  const intervalId = setInterval(async () => {
    try {
      // Contoh sederhana: cek subtitles/captions
      const transcript = await page.evaluate(() => {
        const captionsElement = document.querySelector('div[jsname="tgaKEf"]') || 
                               document.querySelector('.VbkSUe');
        
        return captionsElement ? captionsElement.textContent : '';
      });
      
      if (transcript) {
        session.transcript += transcript + '\n';
      }
    } catch (error) {
      console.error(`[Session ${sessionId}] Error recording transcript:`, error.message);
    }
  }, 10000);
  
  // Simpan intervalId untuk bisa dihentikan nanti
  session.intervalId = intervalId;
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Rencana Implementasi

1. Remote ke Lightsail dengan IP 47.129.100.3 menggunakan key PEM yang sudah diunduh
2. Deploy kode server-api.js dan meet-bot-stealth.js dengan pendekatan terpercaya di atas
3. Validasi format JSON di semua request
4. Gunakan persistent session dan persistent user data directory
5. Implementasi retry mechanism untuk semua operasi kritis
6. Tambahkan logging komprehensif untuk troubleshooting
7. Tambahkan screenshot otomatis saat error untuk debugging

## Integrasi Frontend

Frontend di `/dashboard/meeting-bot` akan terhubung ke bot melalui API yang diexpose oleh Lightsail:

1. URL API endpoint: `http://47.129.100.3:8080/api`
2. API Key: `notulen-ai-bot-key-2024`
3. Format request:
   ```json
   {
     "url": "https://meet.google.com/xxx-xxxx-xxx"
   }
   ```

## Testing

1. Pertama, tes health endpoint: `GET http://47.129.100.3:8080/api/health`
2. Minta link meeting baru untuk tes (karena link meeting bisa kadaluarsa)
3. Tes join meeting dengan API: `POST http://47.129.100.3:8080/api/join-meeting`
4. Verifikasi status: `GET http://47.129.100.3:8080/api/meeting-status/:sessionId`
5. Pantau log secara realtime untuk debugging

## Troubleshooting

1. Jika ada error "Navigation timeout", periksa:
   - Network connectivity dari Lightsail
   - Memory usage (tambahkan swap jika diperlukan)
   - Periksa Google login state

2. Jika Google mendeteksi sebagai bot:
   - Gunakan pendekatan stealth plugin
   - Login manual sekali dari Lightsail dan simpan cookies
   - Gunakan user agent yang umum

3. Jika ada error koneksi antar port:
   - Pastikan port 8080 terbuka di firewall Lightsail
   - Verifikasi tidak ada reverse proxy yang memblokir koneksi

## Verifikasi Akhir

1. Bot dapat bergabung ke meeting Google Meet
2. Bot dapat menangkap transkrip/diskusi dalam meeting
3. API menyediakan endpoint yang stabil untuk frontend
4. Tidak ada masalah autentikasi Google yang terulang
5. Solusi robust terhadap error dan dapat recovery 