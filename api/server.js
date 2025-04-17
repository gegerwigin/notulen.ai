const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Store active bot sessions
const activeSessions = new Map();

// API key for authentication
const API_KEY = process.env.BOT_API_KEY || 'notulen-ai-bot-key';

// Zoom bot account credentials
const BOT_ACCOUNT = {
  email: process.env.BOT_EMAIL || 'bot@notulen.ai',
  password: process.env.BOT_PASSWORD || 'securePassword123'
};

// DeepSeek API configuration
const DEEPSEEK_API_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-915ebdf4887844599285c854ca2d6239';

// Middleware to verify API key
const verifyApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing API key' });
  }
  
  const apiKey = authHeader.split(' ')[1];
  
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  
  next();
};

// Generate Zoom signature
function generateZoomSignature(meetingNumber, role = 0) {
  const apiKey = process.env.ZOOM_SDK_KEY || '';
  const apiSecret = process.env.ZOOM_SDK_SECRET || '';
  
  if (!apiKey || !apiSecret) {
    throw new Error('Zoom API key or secret not configured');
  }
  
  const timestamp = new Date().getTime() - 30000;
  const msg = Buffer.from(apiKey + meetingNumber + timestamp + role).toString('base64');
  const hash = crypto.createHmac('sha256', apiSecret).update(msg).digest('base64');
  const signature = Buffer.from(`${apiKey}.${meetingNumber}.${timestamp}.${role}.${hash}`).toString('base64');
  
  return signature;
}

// Join Zoom meeting with Puppeteer
async function joinZoomMeeting(meetingId, password, displayName, sessionId) {
  console.log(`Starting Zoom bot for meeting: ${meetingId} with name: ${displayName}`);
  
  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,720',
        '--disable-features=site-per-process',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--use-fake-ui-for-media-stream', // Auto-allow camera/mic permissions
        '--use-fake-device-for-media-stream' // Use fake devices for media
      ]
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Hide automation
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    
    // Construct Zoom URL
    const encodedDisplayName = encodeURIComponent(displayName);
    const zoomUrl = `https://zoom.us/wc/${meetingId}/join${password ? `?pwd=${password}` : ''}${password ? '&' : '?'}displayName=${encodedDisplayName}`;
    
    console.log(`Navigating to: ${zoomUrl}`);
    
    // Navigate to Zoom
    await page.goto(zoomUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Check for name input field
    const nameInputSelector = 'input[name="displayName"]';
    const hasNameInput = await page.evaluate((selector) => {
      return document.querySelector(selector) !== null;
    }, nameInputSelector);
    
    if (hasNameInput) {
      console.log('Found name input field, setting bot name...');
      
      // Clear and set name
      await page.evaluate((name) => {
        const input = document.querySelector('input[name="displayName"]');
        if (input) {
          input.value = '';
          input.value = name;
        }
      }, displayName);
      
      // Click join button
      await page.evaluate(() => {
        const joinButton = Array.from(document.querySelectorAll('button')).find(
          button => button.textContent.trim().toLowerCase() === 'join' || 
                   button.textContent.trim().toLowerCase() === 'join meeting'
        );
        if (joinButton) joinButton.click();
      });
    }
    
    // Wait for meeting to load
    await page.waitForTimeout(5000);
    
    // Handle "Join Audio" dialog
    const joinAudioButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const joinAudioBtn = buttons.find(
        button => button.textContent.includes('Join Audio') || 
                 button.textContent.includes('Join with Computer Audio')
      );
      if (joinAudioBtn) {
        joinAudioBtn.click();
        return true;
      }
      return false;
    });
    
    if (joinAudioButton) {
      console.log('Clicked "Join Audio" button');
    }
    
    // Disable camera and microphone
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Mute microphone if not already muted
      const micButton = buttons.find(button => 
        button.getAttribute('aria-label')?.includes('microphone') || 
        button.getAttribute('title')?.includes('microphone')
      );
      if (micButton && !micButton.getAttribute('aria-label')?.includes('unmute')) {
        micButton.click();
      }
      
      // Turn off camera if not already off
      const videoButton = buttons.find(button => 
        button.getAttribute('aria-label')?.includes('camera') || 
        button.getAttribute('title')?.includes('camera')
      );
      if (videoButton && !videoButton.getAttribute('aria-label')?.includes('start')) {
        videoButton.click();
      }
    });
    
    console.log('Bot successfully joined the meeting');
    
    // Store session information
    activeSessions.set(sessionId, {
      browser,
      page,
      meetingId,
      startTime: new Date(),
      userId,
      active: true,
      transcription: '',
      lastUpdated: new Date()
    });
    
    // Start transcription simulation
    startTranscriptionSimulation(sessionId);
    
    return { success: true, sessionId };
  } catch (error) {
    console.error('Error joining Zoom meeting:', error);
    return { success: false, error: error.message };
  }
}

// Simulate transcription updates
function startTranscriptionSimulation(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return;
  
  const transcriptionInterval = setInterval(() => {
    if (!activeSessions.has(sessionId) || !activeSessions.get(sessionId).active) {
      clearInterval(transcriptionInterval);
      return;
    }
    
    const session = activeSessions.get(sessionId);
    const update = `Transcription update at ${new Date().toLocaleTimeString()}: Meeting in progress.\n`;
    session.transcription += update;
    session.lastUpdated = new Date();
  }, 30000);
  
  // Store interval reference
  session.transcriptionInterval = transcriptionInterval;
}

// API Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Verify bot credentials
app.post('/bot/verify-credentials', verifyApiKey, (req, res) => {
  try {
    const { platform, email, password } = req.body;
    
    if (platform === 'zoom') {
      // In a real implementation, you would verify these credentials
      // For now, we'll just check if they match our environment variables
      const isValid = (
        email === BOT_ACCOUNT.email && 
        (password === BOT_ACCOUNT.password || password === '')
      );
      
      return res.json({ 
        success: isValid,
        message: isValid ? 'Credentials verified' : 'Invalid credentials'
      });
    }
    
    res.status(400).json({ success: false, message: 'Unsupported platform' });
  } catch (error) {
    console.error('Error verifying credentials:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Zoom signature
app.post('/api/zoom/signature', verifyApiKey, (req, res) => {
  try {
    const { meetingNumber, role = 0 } = req.body;
    
    if (!meetingNumber) {
      return res.status(400).json({ error: 'Meeting number is required' });
    }
    
    const signature = generateZoomSignature(meetingNumber, role);
    res.json({ signature });
  } catch (error) {
    console.error('Error generating Zoom signature:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join Zoom meeting
app.post('/bot/zoom/join', verifyApiKey, async (req, res) => {
  try {
    const { 
      meetingId, 
      password = '', 
      displayName = 'Notulen.ai Bot', 
      sessionId = uuidv4(),
      userId = 'anonymous',
      captureAudio = true,
      enableCamera = false,
      enableMicrophone = false
    } = req.body;
    
    if (!meetingId) {
      return res.status(400).json({ error: 'Meeting ID is required' });
    }
    
    // Check if session already exists
    if (activeSessions.has(sessionId)) {
      return res.status(409).json({ 
        success: false,
        error: 'Session already exists', 
        sessionId 
      });
    }
    
    // Join meeting
    const result = await joinZoomMeeting(meetingId, password, displayName, sessionId);
    
    if (!result.success) {
      return res.status(500).json({ 
        success: false,
        error: result.error 
      });
    }
    
    // Return session information
    res.json({
      success: true,
      sessionId,
      message: 'Bot successfully joined the meeting'
    });
  } catch (error) {
    console.error('Error joining Zoom meeting:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get session status
app.get('/bot/zoom/status/:sessionId', verifyApiKey, (req, res) => {
  const { sessionId } = req.params;
  
  if (!activeSessions.has(sessionId)) {
    return res.status(404).json({ 
      success: false,
      error: 'Session not found' 
    });
  }
  
  const session = activeSessions.get(sessionId);
  
  res.json({
    success: true,
    active: session.active,
    meetingId: session.meetingId,
    startTime: session.startTime,
    lastUpdated: session.lastUpdated
  });
});

// Get session transcription
app.get('/bot/zoom/transcription/:sessionId', verifyApiKey, (req, res) => {
  const { sessionId } = req.params;
  
  if (!activeSessions.has(sessionId)) {
    return res.status(404).json({ 
      success: false,
      error: 'Session not found' 
    });
  }
  
  const session = activeSessions.get(sessionId);
  
  res.json({
    success: true,
    transcription: session.transcription,
    lastUpdated: session.lastUpdated
  });
});

// Leave meeting
app.post('/bot/zoom/leave', verifyApiKey, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ 
        success: false,
        error: 'Session ID is required' 
      });
    }
    
    if (!activeSessions.has(sessionId)) {
      return res.status(404).json({ 
        success: false,
        error: 'Session not found' 
      });
    }
    
    const session = activeSessions.get(sessionId);
    
    // Close browser
    if (session.browser) {
      await session.browser.close();
    }
    
    // Remove session
    activeSessions.delete(sessionId);
    
    res.json({
      success: true,
      message: 'Bot successfully left the meeting'
    });
  } catch (error) {
    console.error('Error leaving Zoom meeting:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// DeepSeek Chat API endpoint
app.post('/api/deepseek/chat', async (req, res) => {
  try {
    console.log('Received request for DeepSeek Chat API');
    
    const requestBody = req.body;
    
    if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    const response = await fetch(DEEPSEEK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: requestBody.model || 'deepseek-chat',
        messages: requestBody.messages,
        temperature: requestBody.temperature || 0.3,
        max_tokens: requestBody.max_tokens || 2000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('DeepSeek API error:', data);
      return res.status(response.status).json({
        error: 'DeepSeek API Error',
        message: data.error?.message || 'Unknown error'
      });
    }

    console.log('DeepSeek API response received');
    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// DeepSeek Audio API endpoint
app.post('/api/deepseek/audio', async (req, res) => {
  try {
    const { file, language, model } = req.body;
    
    console.log('Received request for DeepSeek Audio API');
    
    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const response = await fetch('https://api.deepseek.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-audio',
        file: file,
        language: language || 'id',
        response_format: 'verbose_json'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('DeepSeek Audio API error:', data);
      return res.status(response.status).json({
        error: 'DeepSeek Audio API Error',
        message: data.error?.message || 'Unknown error'
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`CORS enabled for origin: ${corsOptions.origin}`);
});
