import { chromium, Browser, Page } from 'playwright';
import { EventEmitter } from 'events';

interface MeetingConfig {
  url: string;
  platform: 'meet' | 'zoom' | 'teams';
  email?: string;
  password?: string;
}

class MeetingBot extends EventEmitter {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isConnected: boolean = false;

  constructor(private config: MeetingConfig) {
    super();
  }

  async initialize() {
    try {
      // Launch browser with audio capture enabled
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--allow-file-access-from-files',
          '--enable-audio-input',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });

      // Create context with permissions
      const context = await this.browser.newContext({
        permissions: ['microphone'],
        recordVideo: {
          dir: 'recordings/',
          size: { width: 640, height: 480 }
        }
      });

      this.page = await context.newPage();
      
      // Setup audio capture
      await this.setupAudioCapture();
      
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async setupAudioCapture() {
    if (!this.page) throw new Error('Page not initialized');

    // Inject audio capture script
    await this.page.addInitScript(() => {
      window.addEventListener('DOMContentLoaded', () => {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(1024, 1, 1);
            
            source.connect(processor);
            processor.connect(audioContext.destination);
            
            processor.onaudioprocess = (e) => {
              // Here we can process the audio data
              const audioData = e.inputBuffer.getChannelData(0);
              // Send audio data to our processing server
              window.postMessage({ type: 'audioData', data: audioData }, '*');
            };
          });
      });
    });

    // Listen for audio data
    await this.page.exposeFunction('handleAudioData', (audioData: Float32Array) => {
      this.emit('audioData', audioData);
    });
  }

  async joinMeeting() {
    if (!this.page) throw new Error('Bot not initialized');

    try {
      switch (this.config.platform) {
        case 'meet':
          await this.joinGoogleMeet();
          break;
        case 'zoom':
          await this.joinZoom();
          break;
        case 'teams':
          await this.joinTeams();
          break;
      }

      this.isConnected = true;
      this.emit('joined');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async joinGoogleMeet() {
    if (!this.page) return;

    await this.page.goto(this.config.url, { waitUntil: 'networkidle' });

    // Handle Google login if needed
    if (this.config.email && this.config.password) {
      await this.handleGoogleLogin();
    }

    // Wait for and click the join button
    await this.page.waitForSelector('button[aria-label*="join" i], button[aria-label*="ask to join" i]');
    await this.page.click('button[aria-label*="join" i], button[aria-label*="ask to join" i]');
  }

  private async handleGoogleLogin() {
    if (!this.page || !this.config.email || !this.config.password) return;

    // Handle email input
    await this.page.fill('input[type="email"]', this.config.email);
    await this.page.click('button:has-text("Next")');

    // Handle password input
    await this.page.fill('input[type="password"]', this.config.password);
    await this.page.click('button:has-text("Next")');
  }

  private async joinZoom() {
    // Implement Zoom joining logic
  }

  private async joinTeams() {
    // Implement Teams joining logic
  }

  async leaveMeeting() {
    if (!this.page) return;

    try {
      await this.page.click('button[aria-label*="leave" i], button[aria-label*="end" i]');
      this.isConnected = false;
      this.emit('left');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.isConnected) {
      await this.leaveMeeting();
    }

    if (this.browser) {
      await this.browser.close();
    }

    this.browser = null;
    this.page = null;
    this.emit('cleanup');
  }
}

export default MeetingBot; 