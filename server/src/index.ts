import express from 'express';
import cors from 'cors';
import { MeetingController } from './MeetingController';

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);
const meetingController = new MeetingController();

// Enable CORS for all origins in development, specific origin in production
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://www.notula.ai', 'http://localhost:5173']
        : '*'
}));

app.use(express.json());

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Health check with more details
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Join meeting
app.post('/api/join-meeting', async (req, res) => {
    try {
        const { meetingUrl } = req.body;
        if (!meetingUrl) {
            return res.status(400).json({ error: 'Meeting URL is required' });
        }
        
        // Validate meeting URL format
        if (!meetingUrl.match(/^https?:\/\/(meet\.google\.com|zoom\.us|teams\.microsoft\.com)/)) {
            return res.status(400).json({ error: 'Invalid meeting URL format' });
        }
        
        console.log('Attempting to join meeting:', meetingUrl);
        const sessionId = await meetingController.joinMeeting(meetingUrl);
        console.log('Successfully created session:', sessionId);
        
        res.json({ 
            sessionId,
            status: 'connecting',
            message: 'Bot is attempting to join the meeting'
        });
    } catch (error: any) {
        console.error('Failed to join meeting:', error);
        res.status(500).json({ 
            error: 'Failed to join meeting',
            message: error.message
        });
    }
});

// Get meeting status with detailed information
app.get('/api/meeting-status/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const status = meetingController.getSessionStatus(sessionId);
        
        if (!status) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json(status);
    } catch (error: any) {
        console.error('Error getting session status:', error);
        res.status(500).json({ 
            error: 'Failed to get session status',
            message: error.message
        });
    }
});

// Stop session with cleanup
app.post('/api/stop-session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await meetingController.stopSession(sessionId);
        res.json({ 
            status: 'stopped',
            message: 'Session successfully stopped'
        });
    } catch (error: any) {
        console.error('Error stopping session:', error);
        res.status(500).json({ 
            error: 'Failed to stop session',
            message: error.message
        });
    }
});

// List all active sessions with details
app.get('/api/meeting-sessions', (req, res) => {
    try {
        const sessions = meetingController.getAllSessions();
        res.json({
            total: sessions.length,
            sessions
        });
    } catch (error: any) {
        console.error('Error listing sessions:', error);
        res.status(500).json({ 
            error: 'Failed to list sessions',
            message: error.message
        });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Memory usage:', process.memoryUsage());
}); 