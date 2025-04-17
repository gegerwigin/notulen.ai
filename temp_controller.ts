import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

interface MeetingSession {
    sessionId: string;
    process: ChildProcess;
    status: 'starting' | 'running' | 'error' | 'stopped';
    meetingUrl: string;
    output: string[];
    error: string[];
}

export class MeetingController {
    private sessions: Map<string, MeetingSession>;

    constructor() {
        this.sessions = new Map();
    }

    private findScriptPath(): string {
        const possiblePaths = [
            path.join(__dirname, '../meet.js'),
            path.join(__dirname, 'meet.js'),
            path.join(process.cwd(), 'meet.js')
        ];

        for (const scriptPath of possiblePaths) {
            if (fs.existsSync(scriptPath)) {
                return scriptPath;
            }
        }

        throw new Error('meet.js script not found');
    }

    public startMeeting(meetingUrl: string): { sessionId: string } {
        const sessionId = uuidv4();
        const scriptPath = this.findScriptPath();

        console.log(`Starting meeting with URL: ${meetingUrl}`);
        console.log(`Using script at: ${scriptPath}`);

        const meetingProcess = spawn('node', [scriptPath, meetingUrl], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const session: MeetingSession = {
            sessionId,
            process: meetingProcess,
            status: 'starting',
            meetingUrl,
            output: [],
            error: []
        };

        meetingProcess.stdout.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n').filter(line => line.trim());
            lines.forEach(line => {
                session.output.push(line);
                if (line.includes('Successfully joined the meeting')) {
                    session.status = 'running';
                }
            });
        });

        meetingProcess.stderr.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n').filter(line => line.trim());
            lines.forEach(line => {
                session.error.push(line);
                if (!line.includes('DevTools listening')) {
                    session.status = 'error';
                }
            });
        });

        meetingProcess.on('error', (error: Error) => {
            session.error.push(error.message);
            session.status = 'error';
        });

        meetingProcess.on('exit', (code: number) => {
            if (code !== 0) {
                session.status = 'error';
                session.error.push(`Process exited with code ${code}`);
            } else {
                session.status = 'stopped';
            }
        });

        this.sessions.set(sessionId, session);
        return { sessionId };
    }

    public getMeetingStatus(sessionId: string): { status: string; output: string[]; error: string[] } {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        return {
            status: session.status,
            output: session.output,
            error: session.error
        };
    }

    public stopSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.process) {
            session.process.kill();
            session.status = 'stopped';
        }
    }

    public getAllSessions(): Array<{ sessionId: string; status: string; meetingUrl: string }> {
        return Array.from(this.sessions.entries()).map(([sessionId, session]) => ({
            sessionId,
            status: session.status,
            meetingUrl: session.meetingUrl
        }));
    }
}