require('dotenv').config();
const puppeteer = require('puppeteer');
const axios = require('axios');

class ZoomBot {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isInitialized = false;
    this.activeSessions = new Map();
  }

  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('Initializing Zoom bot...');
      this.browser = await puppeteer.launch({
        headless: false,
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--disable-web-security'
        ]
      });
      this.isInitialized = true;
      console.log('Zoom bot initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Zoom bot:', error);
      return false;
    }
  }

  async verifyCredentials(email, password) {
    try {
      // This is a placeholder - in a real implementation, you would verify
      // the credentials with Zoom API or by attempting to log in
      console.log('Verifying Zoom credentials for:', email);
      return { success: true };
    } catch (error) {
      console.error('Failed to verify Zoom credentials:', error);
      return { success: false, message: error.message };
    }
  }

  async joinMeeting(meetingId, password, displayName, sessionId, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`Joining Zoom meeting ${meetingId} as ${displayName}...`);
      
      // Create a new page for this session
      const page = await this.browser.newPage();
      
      // Construct the Zoom join URL
      let joinUrl = `https://zoom.us/wc/${meetingId}/join`;
      if (password) {
        joinUrl += `?pwd=${password}`;
      }
      
      // Navigate to the Zoom web client
      await page.goto(joinUrl, { waitUntil: 'networkidle2' });
      
      // Wait for the name input field and enter the display name
      await page.waitForSelector('#inputname', { timeout: 30000 });
      await page.type('#inputname', displayName);
      
      // Disable video if needed
      if (!options.enableCamera) {
        const videoToggle = await page.$('.join-dialog__video-preview button');
        if (videoToggle) {
          await videoToggle.click();
        }
      }
      
      // Click the join button
      await page.waitForSelector('#joinBtn', { timeout: 10000 });
      await page.click('#joinBtn');
      
      // Wait for the meeting to load
      await page.waitForSelector('.meeting-app', { timeout: 60000 })
        .catch(() => console.log('Meeting interface selector not found, but continuing...'));
      
      // Mute audio if needed
      if (!options.enableMicrophone) {
        try {
          const audioButton = await page.$('button[aria-label="mute my microphone"]');
          if (audioButton) {
            await audioButton.click();
          }
        } catch (e) {
          console.log('Could not mute microphone:', e.message);
        }
      }
      
      // Store the session
      this.activeSessions.set(sessionId, {
        id: sessionId,
        page,
        meetingId,
        startTime: new Date(),
        transcription: ''
      });
      
      console.log(`Successfully joined Zoom meeting ${meetingId}`);
      return { success: true, sessionId };
    } catch (error) {
      console.error('Failed to join Zoom meeting:', error);
      return { success: false, error: error.message };
    }
  }

  async leaveMeeting(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      // Click the leave button
      await session.page.click('button[aria-label="leave meeting"]');
      
      // Confirm leaving
      await session.page.waitForSelector('.leave-meeting-options__btn--danger', { timeout: 5000 });
      await session.page.click('.leave-meeting-options__btn--danger');
      
      // Close the page
      await session.page.close();
      
      // Remove the session
      this.activeSessions.delete(sessionId);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to leave Zoom meeting:', error);
      return { success: false, error: error.message };
    }
  }

  async getTranscription(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // This is a placeholder - in a real implementation, you would
    // capture and process audio from the meeting
    return {
      success: true,
      transcription: 'This is a placeholder transcription for the Zoom meeting.'
    };
  }

  isSessionActive(sessionId) {
    return this.activeSessions.has(sessionId);
  }

  async shutdown() {
    if (this.browser) {
      // Close all sessions
      for (const [sessionId, session] of this.activeSessions.entries()) {
        await this.leaveMeeting(sessionId);
      }
      
      // Close the browser
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
    }
  }
}

module.exports = new ZoomBot();
