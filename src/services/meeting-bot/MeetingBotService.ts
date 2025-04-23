import { 
  MeetingBotInterface, 
  MeetingJoinOptions, 
  MeetingSession, 
  MeetingStatus 
} from './MeetingBotInterface';
import { GoogleMeetBot } from './platforms/GoogleMeetBot';
import { ZoomBot } from './platforms/ZoomBot';
import { TeamsBot } from './platforms/TeamsBot';
import { http } from '../../utils/httpUtil';

// Add type for config
type Environment = 'development' | 'staging' | 'production';
type Config = {
  [K in Environment]: {
    serverUrl: string;
    apiKey: string;
  }
};

const CONFIG: Config = {
  development: {
    serverUrl: 'http://localhost:3001',
    apiKey: 'notulen-ai-bot-key-2024'
  },
  staging: {
    serverUrl: 'https://bot-dev.notula.ai',
    apiKey: 'notulen-ai-bot-key-staging'
  },
  production: {
    serverUrl: 'http://18.141.229.165:3001',
    apiKey: 'notulen-ai-bot-key-2024'
  }
};

// Deklarasi tipe untuk ImportMeta
declare global {
  interface ImportMeta {
    env: {
      VITE_ENVIRONMENT: string;
      VITE_BOT_API_ENDPOINT: string;
      VITE_BOT_API_KEY: string;
    }
  }
}

interface MeetingSession {
  bot: MeetingBotInterface;
  startTime: Date;
  meetingId: string;
  status: 'joining' | 'active' | 'ended';
}

interface MeetingBotInterface {
  joinMeeting(meetingId: string): Promise<void>;
  leaveMeeting(): Promise<void>;
  getStatus(): Promise<'joining' | 'active' | 'ended'>;
  getTranscription(): Promise<string>;
}

export class MeetingBotService {
  private static instance: MeetingBotService;
  private activeSessions: Map<string, MeetingSession> = new Map();
  private bots: Map<string, MeetingBotInterface> = new Map();
  private readonly serverUrl: string;
  private readonly apiKey: string;

  constructor() {
    // Ambil konfigurasi berdasarkan environment
    const environment = import.meta.env.VITE_ENVIRONMENT || 'development';
    const envConfig = CONFIG[environment as keyof typeof CONFIG] || CONFIG.development;

    this.serverUrl = import.meta.env.VITE_BOT_API_ENDPOINT || envConfig.serverUrl;
    this.apiKey = import.meta.env.VITE_BOT_API_KEY || envConfig.apiKey;

    // Initialize bots
    this.bots.set('google-meet', new GoogleMeetBot());
    this.bots.set('zoom', new ZoomBot(this.apiKey, this.serverUrl));
    this.bots.set('teams', new TeamsBot());

    console.log(`MeetingBotService: Initialized in ${environment} environment`);
    console.log(`MeetingBotService: Using server ${this.serverUrl}`);
  }

  // Singleton pattern
  public static getInstance(): MeetingBotService {
    if (!MeetingBotService.instance) {
      MeetingBotService.instance = new MeetingBotService();
    }
    return MeetingBotService.instance;
  }

  // Deteksi platform dari URL
  private detectPlatform(url: string): string {
    if (url.includes('meet.google.com')) return 'google-meet';
    if (url.includes('zoom.us')) return 'zoom';
    if (url.includes('teams.microsoft.com')) return 'teams';
    throw new Error('Platform tidak didukung');
  }

  // Join meeting
  public async joinMeeting(url: string, options: MeetingJoinOptions = {}): Promise<{ sessionId: string }> {
    try {
      console.log('Mencoba join meeting:', url);

      // Deteksi platform
      const platform = this.detectPlatform(url);
      const bot = this.bots.get(platform);

      if (!bot) {
        throw new Error(`Platform ${platform} tidak didukung`);
      }

      // Join meeting melalui bot server
      const response = await http.post<{ success: boolean; sessionId?: string; error?: string }>(
        `${this.serverUrl}/api/join-meeting`,
        {
          url,
          platform,
          options
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      if (!response.success || !response.sessionId) {
        throw new Error(response.error || 'Gagal join meeting');
      }

      // Simpan session yang aktif
      this.activeSessions.set(response.sessionId, {
        platform,
        url,
        startTime: new Date(),
        status: 'joining'
      });

      console.log('Berhasil request bot untuk join meeting:', url);
      return { sessionId: response.sessionId };

    } catch (error: any) {
      console.error('Gagal join meeting:', error);
      throw new Error(error.message || 'Gagal join meeting');
    }
  }

  // Check status meeting
  public async checkStatus(sessionId: string): Promise<MeetingStatus> {
    try {
      const response = await http.get<{
        success: boolean;
        status: MeetingStatus;
        error?: string;
      }>(`${this.serverUrl}/api/meeting-status/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Gagal check status meeting');
      }

      return response.status;

    } catch (error: any) {
      console.error('Error checking meeting status:', error);
      return {
        status: 'error',
        error: error.message || 'Gagal check status meeting'
      };
    }
  }

  // Stop session
  public async stopSession(sessionId: string): Promise<void> {
    try {
      const response = await http.post<{ success: boolean; error?: string }>(
        `${this.serverUrl}/api/stop-session/${sessionId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Gagal stop session meeting');
      }
      
      // Hapus session dari daftar aktif
      this.activeSessions.delete(sessionId);
      console.log('Berhasil stop session meeting:', sessionId);

    } catch (error: any) {
      console.error('Error stopping session:', error);
      throw new Error(error.message || 'Gagal stop session meeting');
    }
  }

  // Get transcription
  public async getTranscription(sessionId: string): Promise<string> {
    try {
      const response = await http.get<{
        success: boolean;
        transcription?: string;
        error?: string;
      }>(`${this.serverUrl}/api/transcription/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.success || !response.transcription) {
        throw new Error(response.error || 'Gagal mendapatkan transkrip');
      }

      return response.transcription;

    } catch (error: any) {
      console.error('Error getting transcription:', error);
      throw new Error(error.message || 'Gagal mendapatkan transkrip');
    }
  }

  private async checkBotServerHealth(): Promise<boolean> {
    try {
      const response = await http.get<{ success: boolean }>(
        `${this.serverUrl}/api/health`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      return response.success;
    } catch (error) {
      console.error('Bot server health check failed:', error);
      return false;
    }
  }

  public getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  public async initialize(): Promise<void> {
    const isHealthy = await this.checkBotServerHealth();
    if (!isHealthy) {
      throw new Error('Bot server is not healthy');
    }
    console.log('Bot server is healthy and ready');
  }

  // Cleanup method for removing stale sessions
  private cleanupStaleSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.activeSessions.entries()) {
      // Remove sessions older than 24 hours
      if (now.getTime() - session.startTime.getTime() > 24 * 60 * 60 * 1000) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

