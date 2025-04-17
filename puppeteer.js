const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);

// Configure logging
const LOG_FILE = 'meet.log';
const SCREENSHOTS_DIR = 'screenshots';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR);
}

async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;
  console.log(logMessage);
  await appendFile(LOG_FILE, logMessage);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(SCREENSHOTS_DIR, `${name}_${timestamp}.png`);
  await page.screenshot({ path: filename });
  await log(`Screenshot saved: ${filename}`);
}

async function joinMeeting(meetingUrl) {
  await log('Starting browser...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
      '--disable-gl-drawing-for-tests',
      '--disable-software-rasterizer',
      '--enable-unsafe-swiftshader',
      '--window-size=1280,720',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Navigate to Google Meet
    await log(`Navigating to meeting URL: ${meetingUrl}`);
    await page.goto(meetingUrl, { waitUntil: 'networkidle0' });
    await takeScreenshot(page, 'initial_page');

    // Wait for and handle mic/camera permissions
    await log('Handling permissions...');
    await page.evaluate(() => {
      const mediaDevices = navigator.mediaDevices;
      if (mediaDevices && mediaDevices.getUserMedia) {
        mediaDevices.getUserMedia({ video: true, audio: true })
          .catch(err => console.log('Media permission error:', err));
      }
    });

    // Wait for and click the "Join now" button
    await log('Looking for join button...');
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(button => 
          button.textContent.toLowerCase().includes('join now') ||
          button.textContent.toLowerCase().includes('ask to join')
        );
      },
      { timeout: 30000 }
    );

    await takeScreenshot(page, 'before_join');

    // Click the join button using JavaScript
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const joinButton = buttons.find(button => 
        button.textContent.toLowerCase().includes('join now') ||
        button.textContent.toLowerCase().includes('ask to join')
      );
      if (joinButton) joinButton.click();
    });

    await log('Clicked join button');
    await takeScreenshot(page, 'after_join');

    // Keep the session alive and monitor for disconnections
    let isActive = true;
    while (isActive) {
      try {
        await sleep(5000);
        
        // Check if still in meeting
        const isDisconnected = await page.evaluate(() => {
          return document.body.innerText.toLowerCase().includes('you left the meeting') ||
                 document.body.innerText.toLowerCase().includes('disconnected');
        });

        if (isDisconnected) {
          await log('Detected disconnection from meeting');
          isActive = false;
        }
      } catch (error) {
        await log(`Error during meeting monitoring: ${error.message}`);
        isActive = false;
      }
    }

  } catch (error) {
    await log(`Error during meeting: ${error.message}`);
    await takeScreenshot(page, 'error');
    throw error;
  } finally {
    await log('Closing browser...');
    await browser.close();
  }
}

module.exports = { joinMeeting }; 