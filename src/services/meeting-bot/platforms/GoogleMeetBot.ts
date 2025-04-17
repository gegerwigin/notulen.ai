import { Browser, Page, LaunchOptions } from 'puppeteer-core';
import { v4 as uuidv4 } from 'uuid';
import { 
  MeetingBotInterface, 
  MeetingJoinOptions, 
  MeetingSession, 
  MeetingBotCredentials,
  MeetingStatus 
} from '../MeetingBotInterface';
import { getPuppeteer, getBrowserLaunchOptions } from '../puppeteer-browser';

/**
 * Implementation of MeetingBotInterface for Google Meet
 */
export class GoogleMeetBot implements MeetingBotInterface {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private logs: string[] = [];
  private sessionId: string | null = null;
  private meetingUrl: string | null = null;
  private statusInterval: NodeJS.Timeout | null = null;
  private _initialized: boolean = false;
  private credentials: MeetingBotCredentials | null = null;

  private metrics = {
    networkRequests: 0,
    errors: 0,
    warnings: 0
  };

  /**
   * Check if the given URL is a Google Meet URL
   */
  supportsUrl(url: string): boolean {
    return url.includes('meet.google.com');
  }

  /**
   * Get the platform name
   */
  getPlatformName(): string {
    return 'Google Meet';
  }

  /**
   * Initialize the bot
   */
  async initialize(credentials: MeetingBotCredentials): Promise<void> {
    if (this._initialized) {
      return;
    }

    try {
      const puppeteer = await getPuppeteer();
      this.browser = await puppeteer.launch(getBrowserLaunchOptions());
      this.credentials = credentials;
      this._initialized = true;
      this.addLog('GoogleMeetBot: Initialized successfully');
    } catch (error) {
      this.addLog(`GoogleMeetBot: Failed to initialize: ${error}`);
      throw new Error('Failed to initialize Google Meet bot');
    }
  }

  /**
   * Check if the bot is initialized
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Join a Google Meet meeting
   */
  async joinMeeting(url: string, options: MeetingJoinOptions = {}): Promise<MeetingSession> {
    if (!this._initialized || !this.browser) {
      throw new Error('Google Meet bot is not initialized');
    }

    this.meetingUrl = url;
    this.sessionId = `gmeet-${uuidv4()}`;
    
    this.addLog(`Mencoba join meeting: ${url}`);
    
    try {
      // Buat page baru
      this.page = await this.browser.newPage();
      
      // Setup monitoring
      await this.setupBrowserMonitoring();
      
      // Buka URL meeting
      await this.page.goto(url, { waitUntil: 'networkidle0' });
      
      // Handle media permissions
      await this.handleMediaPermissions(options);
      
      // Join meeting
      await this.handleJoinFlow();
      
      // Mulai monitoring status
      this.startStatusMonitoring();

      const session: MeetingSession = {
        id: this.sessionId,
        platform: 'Google Meet',
        url: url,
        startTime: new Date(),
        logs: this.logs
      };

      return session;

    } catch (error: any) {
      this.addLog(`Error saat join meeting: ${error.message}`);
      throw error;
    }
  }

  /**
   * Leave the current meeting
   */
  async leaveMeeting(): Promise<void> {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    if (this.page) {
      try {
        // Klik tombol Leave meeting jika ada
        await this.page.evaluate(() => {
          const leaveButton = document.querySelector('[aria-label*="Leave call"]');
          if (leaveButton) {
            (leaveButton as HTMLElement).click();
          }
        });
        
        await this.page.close();
        this.page = null;
      } catch (error) {
        this.addLog(`Error saat leave meeting: ${error}`);
      }
    }

    this.sessionId = null;
    this.meetingUrl = null;
    this.addLog('Meninggalkan meeting');
  }

  /**
   * Get current meeting status
   */
  async getStatus(): Promise<MeetingStatus> {
    if (!this.page || !this.sessionId) {
      return {
        status: 'disconnected',
        error: 'Session tidak aktif'
      };
    }

    try {
      const status = await this.page.evaluate(() => {
        return {
          isConnected: !!document.querySelector('[data-meeting-connected]'),
          participantCount: document.querySelector('[data-participant-count]')?.textContent || '0',
          audioStatus: document.querySelector('[data-audio-status]')?.getAttribute('data-status') || 'muted',
          recordingStatus: document.querySelector('[data-recording-status]')?.getAttribute('data-status') || 'stopped',
          transcriptionStatus: document.querySelector('[data-transcription-status]')?.getAttribute('data-status') || 'stopped'
        };
      });

      return {
        status: status.isConnected ? 'connected' : 'disconnected',
        participantCount: parseInt(status.participantCount),
        audioStatus: status.audioStatus as 'active' | 'muted' | 'error',
        recordingStatus: status.recordingStatus as 'recording' | 'stopped' | 'error',
        transcriptionStatus: status.transcriptionStatus as 'active' | 'stopped' | 'error',
        logs: this.logs.slice(-10) // Ambil 10 log terakhir
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  // Handle media permissions
  private async handleMediaPermissions(options: MeetingJoinOptions) {
    if (!this.page) return;

    try {
      // Tunggu sampai kontrol media muncul
      await this.page.waitForSelector('[data-is-muted]', { timeout: 10000 });

      // Matikan kamera jika diminta
      if (!options.enableCamera) {
        await this.page.evaluate(() => {
          const cameraButton = document.querySelector('[data-is-muted="false"][aria-label*="camera"]');
          if (cameraButton) {
            (cameraButton as HTMLElement).click();
          }
        });
      }

      // Matikan mikrofon jika diminta
      if (!options.enableMicrophone) {
        await this.page.evaluate(() => {
          const micButton = document.querySelector('[data-is-muted="false"][aria-label*="microphone"]');
          if (micButton) {
            (micButton as HTMLElement).click();
          }
        });
      }
    } catch (error) {
      this.addLog(`Warning: Gagal mengatur media permissions: ${error}`);
      // Lanjutkan proses meskipun gagal mengatur permissions
    }
  }

  // Handle proses join meeting
  private async handleJoinFlow() {
    if (!this.page) return;

    try {
      // Tunggu tombol join
      await this.page.waitForSelector('[aria-label*="Join now"], [aria-label*="Ask to join"]', { timeout: 30000 });

      // Set display name jika ada
      if (this.credentials?.displayName) {
        const nameInput = await this.page.$('input[aria-label*="name"]');
        if (nameInput) {
          await nameInput.click({ clickCount: 3 }); // Select all text
          await nameInput.type(this.credentials.displayName);
        }
      }

      // Klik tombol join
      await this.page.evaluate(() => {
        const joinButton = document.querySelector('[aria-label*="Join now"], [aria-label*="Ask to join"]');
        if (joinButton) {
          (joinButton as HTMLElement).click();
        }
      });

      // Tunggu sampai benar-benar masuk meeting
      await this.page.waitForSelector('[data-meeting-connected]', { timeout: 60000 });
      this.addLog('Berhasil join meeting');

    } catch (error) {
      this.addLog(`Error dalam proses join: ${error}`);
      throw new Error('Gagal join meeting');
    }
  }

  // Monitoring status meeting
  private startStatusMonitoring() {
    if (!this.page || !this.sessionId) return;

    this.statusInterval = setInterval(async () => {
      try {
        const status = await this.getStatus();
        this.addLog(`Status Update: ${JSON.stringify(status)}`);
      } catch (error) {
        this.addLog(`Error monitoring status: ${error}`);
      }
    }, 5000);
  }

  // Setup monitoring browser seperti meeting.ai
  private async setupBrowserMonitoring() {
    if (!this.page) return;

    // Monitor console messages dengan level
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        this.metrics.errors++;
        this.addLog(`Browser Error: ${text}`, new Error(text));
      } else if (type === 'warn') {
        this.metrics.warnings++;
        this.addLog(`Browser Warning: ${text}`);
      } else {
        this.addLog(`Browser Console: ${text}`);
      }
    });

    // Monitor network requests dengan metrics
    await this.page.setRequestInterception(true);
    this.page.on('request', request => {
      this.metrics.networkRequests++;
      const url = request.url();
      if (url.includes('meet.google.com')) {
        this.addLog(`Network Request: ${request.method()} ${url}`);
      }
      request.continue();
    });

    this.page.on('response', async response => {
      const url = response.url();
      if (url.includes('meet.google.com')) {
        const status = response.status();
        if (status >= 400) {
          this.metrics.errors++;
          this.addLog(`Network Error: ${status} ${url}`, new Error(`HTTP ${status}`));
        } else {
          this.addLog(`Network Response: ${status} ${url}`);
        }
      }
    });

    // Monitor page errors
    this.page.on('pageerror', error => {
      this.metrics.errors++;
      this.addLog('Page Error:', error);
    });

    // Monitor frame errors
    this.page.on('error', error => {
      this.metrics.errors++;
      this.addLog('Frame Error:', error);
    });
  }

  private addLog(message: string, error?: Error | object) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ${message}`;
    
    if (error instanceof Error) {
      logMessage += `\nError: ${error.message}`;
      if (error.stack) {
        logMessage += `\nStack: ${error.stack}`;
      }
    } else if (error) {
      logMessage += `\nDetails: ${JSON.stringify(error, null, 2)}`;
    }
    
    this.logs.push(logMessage);
    console.log(logMessage);
  }
}
