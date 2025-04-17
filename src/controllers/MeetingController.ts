import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface MeetingSession {
  id: string;
  meetingUrl: string;
  scriptProcess: any;
  status: string;
  startTime: Date;
  output: string[];
}

const activeSessions: { [key: string]: MeetingSession } = {};

export const joinMeeting = async (req: Request, res: Response) => {
  try {
    const { meetingUrl } = req.body;

    if (!meetingUrl) {
      return res.status(400).json({ error: 'Meeting URL is required' });
    }

    const sessionId = uuidv4();
    const scriptPath = path.join(__dirname, '../puppeteer.js');

    const scriptProcess = spawn('node', [scriptPath, meetingUrl]);
    const session: MeetingSession = {
      id: sessionId,
      meetingUrl,
      scriptProcess,
      status: 'starting',
      startTime: new Date(),
      output: []
    };

    scriptProcess.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        session.output.push(line);
        console.log(`[Session ${sessionId}] ${line}`);
      });
    });

    scriptProcess.stderr.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        session.output.push(`ERROR: ${line}`);
        console.error(`[Session ${sessionId}] ERROR: ${line}`);
      });
    });

    scriptProcess.on('close', (code: number) => {
      session.status = code === 0 ? 'completed' : 'error';
      console.log(`[Session ${sessionId}] Process exited with code ${code}`);
    });

    activeSessions[sessionId] = session;

    return res.json({
      sessionId,
      message: 'Meeting join process started',
      status: session.status
    });

  } catch (error) {
    console.error('Error in joinMeeting:', error);
    return res.status(500).json({ error: 'Failed to start meeting process' });
  }
};

export const getMeetingStatus = (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = activeSessions[sessionId];

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json({
    sessionId: session.id,
    meetingUrl: session.meetingUrl,
    status: session.status,
    startTime: session.startTime,
    output: session.output
  });
};

export const stopSession = (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = activeSessions[sessionId];

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    if (session.scriptProcess) {
      session.scriptProcess.kill();
    }
    session.status = 'stopped';
    return res.json({ message: 'Session stopped successfully' });
  } catch (error) {
    console.error('Error stopping session:', error);
    return res.status(500).json({ error: 'Failed to stop session' });
  }
};

export const listSessions = (_req: Request, res: Response) => {
  const sessions = Object.values(activeSessions).map(session => ({
    id: session.id,
    meetingUrl: session.meetingUrl,
    status: session.status,
    startTime: session.startTime
  }));

  return res.json(sessions);
}; 