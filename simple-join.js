const puppeteer = require('puppeteer');

async function joinMeeting(url) {
  console.log(`Mencoba bergabung ke meeting: ${url}`);
  
  let browser;
  try {
    // Pendekatan paling sederhana
    console.log('Menginisialisasi browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/usr/bin/google-chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-features=site-per-process'
      ],
      ignoreHTTPSErrors: true
    });
    
    console.log('Browser berhasil diinisialisasi');
    
    // Langkah 1: Buat halaman baru
    console.log('Membuat halaman...');
    const page = await browser.newPage();
    
    // Gunakan viewport kecil
    await page.setViewport({ width: 800, height: 600 });
    
    // Tangani error browser
    page.on('error', err => {
      console.error('Browser error:', err);
    });
    
    // Tangani dialog
    page.on('dialog', async dialog => {
      console.log('Dialog muncul:', dialog.message());
      await dialog.accept();
    });
    
    // Coba navigasi ke URL meeting
    console.log(`Navigasi ke meeting: ${url}`);
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Berhasil membuka halaman meeting');
    
    // Tunggu 30 detik saja
    console.log('Menunggu 30 detik...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
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
      console.log('Hasil:', success ? 'Berhasil' : 'Gagal');
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Error tidak tertangani:', err);
      process.exit(1);
    });
} 