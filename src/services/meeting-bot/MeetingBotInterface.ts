/**
 * Interface untuk semua implementasi bot meeting
 */
export interface MeetingBotInterface {
  /**
   * Check if the bot can handle the given URL
   */
  supportsUrl(url: string): boolean;
  
  /**
   * Get the name of the meeting platform
   */
  getPlatformName(): string;
  
  /**
   * Initialize the bot with credentials
   */
  initialize(credentials: MeetingBotCredentials): Promise<void>;
  
  /**
   * Check if the bot is initialized
   */
  isInitialized(): boolean;
  
  /**
   * Join a meeting
   */
  joinMeeting(url: string, options?: MeetingJoinOptions): Promise<MeetingSession>;
  
  /**
   * Leave a meeting
   */
  leaveMeeting(): Promise<void>;
  
  /**
   * Get the status of the meeting
   */
  getStatus(): Promise<MeetingStatus>;
}

/**
 * Opsi untuk join meeting
 */
export interface MeetingJoinOptions {
  enableCamera?: boolean;
  enableMicrophone?: boolean;
  displayName?: string;
  captureAudio?: boolean;
  onTranscriptionUpdate?: (text: string) => void;
  autoLeaveAfterMeetingEnds?: boolean;
  maxDurationMinutes?: number;
}

/**
 * Interface untuk session meeting
 */
export interface MeetingSession {
  id: string;
  platform: string;
  url: string;
  startTime: Date;
  logs: string[];
}

/**
 * Status meeting
 */
export interface MeetingStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'left';
  error?: string;
  participantCount?: number;
  audioStatus?: 'active' | 'muted' | 'error';
  recordingStatus?: 'recording' | 'stopped' | 'error';
  transcriptionStatus?: 'active' | 'stopped' | 'error';
  logs?: string[];
}

/**
 * Kredensial bot
 */
export interface MeetingBotCredentials {
  email?: string;
  password?: string;
  token?: string;
  displayName?: string;
}
