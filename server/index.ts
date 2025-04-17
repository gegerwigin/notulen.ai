import express from 'express';
import cors from 'cors';
import { config } from './config';
import { MeetingController } from './controllers/MeetingController';
import { authMiddleware } from './middleware/auth';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes
app.use(authMiddleware);

// Controllers
const meetingController = new MeetingController();

// Routes
app.post('/api/join-meeting', async (req, res) => {
  try {
    const { meetingUrl, platform, recordingName } = req.body;
    const sessionId = await meetingController.joinMeeting(meetingUrl, platform, recordingName);
    res.json({ sessionId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/session-status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const status = await meetingController.getSessionStatus(sessionId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(config.server.port, config.server.host, () => {
  console.log(`Server running at http://${config.server.host}:${config.server.port}`);
}); 