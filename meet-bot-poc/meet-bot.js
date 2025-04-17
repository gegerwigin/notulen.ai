require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Get meeting link from command line arguments
const meetingLink = process.argv[2];

if (!meetingLink) {
  console.error('Please provide a meeting link as an argument');
  process.exit(1);
}

// Load tokens from file
function loadTokens() {
  try {
    const tokenPath = path.join(__dirname, 'tokens.json');
    if (fs.existsSync(tokenPath)) {
      return JSON.parse(fs.readFileSync(tokenPath));
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
  return null;
}

// Extract meeting code from the link
function extractMeetingCode(link) {
  // Handle different Google Meet URL formats
  const regex = /meet\.google\.com\/([a-z0-9\-]+)/i;
  const match = link.match(regex);
  return match ? match[1] : null;
}

// Main function to join a Google Meet meeting
async function joinMeeting(meetingLink) {
  console.log(`Attempting to join meeting: ${meetingLink}`);
  
  const meetingCode = extractMeetingCode(meetingLink);
  if (!meetingCode) {
    console.error('Invalid meeting link format');
    return;
  }
  
  console.log(`Meeting code: ${meetingCode}`);
  
  // Load saved tokens
  const tokens = loadTokens();
  if (!tokens) {
    console.error('No authentication tokens found. Please authenticate first.');
    return;
  }
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--disable-audio-output',
      '--disable-features=site-per-process',
      '--disable-web-security'
    ],
    defaultViewport: null
  });
  
  try {
    // Open a new page
    const page = await browser.newPage();
    
    // Set cookies for Google authentication
    await page.goto('https://accounts.google.com', { waitUntil: 'networkidle2' });
    
    // Add cookies for authentication
    // This is a simplified approach - in production, you'd use proper token management
    await page.evaluate((accessToken) => {
      document.cookie = `authorization=${accessToken}; domain=.google.com; path=/`;
    }, tokens.access_token);
    
    // Navigate to the meeting link
    await page.goto(meetingLink, { waitUntil: 'networkidle2' });
    
    // Wait for the page to load
    await page.waitForTimeout(5000);
    
    // Check if we need to sign in
    const signInButton = await page.$('div[data-is-consent-banner-auto-dismiss="false"] button');
    if (signInButton) {
      console.log('Sign in required. Clicking sign in button...');
      await signInButton.click();
      await page.waitForTimeout(3000);
      
      // Handle Google sign-in page
      const emailInput = await page.$('input[type="email"]');
      if (emailInput) {
        console.log('Attempting to sign in with saved credentials...');
        
        // Get email from saved tokens
        const userInfo = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
        const email = userInfo.email;
        
        await emailInput.type(email);
        await page.click('#identifierNext');
        await page.waitForTimeout(3000);
        
        // Password might be needed - this is a limitation
        console.log('You may need to manually enter password in the browser window');
      }
    }
    
    // Wait for the meeting page to load completely
    await page.waitForTimeout(5000);
    
    // Disable camera and microphone before joining
    console.log('Disabling camera and microphone...');
    
    // Look for camera toggle button and ensure it's turned off
    const cameraButton = await page.$('div[role="button"][data-is-muted="false"][data-tooltip-id="tt-c0"]');
    if (cameraButton) {
      console.log('Turning off camera...');
      await cameraButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for microphone toggle button and ensure it's turned off
    const micButton = await page.$('div[role="button"][data-is-muted="false"][data-tooltip-id="tt-c1"]');
    if (micButton) {
      console.log('Turning off microphone...');
      await micButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Check if we need to "Ask to join" or can directly join
    const joinNowButton = await page.$('button[jsname="Qx7uuf"]');
    const askToJoinButton = await page.$('button[jsname="A5il2e"]');
    
    if (joinNowButton) {
      console.log('Joining meeting directly...');
      await joinNowButton.click();
    } else if (askToJoinButton) {
      console.log('Requesting to join meeting...');
      await askToJoinButton.click();
      
      // Now we're in the waiting room, waiting to be admitted
      console.log('Waiting to be admitted to the meeting...');
      
      // Check for the waiting room status
      await page.waitForFunction(() => {
        // Look for text indicating we're waiting to be let in
        const waitingText = document.querySelector('div[jsname="r4nke"]');
        // Look for elements that would be visible if we're in the meeting
        const inMeetingElement = document.querySelector('div[jscontroller="xH1prf"]');
        
        // If we're in the meeting, return true
        if (inMeetingElement) return true;
        
        // If we're still waiting, log and return false
        if (waitingText) {
          console.log('Still waiting to be admitted...');
          return false;
        }
        
        // If neither condition is met, we might be in an error state
        return false;
      }, { timeout: 300000, polling: 5000 }); // Wait up to 5 minutes, checking every 5 seconds
      
      console.log('Successfully joined the meeting!');
    } else {
      console.error('Could not find join button. Meeting might be full or you may not have permission to join.');
    }
    
    // Keep the browser open so the bot stays in the meeting
    console.log('Bot has joined the meeting. Keep this window open to stay in the meeting.');
    
    // TODO: Implement audio capture logic here
    
  } catch (error) {
    console.error('Error joining meeting:', error);
    await browser.close();
  }
}

// Start the process
joinMeeting(meetingLink);
