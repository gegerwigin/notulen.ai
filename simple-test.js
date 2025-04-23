const puppeteer = require('puppeteer');

async function testBrowser() {
  console.log('Tes browser headless minimal');
  
  let browser;
  try {
    console.log('Menginisialisasi browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    console.log('Browser berhasil diinisialisasi');
    
    // Buat halaman baru
    console.log('Membuat halaman...');
    const page = await browser.newPage();
    
    // Navigasi ke halaman sederhana
    console.log('Navigasi ke Google...');
    await page.goto('https://www.google.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Cek judul halaman
    const title = await page.title();
    console.log('Berhasil membuka halaman. Judul:', title);
    
    // Ambil screenshot
    await page.screenshot({ path: 'simple-test.png' });
    console.log('Screenshot berhasil disimpan');
    
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

testBrowser()
  .then(success => {
    console.log('Hasil tes:', success ? 'Berhasil' : 'Gagal');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Error tidak tertangani:', err);
    process.exit(1);
  }); 