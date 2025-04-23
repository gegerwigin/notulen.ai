const puppeteer = require('puppeteer');

async function joinMeet(url) {
  console.log(`Bergabung ke meeting: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  const page = await browser.newPage();
  
  // Atur izin media
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => []
        })
      }
    });
  });
  
  try {
    // Buka Google dulu untuk memastikan cookie/sesi sudah siap
    await page.goto('https://google.com', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Halaman Google dimuat');
    
    // Buka meeting
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Halaman meeting dimuat');
    
    // Ambil screenshot untuk debugging (opsional)
    await page.screenshot({ path: 'meeting-page.png' });
    console.log('Screenshot diambil');
    
    // Tunggu elemen loading hilang
    try {
      await page.waitForFunction(() => !document.querySelector('.F9NiKa'), { timeout: 10000 });
      console.log('Halaman sudah selesai loading');
    } catch (e) {
      console.log('Timeout menunggu loading, mencoba melanjutkan');
    }
    
    // Coba matikan kamera (jika ada)
    try {
      const cameraButton = await page.$('div[aria-label="Turn off camera (⌘+e)"], div[jsname="BOHaEe"]');
      if (cameraButton) {
        await cameraButton.click();
        console.log('Kamera dimatikan');
      }
    } catch (e) {
      console.log('Kamera mungkin sudah mati:', e.message);
    }
    
    // Coba matikan mikrofon (jika ada)
    try {
      const micButton = await page.$('div[aria-label="Turn off microphone (⌘+d)"], div[jsname="QN1OQ"]');
      if (micButton) {
        await micButton.click();
        console.log('Mikrofon dimatikan');
      }
    } catch (e) {
      console.log('Mikrofon mungkin sudah mati:', e.message);
    }
    
    // Daftar kemungkinan selector tombol join
    const joinButtonSelectors = [
      'button[jsname="Qx7uuf"]',
      'button[jsname="A5GSIb"]',
      '[data-is-muted="false"]',
      'button.KMs1Cc',
      'button:contains("Join now")',
      'button:contains("Ask to join")',
      'button.uArJ5e[jsname="Qx7uuf"]'
    ];
    
    // Coba klik tombol join
    let joinClicked = false;
    for (const selector of joinButtonSelectors) {
      try {
        // Periksa apakah elemen ada
        const exists = await page.evaluate((sel) => {
          return document.querySelector(sel) !== null || 
                 [...document.querySelectorAll('button')].some(b => b.textContent.includes('Join') || b.textContent.includes('Ask to join'));
        }, selector);
        
        if (exists) {
          try {
            await page.click(selector);
            console.log(`Berhasil klik tombol join dengan selector: ${selector}`);
            joinClicked = true;
            break;
          } catch (clickErr) {
            console.log(`Gagal klik selector ${selector}:`, clickErr.message);
          }
        }
      } catch (e) {
        console.log(`Error dengan selector ${selector}:`, e.message);
      }
    }
    
    // Jika tidak bisa klik tombol spesifik, coba tombol apapun dengan teks yang cocok
    if (!joinClicked) {
      try {
        const buttons = await page.$$('button');
        console.log(`Mencoba ${buttons.length} tombol yang ditemukan`);
        
        for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent, button);
          console.log(`Tombol dengan teks: ${text}`);
          
          if (text.includes('Join') || text.includes('Ask to join')) {
            await button.click();
            console.log(`Berhasil klik tombol join dengan teks: ${text}`);
            joinClicked = true;
            break;
          }
        }
      } catch (e) {
        console.log('Error saat mencoba klik tombol alternatif:', e.message);
      }
    }
    
    if (joinClicked) {
      console.log('Berhasil join meeting');
      return { success: true, browser, page };
    } else {
      console.log('Gagal menemukan tombol join');
      await browser.close();
      return { success: false };
    }
  } catch (error) {
    console.error('Error saat join meeting:', error);
    try {
      await browser.close();
    } catch (e) {}
    return { success: false };
  }
}

// Eksekusi jika dijalankan langsung
if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error('Berikan URL meeting');
    process.exit(1);
  }
  
  joinMeet(url)
    .then(result => {
      if (result.success) {
        console.log('Berhasil bergabung ke meeting!');
        // Biarkan browser tetap terbuka
      } else {
        console.log('Gagal bergabung ke meeting');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { joinMeet }; 