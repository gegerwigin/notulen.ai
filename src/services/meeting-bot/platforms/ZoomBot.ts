import { MeetingBotInterface, MeetingBotCredentials, MeetingJoinOptions, MeetingSession, MeetingStatus } from '../MeetingBotInterface';

/**
 * Implementation of MeetingBotInterface for Zoom using server-side approach
 */
export class ZoomBot implements MeetingBotInterface {
    private apiEndpoint: string;
    private apiKey: string;
    private initialized: boolean = false;
    private credentials: MeetingBotCredentials;
    private activeSessions: Map<string, MeetingSession> = new Map();
    private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
    private currentSession: MeetingSession | null = null;

    constructor() {
        this.apiEndpoint = process.env.ZOOM_API_ENDPOINT || 'https://api.zoom.us/v2';
        this.apiKey = process.env.ZOOM_API_KEY || '';
        this.credentials = {};
    }

    /**
     * Check if the bot can handle the given URL
     */
    supportsUrl(url: string): boolean {
        return url.includes('zoom.us') || url.includes('zoomgov.com');
    }

    /**
     * Get the platform name
     */
    getPlatformName(): string {
        return 'Zoom';
    }

    /**
     * Initialize the bot with credentials
     */
    async initialize(credentials: MeetingBotCredentials): Promise<void> {
        this.credentials = credentials;
        if (!credentials.token) {
            throw new Error('Zoom token is required');
        }
        this.initialized = true;
    }

    /**
     * Check if the bot is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Join a Zoom meeting
     */
    async joinMeeting(url: string, options: MeetingJoinOptions = {}): Promise<MeetingSession> {
        if (!this.initialized) {
            throw new Error('Bot not initialized');
        }

        if (!this.supportsUrl(url)) {
            throw new Error('Invalid Zoom URL');
        }

        try {
            // Extract meeting ID from URL
            const meetingId = this.extractMeetingId(url);
            
            // Join meeting using Zoom API
            const response = await fetch(`${this.apiEndpoint}/meetings/${meetingId}/join`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.credentials.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    enable_video: options.enableCamera ?? false,
                    enable_audio: options.enableMicrophone ?? false,
                    participant_name: options.displayName || this.credentials.displayName || 'Bot User'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to join meeting');
            }

            const session: MeetingSession = {
                id: meetingId,
                platform: this.getPlatformName(),
                url: url,
                startTime: new Date(),
                logs: ['Joined meeting successfully']
            };

            this.currentSession = session;
            this.activeSessions.set(meetingId, session);
            this.startStatusPolling(meetingId);

            return session;
        } catch (error) {
            throw new Error(`Failed to join meeting: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Leave the meeting
     */
    async leaveMeeting(): Promise<void> {
        if (!this.currentSession) {
            return;
        }

        try {
            const meetingId = this.currentSession.id;
            
            await fetch(`${this.apiEndpoint}/meetings/${meetingId}/leave`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.credentials.token}`
                }
            });

            // Clear polling interval
            const interval = this.pollingIntervals.get(meetingId);
            if (interval) {
                clearInterval(interval);
                this.pollingIntervals.delete(meetingId);
            }

            // Remove from active sessions
            this.activeSessions.delete(meetingId);
            this.currentSession = null;
        } catch (error) {
            throw new Error(`Failed to leave meeting: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get the current status of the meeting
     */
    async getStatus(): Promise<MeetingStatus> {
        if (!this.currentSession) {
            return {
                status: 'disconnected'
            };
        }

        try {
            const response = await fetch(`${this.apiEndpoint}/meetings/${this.currentSession.id}/status`, {
                headers: {
                    'Authorization': `Bearer ${this.credentials.token}`
                }
            });

            if (!response.ok) {
                return {
                    status: 'error',
                    error: 'Failed to get meeting status'
                };
            }

            const data = await response.json();
            
            return {
                status: 'connected',
                participantCount: data.participant_count,
                audioStatus: data.audio_status,
                recordingStatus: data.recording_status,
                transcriptionStatus: data.transcription_status,
                logs: this.currentSession.logs
            };
        } catch (error) {
            return {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Extract meeting ID from Zoom URL
     */
    private extractMeetingId(url: string): string {
        const match = url.match(/\/j\/(\d+)/);
        if (!match) {
            throw new Error('Invalid Zoom meeting URL');
        }
        return match[1];
    }

    /**
     * Start polling for session status
     */
    private startStatusPolling(meetingId: string) {
        const interval = setInterval(async () => {
            try {
                const status = await this.getStatus();
                const session = this.activeSessions.get(meetingId);
                if (session) {
                    session.logs.push(`Status update: ${JSON.stringify(status)}`);
                }
            } catch (error) {
                console.error('Status polling error:', error);
            }
        }, 30000); // Poll every 30 seconds

        this.pollingIntervals.set(meetingId, interval);
    }
}
