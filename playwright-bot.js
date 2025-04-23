const { chromium } = require('playwright-core');

class GoogleMeetBot {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    try {
      console.log('Menginisialisasi bot dengan Playwright...');
      
      // Konfigurasi browser minimal
      this.browser = await chromium.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
        ]
      });
      
      console.log('Browser berhasil dijalankan');
      const context = await this.browser.newContext({
        viewport: { width: 800, height: 600 },
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      this.page = await context.newPage();
      console.log('Halaman berhasil dibuat');
      
      console.log('Bot berhasil diinisialisasi');
    } catch (error) {
      console.error('[GoogleMeetBot] Gagal inisialisasi:', error);
      throw error;
    }
  }

  async delay(ms) {
    console.log(`Menunggu ${ms}ms...`);
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async joinMeeting(meetingUrl) {
    try {
      console.log(`Persiapan bergabung meeting: ${meetingUrl}`);
      
      // Coba akses halaman Google dulu
      try {
        console.log('Mengakses halaman Google terlebih dahulu...');
        await this.page.goto('https://google.com', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        console.log('Halaman Google berhasil dimuat');
      } catch (e) {
        console.error('Gagal memuat halaman Google:', e.message);
      }
      
      await this.delay(2000);
      
      // Akses URL meeting
      console.log(`Mengakses URL meeting: ${meetingUrl}`);
      await this.page.goto(meetingUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      console.log('Halaman meeting berhasil dimuat');
      
      // Ambil judul halaman
      const title = await this.page.title();
      console.log('Judul halaman:', title);
      
      // Tunggu beberapa detik untuk elemen UI dimuat
      await this.delay(5000);
      
      // Coba ambil screenshot
      try {
        await this.page.screenshot({ path: 'meet-screenshot.png' });
        console.log('Screenshot berhasil diambil');
      } catch (e) {
        console.log('Gagal mengambil screenshot:', e.message);
      }
      
      // Coba klik tombol untuk mematikan kamera dan mikrofon
      try {
        // Selectors untuk kamera dan mikrofon berbeda dengan Puppeteer
        const cameraSelector = '[data-is-muted="false"][data-tooltip*="camera"]';
        const micSelector = '[data-is-muted="false"][data-tooltip*="microphone"]';
        
        if (await this.page.$(cameraSelector)) {
          await this.page.click(cameraSelector);
          console.log('Kamera dimatikan');
        }
        
        if (await this.page.$(micSelector)) {
          await this.page.click(micSelector);
          console.log('Mikrofon dimatikan');
        }
      } catch (e) {
        console.log('Kamera/mikrofon mungkin sudah mati:', e.message);
      }
      
      // Selectors untuk tombol bergabung
      const joinButtons = [
        'button:has-text("Join now")',
        'button:has-text("Ask to join")',
        'button[jsname="Qx7uuf"]',
        '[aria-label="Join now"]',
        '[aria-label="Ask to join"]'
      ];
      
      // Coba klik tombol bergabung
      let joined = false;
      for (const selector of joinButtons) {
        try {
          console.log(`Mencari tombol: ${selector}`);
          
          // Cek apakah tombol ada
          const visible = await this.page.isVisible(selector, { timeout: 5000 });
          if (visible) {
            console.log(`Tombol ditemukan: ${selector}, mengklik...`);
            await this.page.click(selector);
            console.log(`Berhasil klik tombol: ${selector}`);
            joined = true;
            break;
          }
        } catch (e) {
          console.log(`Gagal dengan selector ${selector}:`, e.message);
        }
      }
      
      // Jika metode di atas gagal, coba pencarian lebih fleksibel
      if (!joined) {
        try {
          console.log('Mencari tombol bergabung dengan teks...');
          
          // Cari tombol dengan teks yang mengandung 'join' atau 'ask'
          const joinButton = await this.page.locator('button', {
            hasText: /join|ask/i
          }).first();
          
          if (joinButton) {
            console.log('Tombol bergabung ditemukan, mengklik...');
            await joinButton.click();
            console.log('Berhasil klik tombol bergabung');
            joined = true;
          }
        } catch (e) {
          console.log('Gagal menemukan tombol dengan teks:', e.message);
        }
      }
      
      if (joined) {
        console.log('Berhasil bergabung dengan meeting');
        return true;
      } else {
        console.log('Gagal bergabung meeting - tidak menemukan tombol bergabung');
        return false;
      }
    } catch (error) {
      console.error('Gagal bergabung meeting:', error);
      return false;
    }
  }

  async leaveMeeting() {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      console.log('Keluar dari meeting dan browser ditutup');
    } catch (error) {
      console.error('Error saat keluar meeting:', error);
    }
  }
}

async function main() {
  try {
    const meetBot = new GoogleMeetBot();
    await meetBot.initialize();
    
    // Tangani terminasi proses
    process.on('SIGINT', async () => {
      console.log('Menerima SIGINT. Membersihkan...');
      await meetBot.leaveMeeting();
      process.exit(0);
    });

    // Terima perintah bergabung meeting
    process.on('message', async (message) => {
      if (message.type === 'join') {
        try {
          console.log('Bergabung meeting:', message.meetingUrl);
          const success = await meetBot.joinMeeting(message.meetingUrl);
          
          if (process.send) {
            process.send({ 
              type: 'status', 
              success: success, 
              message: success ? 'Berhasil bergabung meeting' : 'Gagal bergabung meeting'
            });
          }
        } catch (error) {
          console.error('Error bergabung meeting:', error);
          if (process.send) {
            process.send({ 
              type: 'status', 
              success: false, 
              message: error.message 
            });
          }
        }
      }
    });

    console.log('Bot siap menerima perintah');
    
  } catch (error) {
    console.error('Error menginisialisasi bot:', error);
    process.exit(1);
  }
}

main(); 