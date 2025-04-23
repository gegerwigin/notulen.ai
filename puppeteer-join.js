const puppeteer = require('puppeteer');

async function joinMeeting(url) {
  console.log(`Mencoba bergabung ke meeting dengan Puppeteer versi lama: ${url}`);
  
  let browser;
  try {
    // Konfigurasi browser dengan Puppeteer
    console.log('Menginisialisasi browser dengan Puppeteer v16.2.0...');
    browser = await puppeteer.launch({
      headless: true, // gunakan true untuk non-UI
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--window-size=1366,768',
        '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
      ],
      ignoreHTTPSErrors: true
    });
    
    console.log('Browser berhasil diinisialisasi');
    
    // Buat halaman baru
    console.log('Membuat halaman...');
    const page = await browser.newPage();
    
    // Set penanganan error
    page.on('error', err => {
      console.error('Halaman error:', err);
    });
    
    // Set viewport
    await page.setViewport({
      width: 1366,
      height: 768
    });
    
    // Coba navigasi ke halaman Google dulu untuk tes
    console.log('Navigasi ke Google...');
    await page.goto('https://www.google.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('Navigasi ke Google berhasil');
    
    // Ambil screenshot setelah navigasi ke Google
    try {
      await page.screenshot({ path: 'google-test.png' });
      console.log('Screenshot Google berhasil');
    } catch (err) {
      console.error('Gagal mengambil screenshot Google:', err.message);
    }
    
    // Selanjutnya navigasi ke meeting
    console.log(`Navigasi ke meeting: ${url}`);
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    console.log('Navigasi ke halaman meeting berhasil');
    
    // Ambil screenshot
    try {
      await page.screenshot({ path: 'meeting-test.png' });
      console.log('Screenshot meeting berhasil');
    } catch (err) {
      console.error('Gagal mengambil screenshot meeting:', err.message);
    }
    
    // Cek judul halaman
    const title = await page.title();
    console.log('Judul halaman:', title);

    // Tunggu beberapa saat
    console.log('Menunggu dalam halaman meeting selama 10 detik...');
    await new Promise(r => setTimeout(r, 10000));
    
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

// Jalankan fungsi
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