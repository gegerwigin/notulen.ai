const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const MEET_LINK = process.argv[2];
const USER_DATA_DIR = path.join(__dirname, `chrome-user-data-${Date.now()}`);
const LOG_FILE = path.join(__dirname, 'bot.log');
const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL;
const GOOGLE_PASSWORD = process.env.GOOGLE_PASSWORD;

// Logging function
async function log(message, error = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}${error ? '\n' + error.stack : ''}`;
  console.log(logMessage);
  await fs.appendFile(LOG_FILE, logMessage + '\n');
}

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Wait for navigation with retry
async function waitForNavigationSafe(page, options = {}) {
  const defaultOptions = {
    waitUntil: ['networkidle0', 'domcontentloaded'],
    timeout: 30000
  };
  
  try {
    await page.waitForNavigation({ ...defaultOptions, ...options });
  } catch (error) {
    // If timeout, try one more time with just domcontentloaded
    if (error.name === 'TimeoutError') {
      await page.waitForNavigation({ 
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
    } else {
      throw error;
    }
  }
}

// Start browser with retry logic
async function startBrowser(attempt = 1, maxAttempts = 3) {
  try {
    await log(`Starting browser (attempt ${attempt}/${maxAttempts})...`);
    await log('Starting browser initialization...');

    // Ensure user data directory exists
    await fs.mkdir(USER_DATA_DIR, { recursive: true });
    await log('Created user data directory');

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        `--user-data-dir=${USER_DATA_DIR}`,
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream'
      ],
      defaultViewport: { width: 1280, height: 720 }
    });

    await log('Browser started successfully');
    return browser;
  } catch (error) {
    await log('Error in startBrowser:', error);
    
    if (attempt < maxAttempts) {
      const delay = attempt === 1 ? 5000 : 10000;
      await log(`Attempt ${attempt} failed:`, error);
      await log(`Retrying in ${delay / 1000} seconds...`);
      await sleep(delay);
      
      // Clean up the user data directory before retrying
      await log('Cleaning up previous session directory...');
      try {
        await fs.rm(USER_DATA_DIR, { recursive: true, force: true });
        await log('Cleaned up previous session directory');
      } catch (cleanupError) {
        await log('Error cleaning up directory:', cleanupError);
      }
      
      return startBrowser(attempt + 1, maxAttempts);
    }
    
    await log(`Max retries (${maxAttempts}) reached for browser start`);
    throw error;
  }
}

// Login function with improved error handling
async function login(page) {
  await log('Starting login process...');
  
  try {
    // Wait for email input
    const emailInput = await page.waitForSelector('input[type="email"]', { visible: true, timeout: 10000 });
    await emailInput.type(GOOGLE_EMAIL);
    await page.keyboard.press('Enter');
    await sleep(2000);

    // Wait for password input
    const passwordInput = await page.waitForSelector('input[type="password"]', { visible: true, timeout: 10000 });
    await passwordInput.type(GOOGLE_PASSWORD);
    await page.keyboard.press('Enter');

    // Wait for navigation to complete
    await waitForNavigationSafe(page);
    await log('Login successful');
  } catch (error) {
    await log('Error during login:', error);
    throw error;
  }
}

// Join meeting function with improved navigation handling
async function joinMeet(browser, meetingUrl) {
  let page = null;
  
  try {
    await log(`Attempting to join meeting: ${meetingUrl}`);
    
    // Create a new page
    page = await browser.newPage();
    
    // Set permissions before navigating
    await page.setPermissions('https://meet.google.com', ['camera', 'microphone']);
    
    // Navigate to the meeting URL with better error handling
    const response = await page.goto(meetingUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    if (!response.ok()) {
      throw new Error(`Failed to load meeting page: ${response.status()} ${response.statusText()}`);
    }
    
    // Check if we need to login
    const currentUrl = page.url();
    if (currentUrl.includes('accounts.google.com')) {
      await login(page);
      // After login, navigate back to the meeting URL
      await page.goto(meetingUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    }
    
    // Wait for the main meeting container
    await page.waitForSelector('[data-meeting-title]', {
      timeout: 20000
    });
    
    // Ensure media is muted
    await page.evaluate(() => {
      const muteButton = document.querySelector('[data-is-muted="false"]');
      if (muteButton) muteButton.click();
    });
    
    // Look for join button with multiple selectors
    const joinButtonSelectors = [
      'button[jsname="Qx7uuf"]',
      'button[jsname="A5il2e"]',
      'button[aria-label*="Join now"]',
      'button[aria-label*="Ask to join"]'
    ];
    
    let joinButton = null;
    for (const selector of joinButtonSelectors) {
      joinButton = await page.$(selector);
      if (joinButton) {
        await log(`Found join button with selector: ${selector}`);
        break;
      }
    }
    
    if (!joinButton) {
      throw new Error('Join button not found');
    }
    
    // Click the join button
    await joinButton.click();
    await log('Clicked join button');
    
    // Wait for confirmation that we're in the meeting
    await page.waitForSelector('[data-meeting-code]', {
      timeout: 20000
    });
    
    await log('Successfully joined the meeting');
    return page;
    
  } catch (error) {
    await log('Error in joinMeet:', error);
    if (page) {
      try {
        await page.screenshot({
          path: path.join(__dirname, `error-screenshot-${Date.now()}.png`),
          fullPage: true
        });
        await log('Saved error screenshot');
      } catch (screenshotError) {
        await log('Failed to save error screenshot:', screenshotError);
      }
    }
    throw error;
  }
}

// Main function
async function main() {
  let browser = null;
  
  try {
    // Validate meeting URL
    if (!MEET_LINK || !MEET_LINK.startsWith('https://meet.google.com/')) {
      throw new Error('Invalid Google Meet URL');
    }
    
    // Validate credentials
    if (!GOOGLE_EMAIL || !GOOGLE_PASSWORD) {
      throw new Error('Google account credentials not provided');
    }
    
    // Start browser with retry
    browser = await startBrowser();
    
    // Join meeting with retry
    let meetingPage = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        meetingPage = await joinMeet(browser, MEET_LINK);
        break;
      } catch (error) {
        attempts++;
        await log(`Attempt ${attempts} failed:`, error);
        
        if (attempts < maxAttempts) {
          const delay = attempts === 1 ? 5000 : 10000;
          await log(`Retrying in ${delay / 1000} seconds...`);
          await sleep(delay);
        } else {
          await log('Max retries reached, exiting...');
          throw error;
        }
      }
    }
    
    // Keep the script running
    await new Promise(() => {});
    
  } catch (error) {
    await log('Fatal error:', error);
    process.exit(1);
  } finally {
    if (browser) {
      try {
        await browser.close();
        await log('Browser closed');
      } catch (error) {
        await log('Error closing browser:', error);
      }
      
      try {
        await fs.rm(USER_DATA_DIR, { recursive: true, force: true });
        await log('Cleaned up user data directory');
      } catch (error) {
        await log('Error cleaning up user data directory:', error);
      }
    }
  }
}

main(); 