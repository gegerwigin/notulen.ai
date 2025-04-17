import * as puppeteer from 'puppeteer';
import { MeetingInfo } from '../utils/platformDetector';

export interface AudioStream {
  // To be implemented based on audio capture method
}

export abstract class BasePlatformHandler {
  protected browser: puppeteer.Browser | null = null;
  protected page: puppeteer.Page | null = null;

  constructor() {
    this.initializeBrowser();
  }

  protected async initializeBrowser() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream'
      ]
    });
  }

  abstract joinMeeting(meetingInfo: MeetingInfo): Promise<void>;
  abstract leaveSession(): Promise<void>;
  abstract captureAudio(): Promise<AudioStream>;

  protected async createPage(): Promise<puppeteer.Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Enable audio capture permissions
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

    return page;
  }

  protected async cleanup() {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
} 