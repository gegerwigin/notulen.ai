import { spawn, exec, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import * as os from 'os';

interface Session {
  id: string;
  process: ChildProcess | null;
  platform: string;
  status: 'connecting' | 'joined' | 'recording' | 'error' | 'left';
  error?: string;
  startTime: Date;
  meetingUrl: string;
  logs: string[];
}

export class MeetingController {
  private sessions: Map<string, Session> = new Map();
  private rootDir = path.resolve(__dirname, '../../..');
  private isWindows = os.platform() === 'win32';

  async joinMeeting(meetingUrl: string, platform: string = 'google-meet'): Promise<string> {
    const sessionId = uuidv4();

    try {
      console.log('Starting bot to join meeting:', meetingUrl);
      
      // Ensure meet.js is in the root directory
      const meetJsPath = path.join(this.rootDir, 'meet.js');
      if (!fs.existsSync(meetJsPath)) {
        throw new Error('meet.js script not found');
      }
      
      // Kill any existing Chrome processes to avoid conflicts
      if (this.isWindows) {
        exec('taskkill /F /IM chrome.exe', () => {
          console.log('Attempted to kill existing Chrome processes');
        });
      } else {
        exec('pkill -f chrome', () => {
          console.log('Attempted to kill existing Chrome processes');
        });
      }
      
      // Create session with initial status
      const session: Session = {
        id: sessionId,
        process: null,
        platform,
        status: 'connecting',
        startTime: new Date(),
        meetingUrl,
        logs: []
      };
      
      this.sessions.set(sessionId, session);
      
      // Start the meet.js script with the meeting URL as an argument
      const envVars = { ...process.env, NODE_NO_WARNINGS: '1' };
      
      const scriptProcess = spawn('node', [meetJsPath, meetingUrl], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: envVars
      });
      
      session.process = scriptProcess;
      
      if (scriptProcess.pid) {
        console.log(`Started meet.js process with pid ${scriptProcess.pid}`);
      }
      
      // Log last 100 lines for debugging
      const addLog = (log: string) => {
        // Max log lines to keep
        const MAX_LOGS = 100;
        session.logs.push(log);
        if (session.logs.length > MAX_LOGS) {
          session.logs.shift();
        }
      };
      
      // Handle process output
      if (scriptProcess.stdout) {
        scriptProcess.stdout.on('data', (data) => {
          const output = data.toString();
          const lines = output.split('\n').filter(line => line.trim() !== '');
          
          lines.forEach(line => {
            console.log(`Bot output (${sessionId}): ${line}`);
            addLog(line);
            
            // Update status based on output
            if (line.includes('SUKSES: Berhasil join meeting')) {
              session.status = 'joined';
            } else if (line.includes('Masih dalam meeting')) {
              session.status = 'joined';
            } else if (line.includes('Error') || line.includes('GAGAL')) {
              if (session.status !== 'joined') {
                session.status = 'error';
                session.error = line;
              }
            } else if (line.includes('BERHASIL mengklik tombol join')) {
              session.status = 'joined';
            }
          });
        });
      }
      
      if (scriptProcess.stderr) {
        scriptProcess.stderr.on('data', (data) => {
          const output = data.toString();
          console.error(`Bot error (${sessionId}): ${output}`);
          addLog(`ERROR: ${output}`);
          
          // Don't update status if we're already joined 
          // (Chrome often outputs errors to stderr even when working correctly)
          if (session.status !== 'joined') {
            session.error = output;
          }
        });
      }
      
      scriptProcess.on('close', (code) => {
        console.log(`Bot process exited with code ${code}`);
        addLog(`Process exited with code ${code}`);
        
        // Only update status if not already in error state
        if (session.status !== 'error') {
          session.status = 'left';
        }
      });

      // Wait a bit before returning to collect initial status
      await new Promise(resolve => setTimeout(resolve, 5000));
      return sessionId;

    } catch (error: any) {
      console.error('Failed to join meeting:', error);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'error';
        session.error = error.message;
      }
      throw error;
    }
  }

  async getSessionStatus(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    return {
      status: session.status,
      error: session.error,
      meetingUrl: session.meetingUrl,
      startTime: session.startTime,
      logs: session.logs.slice(-10) // Return last 10 log entries
    };
  }
  
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    try {
      // First try to gracefully terminate the process
      if (session.process) {
        session.process.kill();
      }
      
      // Kill any Chrome processes launched by this session
      if (this.isWindows) {
        exec('taskkill /F /IM chrome.exe', () => {});
      } else {
        exec('pkill -f chrome', () => {});
      }
      
      session.status = 'left';
      this.sessions.delete(sessionId);
    } catch (error) {
      console.error('Error stopping session:', error);
      throw error;
    }
  }
  
  getAllSessions() {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      status: session.status,
      meetingUrl: session.meetingUrl,
      startTime: session.startTime,
      error: session.error
    }));
  }
} 