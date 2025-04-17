import { MeetingBotInterface, MeetingJoinOptions, MeetingSession, MeetingBotCredentials } from '../MeetingBotInterface';
import { v4 as uuidv4 } from 'uuid';
import zoomService from '../../zoomService';
import { auth } from '../../../firebase';

/**
 * Bot Zoom yang menggunakan Zoom SDK Web untuk bergabung sebagai peserta terpisah
 */
export class ZoomSdkBot implements MeetingBotInterface {
  private isInitialized = false;
  private botName: string = 'Note Taker';
  private zoomSdkLoaded = false;
  private iframeContainer: HTMLDivElement | null = null;
  // Simpan credentials untuk digunakan saat bergabung meeting
  private credentials: MeetingBotCredentials | null = null;

  /**
   * Initialize the Zoom SDK bot
   */
  async initialize(credentials: MeetingBotCredentials): Promise<void> {
    if (this.isInitialized) {
      console.log('ZoomSdkBot: Already initialized');
      return;
    }

    try {
      this.credentials = credentials;
      
      // Set nama bot berdasarkan user yang login
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.displayName) {
        this.botName = `${currentUser.displayName}'s Note Taker`;
      } else if (currentUser && currentUser.email) {
        const username = currentUser.email.split('@')[0];
        this.botName = `${username}'s Note Taker`;
      } else if (credentials.user?.email) {
        const username = credentials.user.email.split('@')[0];
        this.botName = `${username}'s Note Taker`;
      }
      
      console.log(`ZoomSdkBot: Bot name set to "${this.botName}"`);
      
      // Load Zoom SDK Web
      await this.loadZoomSdk();
      
      // Buat container untuk iframe Zoom
      this.createIframeContainer();
      
      this.isInitialized = true;
      console.log('ZoomSdkBot: Initialized successfully');
    } catch (error) {
      console.error('ZoomSdkBot: Failed to initialize', error);
      throw new Error(`Failed to initialize Zoom SDK bot: ${error}`);
    }
  }

  /**
   * Check if the given URL is supported by this meeting bot
   */
  canHandleUrl(url: string): boolean {
    const zoomPatterns = [
      /zoom\.us\/j\//i,
      /zoom\.us\/meeting\//i,
      /zoom\.us\/s\//i,
      /zoom\.us\/wc\//i
    ];

    return zoomPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Load Zoom SDK Web script
   */
  private async loadZoomSdk(): Promise<void> {
    if (this.zoomSdkLoaded) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const script = document.createElement('script');
        script.src = 'https://source.zoom.us/2.18.0/lib/vendor/react.min.js';
        script.async = true;
        script.onload = () => {
          const scriptR = document.createElement('script');
          scriptR.src = 'https://source.zoom.us/2.18.0/lib/vendor/react-dom.min.js';
          scriptR.async = true;
          scriptR.onload = () => {
            const scriptZ = document.createElement('script');
            scriptZ.src = 'https://source.zoom.us/2.18.0/zoom-meeting-embedded-2.18.0.min.js';
            scriptZ.async = true;
            scriptZ.onload = () => {
              console.log('ZoomSdkBot: Zoom SDK loaded successfully');
              this.zoomSdkLoaded = true;
              resolve();
            };
            scriptZ.onerror = (error) => {
              reject(new Error(`Failed to load Zoom SDK: ${error}`));
            };
            document.body.appendChild(scriptZ);
          };
          scriptR.onerror = (error) => {
            reject(new Error(`Failed to load React DOM: ${error}`));
          };
          document.body.appendChild(scriptR);
        };
        script.onerror = (error) => {
          reject(new Error(`Failed to load React: ${error}`));
        };
        document.body.appendChild(script);
      } catch (error) {
        reject(new Error(`Error setting up Zoom SDK: ${error}`));
      }
    });
  }

  /**
   * Create container for Zoom SDK iframe
   */
  private createIframeContainer(): void {
    // Hapus container lama jika ada
    if (this.iframeContainer) {
      document.body.removeChild(this.iframeContainer);
    }

    // Buat container baru
    this.iframeContainer = document.createElement('div');
    this.iframeContainer.id = 'zoom-sdk-container';
    this.iframeContainer.style.position = 'fixed';
    this.iframeContainer.style.right = '20px';
    this.iframeContainer.style.bottom = '20px';
    this.iframeContainer.style.width = '400px';
    this.iframeContainer.style.height = '300px';
    this.iframeContainer.style.zIndex = '9999';
    this.iframeContainer.style.border = '1px solid #ccc';
    this.iframeContainer.style.borderRadius = '8px';
    this.iframeContainer.style.overflow = 'hidden';
    this.iframeContainer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    this.iframeContainer.style.backgroundColor = '#fff';
    
    document.body.appendChild(this.iframeContainer);
  }

  /**
   * Extract meeting ID from Zoom URL
   */
  private extractMeetingId(url: string): string | null {
    // Match patterns like zoom.us/j/1234567890 or zoom.us/meeting/1234567890
    const patterns = [
      /zoom\.us\/j\/(\d+)/i,
      /zoom\.us\/meeting\/(\d+)/i,
      /zoom\.us\/s\/(\d+)/i,
      /zoom\.us\/wc\/(\d+)/i,
      /(\d{9,11})/ // Fallback to just looking for 9-11 digit numbers
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract password from Zoom URL if present
   */
  private extractPassword(url: string): string | null {
    const pwdMatch = url.match(/[?&]pwd=([^&]+)/i);
    return pwdMatch ? pwdMatch[1] : null;
  }

  /**
   * Get the platform name
   */
  getPlatformName(): string {
    return 'zoom';
  }

  /**
   * Join a Zoom meeting using Zoom SDK Web
   */
  async joinMeeting(meetingUrl: string, options: MeetingJoinOptions = {}): Promise<MeetingSession> {
    console.log(`ZoomSdkBot: Joining meeting with URL: ${meetingUrl}`);
    
    if (!this.isInitialized) {
      console.error('ZoomSdkBot: Not initialized. Call initialize() first.');
      throw new Error('ZoomSdkBot not initialized. Call initialize() first.');
    }

    const meetingId = this.extractMeetingId(meetingUrl);
    if (!meetingId) {
      console.error('ZoomSdkBot: Invalid Zoom URL format');
      throw new Error('Invalid Zoom URL format');
    }
    
    const password = this.extractPassword(meetingUrl);
    console.log(`ZoomSdkBot: Extracted meeting ID: ${meetingId}, password present: ${password ? 'yes' : 'no'}`);

    // Set default options
    const joinOptions: Required<MeetingJoinOptions> = {
      enableCamera: options.enableCamera ?? false,
      enableMicrophone: options.enableMicrophone ?? false,
      displayName: options.displayName ?? this.botName,
      captureAudio: options.captureAudio ?? true,
      onTranscriptionUpdate: options.onTranscriptionUpdate ?? (() => {}),
      autoLeaveAfterMeetingEnds: options.autoLeaveAfterMeetingEnds ?? true,
      maxDurationMinutes: options.maxDurationMinutes ?? 240
    };

    // Buat session ID
    const sessionId = uuidv4();
    
    try {
      console.log('ZoomSdkBot: Getting signature from Zoom API...');
      
      // Dapatkan signature untuk Zoom SDK menggunakan credentials yang disimpan
      const apiResponse = await zoomService.getZoomSignature(meetingId, joinOptions.displayName, this.credentials);
      
      if (!apiResponse.success) {
        throw new Error(`Failed to get Zoom signature: ${apiResponse.error}`);
      }
      
      console.log('ZoomSdkBot: Successfully got Zoom signature');
      
      // Buka URL Zoom di iframe terpisah untuk bergabung sebagai peserta baru
      console.log('ZoomSdkBot: Opening Zoom meeting in separate iframe...');
      
      // Buat URL Zoom yang dapat dibuka di iframe
      const encodedDisplayName = encodeURIComponent(joinOptions.displayName);
      const zoomWebUrl = `https://zoom.us/wc/${meetingId}/join${password ? `?pwd=${password}&` : '?'}displayName=${encodedDisplayName}`;
      
      // Buat iframe untuk Zoom
      if (!this.iframeContainer) {
        this.createIframeContainer();
      }
      
      const iframe = document.createElement('iframe');
      iframe.src = zoomWebUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      
      // Hapus konten lama di container
      if (this.iframeContainer) {
        this.iframeContainer.innerHTML = '';
        this.iframeContainer.appendChild(iframe);
      }
      
      console.log(`ZoomSdkBot: Created meeting session with ID: ${sessionId}`);
      
      // Return meeting session
      return {
        sessionId,
        platform: this.getPlatformName(),
        meetingUrl,
        joinedAt: new Date(),
        
        async leaveMeeting(): Promise<void> {
          // Hapus iframe untuk meninggalkan meeting
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          console.log(`ZoomSdkBot: Left meeting session ${sessionId}`);
        },
        
        async getTranscription(): Promise<string> {
          // Implementasi untuk mendapatkan transkripsi
          return '';
        },
        
        async isActive(): Promise<boolean> {
          return iframe.parentNode !== null;
        }
      };
    } catch (error) {
      console.error('ZoomSdkBot: Failed to join meeting', error);
      
      // Fallback ke membuka Zoom di tab baru jika iframe gagal
      console.log('ZoomSdkBot: Creating fallback meeting session');
      
      // Buka URL di tab baru
      const encodedDisplayName = encodeURIComponent(joinOptions.displayName);
      const zoomWebUrl = `https://zoom.us/wc/${meetingId}/join${password ? `?pwd=${password}&` : '?'}displayName=${encodedDisplayName}`;
      window.open(zoomWebUrl, '_blank');
      
      // Return fallback meeting session
      return {
        sessionId,
        platform: this.getPlatformName(),
        meetingUrl,
        joinedAt: new Date(),
        
        async leaveMeeting(): Promise<void> {
          console.log(`ZoomSdkBot: Fallback session ${sessionId} ended.`);
        },
        
        async getTranscription(): Promise<string> {
          return 'Transcription not available in fallback mode.';
        },
        
        async isActive(): Promise<boolean> {
          return false;
        }
      };
    }
  }
}

// Tambahkan deklarasi untuk Zoom SDK Web
declare global {
  interface Window {
    ZoomMtg: {
      setZoomJSLib: (path: string, dir: string) => void;
      preLoadWasm: () => void;
      prepareWebSDK: () => void;
      i18n: {
        load: (lang: string) => void;
        reload: (lang: string) => void;
      };
      join: (options: {
        signature: string;
        meetingNumber: string;
        userName: string;
        sdkKey: string;
        userEmail: string;
        passWord: string;
        success: (success: any) => void;
        error: (error: any) => void;
      }) => void;
      leaveMeeting: (options: {
        success: () => void;
        error: (error: any) => void;
      }) => void;
    };
  }
}
