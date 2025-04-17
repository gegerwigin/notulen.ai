import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MeetingSession {
  id: string;
  url: string;
  status: 'starting' | 'running' | 'error' | 'stopped';
  error?: string;
  process?: any;
  startTime: Date;
}

export class MeetingController {
  private sessions: Map<string, MeetingSession>;

  constructor() {
    this.sessions = new Map();
  }

  async startMeetingSession(meetingUrl: string): Promise<string> {
    const sessionId = uuidv4();
    const meetScriptPath = path.join(__dirname, '../meet.js');

    const session: MeetingSession = {
      id: sessionId,
      url: meetingUrl,
      status: 'starting',
      startTime: new Date()
    };

    try {
      const scriptProcess = spawn('node', [meetScriptPath, meetingUrl], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      session.process = scriptProcess;
      this.sessions.set(sessionId, session);

      scriptProcess.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          console.log(`[Session ${sessionId}] ${line}`);
          if (line.includes('Successfully joined the meeting')) {
            session.status = 'running';
          }
        });
      });

      scriptProcess.stderr.on('data', (data: Buffer) => {
        const error = data.toString();
        console.error(`[Session ${sessionId}] Error: ${error}`);
        session.error = error;
        session.status = 'error';
      });

      scriptProcess.on('close', (code: number) => {
        console.log(`[Session ${sessionId}] Process exited with code ${code}`);
        if (session.status !== 'error') {
          session.status = 'stopped';
        }
      });

      return sessionId;
    } catch (error) {
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';
      this.sessions.set(sessionId, session);
      throw error;
    }
  }

  getMeetingStatus(sessionId: string): MeetingSession | undefined {
    return this.sessions.get(sessionId);
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.process) {
      session.process.kill();
      session.status = 'stopped';
    }
  }

  getAllSessions(): MeetingSession[] {
    return Array.from(this.sessions.values());
  }
} 