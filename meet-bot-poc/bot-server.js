const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Initialize Express app
const app = express();
const PORT = process.env.BOT_SERVER_PORT || 3001;
const API_KEY = process.env.BOT_API_KEY || 'notulen-ai-bot-key';

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: '*', // Allow all origins for testing
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Bot instances
let zoomBot = null;
let googleMeetBot = null;

// Active sessions
const activeSessions = new Map();

// Authentication middleware
const authenticateApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid API key' });
  }
  
  const apiKey = authHeader.split(' ')[1];
  
  if (apiKey !== API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API key' });
  }
  
  next();
};

// Initialize Zoom Bot
const initZoomBot = async () => {
  if (zoomBot) {
    return zoomBot;
  }
  
  try {
    console.log('Initializing Zoom Bot...');
    zoomBot = {
      browser: null,
      page: null,
      
      async initialize() {
        if (this.browser) {
          return;
        }
        
        try {
          this.browser = await puppeteer.launch({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--disable-gpu',
              '--window-size=1280,720',
              '--use-fake-ui-for-media-stream',
              '--use-fake-device-for-media-stream'
            ]
          });
          console.log('Zoom Bot browser launched');
        } catch (error) {
          console.error('Failed to launch browser:', error);
          throw error;
        }
      },
      
      async verifyCredentials(email, password) {
        // For now, just return true as we're not implementing actual verification
        return true;
      },
      
      async joinMeeting(meetingId, password, displayName, sessionId) {
        try {
          await this.initialize();
          
          // Create a new page for this meeting
          const page = await this.browser.newPage();
          
          // Construct the Zoom join URL
          let joinUrl = `https://zoom.us/wc/${meetingId}/join`;
          if (password) {
            joinUrl += `?pwd=${password}`;
          }
          
          // Navigate to the join URL
          console.log(`Navigating to Zoom meeting: ${joinUrl}`);
          await page.goto(joinUrl, { waitUntil: 'networkidle2', timeout: 60000 });
          
          // Wait for the name input field
          await page.waitForSelector('input#inputname', { timeout: 30000 });
          
          // Enter display name
          await page.type('input#inputname', displayName);
          
          // Click the join button
          await page.click('#joinBtn');
          
          console.log(`Joined Zoom meeting ${meetingId} with session ID ${sessionId}`);
          
          // Store the page in active sessions
          activeSessions.set(sessionId, {
            platform: 'zoom',
            meetingId,
            page,
            active: true,
            joinTime: new Date(),
            transcription: []
          });
          
          // Start capturing audio (placeholder for now)
          this.startCapturingAudio(sessionId);
          
          return true;
        } catch (error) {
          console.error('Failed to join Zoom meeting:', error);
          throw error;
        }
      },
      
      async leaveMeeting(sessionId) {
        const session = activeSessions.get(sessionId);
        if (!session) {
          return false;
        }
        
        try {
          // Close the page
          await session.page.close();
          
          // Remove from active sessions
          activeSessions.delete(sessionId);
          
          console.log(`Left Zoom meeting with session ID ${sessionId}`);
          return true;
        } catch (error) {
          console.error(`Failed to leave Zoom meeting with session ID ${sessionId}:`, error);
          return false;
        }
      },
      
      startCapturingAudio(sessionId) {
        // Placeholder for audio capture functionality
        console.log(`Started capturing audio for session ${sessionId}`);
        
        // Simulate capturing transcription
        const session = activeSessions.get(sessionId);
        if (session) {
          // Add a timer to simulate transcription updates
          const transcriptionInterval = setInterval(() => {
            if (activeSessions.has(sessionId)) {
              const currentSession = activeSessions.get(sessionId);
              if (currentSession.active) {
                currentSession.transcription.push({
                  timestamp: new Date(),
                  speaker: 'Unknown',
                  text: `This is a simulated transcription at ${new Date().toISOString()}`
                });
              } else {
                clearInterval(transcriptionInterval);
              }
            } else {
              clearInterval(transcriptionInterval);
            }
          }, 10000); // Update every 10 seconds
        }
      },
      
      getTranscription(sessionId) {
        const session = activeSessions.get(sessionId);
        if (!session) {
          return [];
        }
        
        return session.transcription;
      },
      
      async shutdown() {
        if (this.browser) {
          console.log('Shutting down Zoom Bot...');
          
          // Close all active sessions
          for (const [sessionId, session] of activeSessions.entries()) {
            if (session.platform === 'zoom') {
              await this.leaveMeeting(sessionId);
            }
          }
          
          // Close the browser
          await this.browser.close();
          this.browser = null;
          console.log('Zoom Bot shutdown complete');
        }
      }
    };
    
    await zoomBot.initialize();
    return zoomBot;
  } catch (error) {
    console.error('Failed to initialize Zoom Bot:', error);
    throw error;
  }
};

// Initialize Google Meet Bot
const initGoogleMeetBot = async () => {
  if (googleMeetBot) {
    return googleMeetBot;
  }
  
  try {
    console.log('Initializing Google Meet Bot...');
    // Implementation similar to the existing Google Meet bot
    googleMeetBot = {
      // Placeholder for Google Meet bot implementation
      async initialize() {
        console.log('Google Meet Bot initialized');
      },
      
      async verifyCredentials() {
        return true;
      },
      
      async joinMeeting() {
        console.log('Google Meet Bot joining meeting (placeholder)');
        return true;
      }
    };
    
    await googleMeetBot.initialize();
    return googleMeetBot;
  } catch (error) {
    console.error('Failed to initialize Google Meet Bot:', error);
    throw error;
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check endpoint called');
  res.status(200).json({ status: 'ok', message: 'Bot server is running' });
});

// Verify bot credentials
app.post('/bot/verify-credentials', authenticateApiKey, async (req, res) => {
  try {
    const { platform, email, password, userId } = req.body;
    
    if (!platform || !email || !password) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }
    
    let result = false;
    
    if (platform.toLowerCase() === 'zoom') {
      const bot = await initZoomBot();
      result = await bot.verifyCredentials(email, password);
    } else if (platform.toLowerCase() === 'google-meet') {
      const bot = await initGoogleMeetBot();
      result = await bot.verifyCredentials(email, password);
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported platform' });
    }
    
    return res.status(200).json({ success: result });
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify credentials' });
  }
});

// Join Zoom meeting
app.post('/bot/zoom/join', authenticateApiKey, async (req, res) => {
  try {
    const { meetingId, password, displayName, sessionId, userId, captureAudio, enableCamera, enableMicrophone } = req.body;
    
    if (!meetingId || !sessionId) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }
    
    const bot = await initZoomBot();
    const result = await bot.joinMeeting(
      meetingId,
      password || '',
      displayName || 'Notula.ai Bot',
      sessionId
    );
    
    return res.status(200).json({ success: result, sessionId });
  } catch (error) {
    console.error('Error joining Zoom meeting:', error);
    return res.status(500).json({ success: false, error: 'Failed to join Zoom meeting' });
  }
});

// Join Google Meet
app.post('/bot/google-meet/join', authenticateApiKey, async (req, res) => {
  try {
    const { meetingUrl, displayName, sessionId, userId, captureAudio, enableCamera, enableMicrophone } = req.body;
    
    if (!meetingUrl || !sessionId) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }
    
    const bot = await initGoogleMeetBot();
    const result = await bot.joinMeeting(
      meetingUrl,
      displayName || 'Notula.ai Bot',
      sessionId,
      { captureAudio, enableCamera, enableMicrophone }
    );
    
    return res.status(200).json({ success: result, sessionId });
  } catch (error) {
    console.error('Error joining Google Meet:', error);
    return res.status(500).json({ success: false, error: 'Failed to join Google Meet' });
  }
});

// Leave meeting
app.post('/bot/leave', authenticateApiKey, async (req, res) => {
  try {
    const { sessionId, platform } = req.body;
    
    if (!sessionId || !platform) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }
    
    let result = false;
    
    if (platform.toLowerCase() === 'zoom') {
      const bot = await initZoomBot();
      result = await bot.leaveMeeting(sessionId);
    } else if (platform.toLowerCase() === 'google-meet') {
      const bot = await initGoogleMeetBot();
      result = await bot.leaveMeeting(sessionId);
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported platform' });
    }
    
    return res.status(200).json({ success: result });
  } catch (error) {
    console.error('Error leaving meeting:', error);
    return res.status(500).json({ success: false, error: 'Failed to leave meeting' });
  }
});

// Get session status
app.get('/bot/zoom/status/:sessionId', authenticateApiKey, (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Missing session ID' });
    }
    
    const session = activeSessions.get(sessionId);
    const active = !!session && session.active;
    
    return res.status(200).json({ success: true, active });
  } catch (error) {
    console.error('Error getting session status:', error);
    return res.status(500).json({ success: false, error: 'Failed to get session status' });
  }
});

// Get transcription
app.get('/bot/zoom/transcription/:sessionId', authenticateApiKey, (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Missing session ID' });
    }
    
    const bot = zoomBot;
    if (!bot) {
      return res.status(500).json({ success: false, error: 'Zoom bot not initialized' });
    }
    
    const transcription = bot.getTranscription(sessionId);
    
    return res.status(200).json({ success: true, transcription });
  } catch (error) {
    console.error('Error getting transcription:', error);
    return res.status(500).json({ success: false, error: 'Failed to get transcription' });
  }
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bot server running at http://localhost:${PORT}`);
  console.log(`Health endpoint available at http://localhost:${PORT}/health`);
  console.log('API endpoints available for Zoom and Google Meet integration');
  console.log('Server is listening on all network interfaces (0.0.0.0)');
}).on('error', (err) => {
  console.error('Failed to start server:', err);
});

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down bot server...');
  if (zoomBot) {
    await zoomBot.shutdown();
  }
  if (server) server.close();
  process.exit(0);
});
