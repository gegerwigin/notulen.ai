import puppeteer, { Browser, Page } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import { GoogleMeetBot } from '../../src/services/meeting-bot/platforms/GoogleMeetBot';
import { ZoomBot } from '../../src/services/meeting-bot/platforms/ZoomBot';
import { MeetingBotInterface, MeetingJoinOptions, MeetingSession as BotSession } from '../../src/services/meeting-bot/MeetingBotInterface';

interface MeetingSession extends BotSession {
    bot: MeetingBotInterface;
    status: 'connecting' | 'joined' | 'error' | 'stopped';
    lastError?: string;
    startTime: Date;
}

export class MeetingController {
    private sessions: Map<string, MeetingSession> = new Map();
    private bots: Map<string, MeetingBotInterface>;

    constructor() {
        this.bots = new Map();
        this.bots.set('meet.google.com', new GoogleMeetBot());
        this.bots.set('zoom.us', new ZoomBot());
    }

    private getBotForUrl(url: string): MeetingBotInterface {
        for (const [domain, bot] of this.bots.entries()) {
            if (url.includes(domain) && bot.supportsUrl(url)) {
                return bot;
            }
        }
        throw new Error('Unsupported meeting platform');
    }

    public async joinMeeting(meetingUrl: string, options: MeetingJoinOptions = {}): Promise<string> {
        const sessionId = uuidv4();
        console.log('Starting new session:', sessionId, 'for URL:', meetingUrl);

        try {
            const bot = this.getBotForUrl(meetingUrl);
            
            if (!bot.isInitialized()) {
                await bot.initialize();
            }

            const session: MeetingSession = {
                id: sessionId,
                bot,
                platform: bot.getPlatformName(),
                url: meetingUrl,
                status: 'connecting',
                startTime: new Date(),
                logs: []
            };

            this.sessions.set(sessionId, session);

            // Join meeting with options
            await bot.joinMeeting({
                ...options,
                url: meetingUrl
            });

            session.status = 'joined';
            return sessionId;

        } catch (error: any) {
            console.error('Failed to join meeting:', error);
            const session = this.sessions.get(sessionId);
            if (session) {
                session.status = 'error';
                session.lastError = error.message;
                session.logs.push({
                    timestamp: new Date(),
                    level: 'error',
                    message: error.message,
                    stack: error.stack
                });
            }
            throw error;
        }
    }

    public async stopSession(sessionId: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        try {
            await session.bot.leaveMeeting();
            session.status = 'stopped';
            return true;
        } catch (error: any) {
            console.error('Error stopping session:', error);
            session.lastError = error.message;
            session.logs.push({
                timestamp: new Date(),
                level: 'error',
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    public getSessionStatus(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }

        const botStatus = session.bot.getStatus();
        return {
            sessionId: session.id,
            platform: session.platform,
            url: session.url,
            status: session.status,
            startTime: session.startTime,
            lastError: session.lastError,
            botStatus,
            logs: session.logs
        };
    }

    public getAllSessions() {
        return Array.from(this.sessions.values()).map(session => ({
            sessionId: session.id,
            platform: session.platform,
            url: session.url,
            status: session.status,
            startTime: session.startTime,
            lastError: session.lastError
        }));
    }
} 