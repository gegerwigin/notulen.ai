const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { meetBot } = require('./meet-bot-lightsail');

// Konfigurasi utama
const app = express();
const PORT = process.env.PORT || 8080;
const API_KEY = process.env.BOT_API_KEY || 'notulen-ai-bot-key-2024';
const LOG_DIR = path.join(__dirname, 'logs');

// Pastikan direktori logs ada
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Setup logging
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(path.join(LOG_DIR, 'bot-server.log'), logMessage);
  console.log(message);
};

// Menyimpan sesi aktif
const activeSessions = new Map();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Middleware untuk validasi JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logToFile(`JSON Parse Error: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format'
    });
  }
  next();
});

// Auth middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logToFile(`Auth failed: No/Invalid Authorization header for ${req.path}`);
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required. Use Bearer token.' 
    });
  }
  
  const token = authHeader.substring(7);
  
  if (token !== API_KEY) {
    logToFile(`Auth failed: Invalid API key for ${req.path}`);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid API key' 
    });
  }
  
  next();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  logToFile('Health check called');
  res.json({ 
    status: 'UP',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Join meeting endpoint
app.post('/api/join-meeting', authenticate, async (req, res) => {
  const { url } = req.body;
  
  logToFile(`Join meeting request received for URL: ${url}`);
  
  // Validate input
  if (!url || !url.includes('meet.google.com')) {
    logToFile(`Invalid meeting URL: ${url}`);
    return res.status(400).json({
      success: false,
      message: 'Invalid meeting URL. Must contain meet.google.com'
    });
  }
  
  // Generate session ID berbasis timestamp untuk tracking yang lebih mudah
  const sessionId = Date.now().toString();
  
  // Create new session
  const session = {
    id: sessionId,
    url,
    state: 'joining',
    startTime: Date.now(),
    transcript: '',
    browser: null,
    page: null,
    error: null
  };
  
  activeSessions.set(sessionId, session);
  logToFile(`Session ${sessionId} created for meeting: ${url}`);
  
  // Start meeting join process in background
  meetBot.joinMeeting(sessionId, url, activeSessions)
    .then(() => {
      logToFile(`Session ${sessionId} join process completed successfully`);
    })
    .catch(error => {
      logToFile(`Session ${sessionId} Error: ${error.message}`);
      
      const session = activeSessions.get(sessionId);
      if (session) {
        session.state = 'error';
        session.error = error.message;
      }
    });
  
  res.json({ 
    success: true, 
    sessionId, 
    message: 'Joining meeting process started' 
  });
});

// Get meeting status endpoint
app.get('/api/meeting-status/:sessionId', authenticate, (req, res) => {
  const { sessionId } = req.params;
  
  logToFile(`Status check for session: ${sessionId}`);
  
  if (!activeSessions.has(sessionId)) {
    logToFile(`Session not found: ${sessionId}`);
    return res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }
  
  const session = activeSessions.get(sessionId);
  
  res.json({
    success: true,
    status: {
      state: session.state,
      startTime: session.startTime,
      transcript: session.transcript,
      error: session.error
    }
  });
});

// Leave meeting endpoint
app.post('/api/leave-meeting/:sessionId', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  
  logToFile(`Leave meeting request for session: ${sessionId}`);
  
  if (!activeSessions.has(sessionId)) {
    logToFile(`Session not found for leave request: ${sessionId}`);
    return res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }
  
  const session = activeSessions.get(sessionId);
  
  try {
    await meetBot.leaveMeeting(sessionId, activeSessions);
    
    session.state = 'completed';
    logToFile(`Session ${sessionId} left meeting successfully`);
    
    res.json({
      success: true,
      message: 'Left meeting successfully'
    });
  } catch (error) {
    logToFile(`Error leaving meeting (${sessionId}): ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Error leaving meeting: ' + error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  logToFile(`Server running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logToFile('Graceful shutdown initiated');
  
  // Tutup semua browser yang masih terbuka
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.browser) {
      try {
        logToFile(`Closing browser for session ${sessionId}`);
        await session.browser.close();
      } catch (error) {
        logToFile(`Error closing browser for session ${sessionId}: ${error.message}`);
      }
    }
  }
  
  logToFile('Shutdown complete');
  process.exit(0);
});

module.exports = app; 