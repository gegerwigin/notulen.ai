import express, { Request, Response } from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

interface MeetingSession {
  sessionId: string;
  process: any;
  status: string;
  meetingUrl: string;
  startTime: Date;
}

const activeSessions: { [key: string]: MeetingSession } = {};

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/api/join-meeting', (req: Request, res: Response) => {
  const { meetingUrl } = req.body;
  
  if (!meetingUrl) {
    return res.status(400).json({ error: 'Meeting URL is required' });
  }

  const sessionId = uuidv4();
  const scriptPath = path.join(__dirname, 'meet.cjs');
  
  const process = spawn('node', [scriptPath, meetingUrl]);
  const session: MeetingSession = {
    sessionId,
    process,
    status: 'starting',
    meetingUrl,
    startTime: new Date()
  };

  activeSessions[sessionId] = session;

  process.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[${sessionId}] ${output}`);
    if (output.includes('Successfully joined the meeting')) {
      session.status = 'joined';
    }
  });

  process.stderr.on('data', (data) => {
    console.error(`[${sessionId}] Error: ${data}`);
    session.status = 'error';
  });

  process.on('close', (code) => {
    console.log(`[${sessionId}] Process exited with code ${code}`);
    session.status = 'ended';
    delete activeSessions[sessionId];
  });

  res.json({ 
    sessionId,
    status: session.status,
    message: 'Meeting join process started'
  });
});

app.get('/api/meeting-status/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = activeSessions[sessionId];

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId: session.sessionId,
    status: session.status,
    meetingUrl: session.meetingUrl,
    startTime: session.startTime
  });
});

app.post('/api/stop-session/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = activeSessions[sessionId];

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.process) {
    session.process.kill();
  }

  delete activeSessions[sessionId];
  res.json({ message: 'Session stopped successfully' });
});

app.get('/api/meeting-sessions', (req: Request, res: Response) => {
  const sessions = Object.values(activeSessions).map(session => ({
    sessionId: session.sessionId,
    status: session.status,
    meetingUrl: session.meetingUrl,
    startTime: session.startTime
  }));
  
  res.json(sessions);
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Notulen.ai Meeting Bot API',
    endpoints: {
      health: '/health',
      joinMeeting: '/api/join-meeting',
      meetingStatus: '/api/meeting-status/:sessionId',
      stopSession: '/api/stop-session/:sessionId',
      listSessions: '/api/meeting-sessions'
    }
  });
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
}); 