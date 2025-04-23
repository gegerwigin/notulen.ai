const { chromium } = require('playwright');

async function joinMeeting(url) {
  console.log(`Mencoba bergabung ke meeting dengan Playwright: ${url}`);
  
  let browser;
  try {
    // Konfigurasi browser dengan Playwright - lebih sederhana
    console.log('Menginisialisasi browser dengan Playwright...');
    browser = await chromium.launch({
      headless: true,
      // Tidak perlu menentukan executablePath, gunakan chromium bawaan Playwright
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    console.log('Browser berhasil diinisialisasi');
    
    // Buat context baru (seperti profil baru)
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    });
    
    // Buat halaman baru
    console.log('Membuat halaman...');
    const page = await context.newPage();
    
    // Event listener untuk dialog
    page.on('dialog', async dialog => {
      console.log('Dialog muncul:', dialog.message());
      await dialog.accept();
    });
    
    // Gunakan pendekatan lebih sederhana
    console.log(`Navigasi ke meeting: ${url}`);
    await page.goto(url);
    console.log('Berhasil membuka halaman meeting');
    
    // Tunggu beberapa saat agar halaman sepenuhnya dimuat
    console.log('Menunggu halaman dimuat...');
    await page.waitForTimeout(10000);
    
    // Screenshot untuk debugging
    try {
      await page.screenshot({ path: 'playwright-meeting.png' });
      console.log('Screenshot berhasil disimpan');
    } catch (e) {
      console.log('Gagal mengambil screenshot:', e.message);
    }
    
    // Cek judul halaman
    const title = await page.title();
    console.log('Judul halaman:', title);
    
    // Tunggu beberapa saat
    console.log('Menunggu dalam meeting selama 30 detik...');
    await page.waitForTimeout(30000);
    
    // Tutup browser
    console.log('Menutup browser...');
    await browser.close();
    
    return true;
  } catch (error) {
    console.error('Error:', error);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error saat menutup browser:', e);
      }
    }
    return false;
  }
}

// Jika dijalankan langsung
if (require.main === module) {
  const url = process.argv[2] || 'https://meet.google.com/kzy-xevz-idz';
  
  joinMeeting(url)
    .then(success => {
      console.log('Hasil akhir:', success ? 'Berhasil' : 'Gagal');
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Error tidak tertangani:', err);
      process.exit(1);
    });
} 