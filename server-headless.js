const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());

// Menyimpan browser instances aktif
const activeBots = new Map();

// Buat direktori log jika belum ada
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Fungsi untuk join meeting
async function joinMeeting(meetingUrl, botId) {
  console.log(`[${botId}] Mencoba join meeting: ${meetingUrl}`);
  
  // Log file path
  const logFile = path.join(logDir, `bot-${botId}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  // Helper untuk logging
  const log = (message) => {
    const entry = `[${new Date().toISOString()}] ${message}\n`;
    logStream.write(entry);
    console.log(`[${botId}] ${message}`);
  };
  
  try {
    log('Launching browser...');
    
    // Launch browser in headless mode
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream'
      ]
    });
    
    log('Browser launched successfully');
    
    // Create new page
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
    
    log('Page created with media permissions set');
    
    // Buka Google dulu
    try {
      await page.goto('https://google.com', { waitUntil: 'networkidle2', timeout: 30000 });
      log('Google homepage loaded');
    } catch (e) {
      log(`Error loading Google: ${e.message}`);
    }
    
    // Buka meeting
    await page.goto(meetingUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    log('Meeting page loaded');
    
    // Ambil screenshot untuk debug
    const screenshotPath = path.join(__dirname, `meeting-${botId}.png`);
    await page.screenshot({ path: screenshotPath });
    log(`Screenshot saved to ${screenshotPath}`);
    
    // Get page title
    const title = await page.title();
    log(`Page title: ${title}`);
    
    // Coba klik tombol join
    const joinButtons = [
      'button[jsname="Qx7uuf"]',
      'button[jsname="A5GSIb"]',
      '[data-is-muted="false"]',
      'button.KMs1Cc',
      'button:contains("Join now")',
      'button:contains("Ask to join")',
      'button.uArJ5e[jsname="Qx7uuf"]'
    ];
    
    let joinSuccess = false;
    
    for (const selector of joinButtons) {
      try {
        const exists = await page.evaluate((sel) => {
          return document.querySelector(sel) !== null;
        }, selector);
        
        if (exists) {
          log(`Found join button with selector: ${selector}`);
          await page.click(selector);
          log(`Clicked join button with selector: ${selector}`);
          joinSuccess = true;
          break;
        }
      } catch (e) {
        log(`Error with selector ${selector}: ${e.message}`);
      }
    }
    
    if (!joinSuccess) {
      log('Could not find join button by selector, trying buttons with text');
      
      try {
        const buttons = await page.$$('button');
        log(`Found ${buttons.length} buttons on page`);
        
        for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent, button);
          log(`Button text: "${text}"`);
          
          if (text.includes('Join') || text.includes('Ask to join')) {
            await button.click();
            log(`Clicked button with text: "${text}"`);
            joinSuccess = true;
            break;
          }
        }
      } catch (e) {
        log(`Error finding buttons by text: ${e.message}`);
      }
    }
    
    log(joinSuccess ? 'Successfully joined meeting' : 'Failed to join meeting');
    
    // Store the browser and page in the active bots map
    const botInfo = {
      browser,
      page,
      url: meetingUrl,
      startTime: new Date(),
      joinSuccess
    };
    
    activeBots.set(botId, botInfo);
    
    return {
      success: true,
      joined: joinSuccess
    };
  } catch (error) {
    log(`Error: ${error.message}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// API endpoint to join meeting
app.post('/join-meeting', async (req, res) => {
  const { meetingUrl } = req.body;
  
  if (!meetingUrl) {
    return res.status(400).json({
      success: false,
      message: 'URL meeting diperlukan'
    });
  }
  
  // Generate unique ID for this bot
  const botId = Date.now().toString();
  console.log(`[${new Date().toISOString()}] Request join meeting: ${meetingUrl}`);
  
  try {
    // Join meeting asynchronously
    joinMeeting(meetingUrl, botId)
      .then(result => {
        console.log(`[${botId}] Join result:`, result);
      })
      .catch(err => {
        console.error(`[${botId}] Join error:`, err);
      });
    
    // Respond immediately while the join process runs in background
    res.json({
      success: true,
      message: 'Permintaan join dikirim',
      botId,
      url: meetingUrl
    });
  } catch (error) {
    console.error(`[${botId}] Error:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Gagal menjalankan bot',
      error: error.message
    });
  }
});

// API endpoint to leave meeting
app.post('/leave-meeting', async (req, res) => {
  const { botId } = req.body;
  
  if (!botId || !activeBots.has(botId)) {
    return res.status(400).json({
      success: false,
      message: 'Bot ID tidak valid atau tidak ditemukan'
    });
  }
  
  try {
    const botInfo = activeBots.get(botId);
    
    if (botInfo.page) {
      await botInfo.page.close();
    }
    
    if (botInfo.browser) {
      await botInfo.browser.close();
    }
    
    activeBots.delete(botId);
    
    console.log(`[${new Date().toISOString()}] Bot ${botId} left meeting`);
    
    res.json({
      success: true,
      message: 'Bot left meeting'
    });
  } catch (error) {
    console.error(`[${botId}] Error leaving meeting:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Error leaving meeting',
      error: error.message
    });
  }
});

// API endpoint to check status
app.get('/status', (req, res) => {
  const bots = [];
  
  for (const [id, info] of activeBots.entries()) {
    const runtime = Math.floor((new Date() - info.startTime) / 1000);
    
    bots.push({
      botId: id,
      meetingUrl: info.url,
      startTime: info.startTime.toISOString(),
      runtimeSeconds: runtime,
      joinSuccess: info.joinSuccess
    });
  }
  
  res.json({
    success: true,
    activeBots: bots.length,
    bots
  });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] Server running at http://0.0.0.0:${PORT}`);
}); 