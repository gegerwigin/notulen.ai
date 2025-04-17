import { Browser } from 'puppeteer-core';
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
 * Implementation of MeetingBotInterface for Microsoft Teams
 */
export class TeamsBot implements MeetingBotInterface {
  private browser: Browser | null = null;
  private _credentials: MeetingBotCredentials | null = null;
  private _initialized = false;

  /**
   * Check if the given URL is a Microsoft Teams URL
   */
  supportsUrl(url: string): boolean {
    return url.includes('teams.microsoft.com') || url.includes('teams.live.com');
  }

  /**
   * Get the platform name
   */
  getPlatformName(): string {
    return 'Microsoft Teams';
  }

  /**
   * Initialize the Teams bot with credentials
   */
  async initialize(credentials: MeetingBotCredentials): Promise<void> {
    this._credentials = credentials;
    
    try {
      const puppeteer = await getPuppeteer();
      this.browser = await puppeteer.launch(getBrowserLaunchOptions());
      this._initialized = true;
      console.log('TeamsBot: Initialized successfully');
      
      if (this._credentials?.user?.email) {
        console.log(`TeamsBot: Initialized with user email: ${this._credentials.user.email}`);
      } else {
        console.log('TeamsBot: Initialized without user credentials');
      }
    } catch (error) {
      console.error('TeamsBot: Failed to initialize:', error);
      throw new Error('Failed to initialize Teams bot');
    }
  }

  /**
   * Check if the bot is initialized
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Join a Microsoft Teams meeting
   */
  async joinMeeting(meetingUrl: string, options: MeetingJoinOptions = {}): Promise<MeetingSession> {
    if (!this._initialized || !this.browser) {
      throw new Error('Microsoft Teams bot is not initialized');
    }

    try {
      const page = await this.browser.newPage();
      await page.goto(meetingUrl, { waitUntil: 'networkidle2' });

      // Implement Teams joining logic here
      // This is a placeholder for the actual implementation
      
      // Configure camera and microphone based on options
      const enableCamera = options.enableCamera ?? false;
      const enableMicrophone = options.enableMicrophone ?? false;
      
      console.log(`TeamsBot: Joining with camera: ${enableCamera}, microphone: ${enableMicrophone}`);
      
      // Use display name from options or credentials or default
      const displayName = options.displayName || 
                          this._credentials?.user?.displayName || 
                          'Notulen.ai Bot';
      console.log(`TeamsBot: Using display name: ${displayName}`);

      // Generate a unique session ID
      const sessionId = `teams-${uuidv4()}`;

      // Create and return a meeting session
      const session: MeetingSession = {
        id: sessionId,
        platform: 'Microsoft Teams',
        url: meetingUrl,
        startTime: new Date(),
        leaveMeeting: async () => {
          await page.close();
          console.log('TeamsBot: Left meeting');
        },
        getTranscription: async () => {
          // Implement transcription logic here
          return 'Microsoft Teams transcription not implemented yet';
        },
        isSessionActive: () => {
          return !page.isClosed();
        }
      };

      return session;
    } catch (error) {
      console.error('TeamsBot: Failed to join meeting:', error);
      throw new Error(`Failed to join Microsoft Teams meeting: ${error}`);
    }
  }

  /**
   * Leave the current Teams meeting
   */
  async leaveMeeting(): Promise<void> {
    if (!this.browser) {
      throw new Error('No active meeting to leave');
    }

    try {
      const pages = await this.browser.pages();
      for (const page of pages) {
        await page.close();
      }
      console.log('TeamsBot: Left meeting');
    } catch (error) {
      console.error('TeamsBot: Error leaving meeting:', error);
      throw new Error('Failed to leave Teams meeting');
    }
  }

  /**
   * Get the current meeting status
   */
  async getStatus(): Promise<MeetingStatus> {
    if (!this.browser) {
      return {
        status: 'disconnected'
      };
    }

    try {
      const pages = await this.browser.pages();
      if (pages.length === 0) {
        return {
          status: 'disconnected'
        };
      }

      // Check if we're still in a meeting
      const activePage = pages[0];
      const isConnected = !activePage.isClosed();

      return {
        status: isConnected ? 'connected' : 'disconnected',
        logs: ['TeamsBot: Meeting status checked']
      };
    } catch (error) {
      return {
        status: 'error',
        error: `Failed to get Teams meeting status: ${error}`
      };
    }
  }
}
