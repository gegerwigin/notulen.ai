const puppeteer = require('puppeteer');

async function testGoogleMeetJoin(url) {
  console.log(`Google Meet test: ${url}`);
  
  let browser;
  try {
    console.log('Menginisialisasi browser...');
    browser = await puppeteer.launch({
      headless: true,  // Gunakan mode headless
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,720',
        '--disable-web-security'
      ]
    });
    
    console.log('Browser berhasil diinisialisasi');
    
    // Buat halaman baru
    console.log('Membuat halaman...');
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Navigasi ke Google Meet
    console.log(`Navigasi ke URL: ${url}`);
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Tunggu sebentar agar halaman benar-benar dimuat
    console.log('Menunggu halaman dimuat sepenuhnya...');
    await page.waitForTimeout(5000);
    
    // Ambil screenshot
    console.log('Mengambil screenshot...');
    await page.screenshot({ path: 'meet-page.png', fullPage: true });
    console.log('Screenshot berhasil disimpan');
    
    // Cek judul halaman
    const title = await page.title();
    console.log('Judul halaman:', title);
    
    // Ambil semua tombol di halaman
    const buttonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map(button => ({
        text: button.innerText || button.textContent,
        id: button.id,
        className: button.className
      }));
    });
    
    console.log('Tombol yang ditemukan pada halaman:');
    buttonInfo.forEach((btn, index) => {
      console.log(`${index + 1}. Teks: "${btn.text}", ID: ${btn.id}, Class: ${btn.className}`);
    });

    // Tutup browser
    await browser.close();
    console.log('Browser ditutup');
    
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

// URL dari command line argument
const url = process.argv[2] || 'https://meet.google.com/kzy-xevz-idz';

testGoogleMeetJoin(url)
  .then(success => {
    console.log('Hasil tes:', success ? 'Berhasil' : 'Gagal');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Error tidak tertangani:', err);
    process.exit(1);
  }); 