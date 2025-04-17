import { BasePlatformHandler, AudioStream } from './BasePlatformHandler';
import { MeetingInfo } from '../utils/platformDetector';

export class GoogleMeetHandler extends BasePlatformHandler {
  async joinMeeting(meetingInfo: MeetingInfo): Promise<void> {
    try {
      this.page = await this.createPage();
      console.log('Starting Google Meet join process...');
      
      await this.page.goto(meetingInfo.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log('Page loaded successfully');

      // Handle dismiss button if present
      try {
        await this.page.waitForSelector('button[aria-label="Dismiss"]', { timeout: 5000 });
        await this.page.click('button[aria-label="Dismiss"]');
        console.log('Dismissed initial popup');
      } catch (e) {
        console.log('No dismiss button found, continuing...');
      }

      // Join as guest
      await this.page.waitForSelector('button[jsname="Qx7uuf"]', { timeout: 10000 });
      await this.page.click('button[jsname="Qx7uuf"]');
      console.log('Clicked "Join as a guest" button');

      // Enter bot name
      await this.page.waitForSelector('input[jsname="YPqjbf"]', { timeout: 10000 });
      await this.page.type('input[jsname="YPqjbf"]', 'Notula AI Bot');
      console.log('Entered guest name');

      // Ask to join
      await this.page.waitForSelector('button[jsname="QkA63b"]', { timeout: 10000 });
      await this.page.click('button[jsname="QkA63b"]');
      console.log('Clicked "Ask to join" button');

      // Wait for join confirmation
      try {
        await this.page.waitForSelector('button[jsname="Qx7uuf"]', { timeout: 20000 });
        await this.page.click('button[jsname="Qx7uuf"]');
        console.log('Successfully joined the meeting');
      } catch (e) {
        console.log('Waiting for host to let bot in...');
      }

      // Verify meeting join
      await this.page.waitForSelector('div[jscontroller="xH1vrd"]', { timeout: 10000 });
      console.log('Meeting controls visible - successfully in meeting');
      
    } catch (error) {
      console.error('Error joining Google Meet:', error);
      await this.cleanup();
      throw error;
    }
  }

  async leaveSession(): Promise<void> {
    if (this.page) {
      try {
        // Click leave call button
        await this.page.click('button[aria-label="Leave call"]');
        console.log('Left the meeting');
      } catch (error) {
        console.error('Error leaving meeting:', error);
      }
      await this.cleanup();
    }
  }

  async captureAudio(): Promise<AudioStream> {
    // To be implemented - will use browser's audio capture capabilities
    throw new Error('Audio capture not implemented yet');
  }
} 