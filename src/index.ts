import express from 'express';
import cors from 'cors';
import { joinMeeting, getMeetingStatus, stopSession, listSessions } from './controllers/MeetingController';

const app = express();
const port = Number(process.env.PORT) || 8080;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Meeting endpoints
app.post('/api/join-meeting', joinMeeting);
app.get('/api/meeting-status/:sessionId', getMeetingStatus);
app.post('/api/stop-session/:sessionId', stopSession);
app.get('/api/meeting-sessions', listSessions);

// Root endpoint with API documentation
app.get('/', (_req, res) => {
  res.json({
    message: 'Notulen.ai Meeting Bot API',
    endpoints: {
      health: 'GET /health',
      joinMeeting: 'POST /api/join-meeting',
      meetingStatus: 'GET /api/meeting-status/:sessionId',
      stopSession: 'POST /api/stop-session/:sessionId',
      listSessions: 'GET /api/meeting-sessions'
    }
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
}); 