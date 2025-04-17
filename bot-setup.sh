#!/bin/bash

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb

# Install ChromeDriver
CHROME_VERSION=$(google-chrome --version | cut -d " " -f3 | cut -d "." -f1)
wget https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${CHROME_VERSION}
CHROMEDRIVER_VERSION=$(cat LATEST_RELEASE_${CHROME_VERSION})
wget https://chromedriver.storage.googleapis.com/${CHROMEDRIVER_VERSION}/chromedriver_linux64.zip
unzip chromedriver_linux64.zip
sudo mv chromedriver /usr/bin/chromedriver
sudo chown root:root /usr/bin/chromedriver
sudo chmod +x /usr/bin/chromedriver

# Create bot directory
mkdir -p /home/ubuntu/notulen-bot
cd /home/ubuntu/notulen-bot

# Create bot server file
cat > index.js << 'EOL'
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || 'localhost';
const API_KEY = process.env.API_KEY || 'notulen-ai-bot-key-2024';

// Active sessions
const sessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes
app.use(authMiddleware);

// Join meeting endpoint
app.post('/api/join-meeting', async (req, res) => {
  try {
    const { meetingUrl, displayName = 'Notulen.ai Bot' } = req.body;
    
    // Launch browser
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,720',
        '--headless=new'
      ]
    });

    const page = await browser.newPage();
    
    // Generate session ID
    const sessionId = uuidv4();
    
    // Store session
    sessions.set(sessionId, {
      browser,
      page,
      status: 'connecting',
      startTime: new Date(),
      meetingUrl,
      displayName
    });

    // Join meeting
    await page.goto(meetingUrl, { waitUntil: 'networkidle0' });
    
    // Update status
    sessions.get(sessionId).status = 'joined';
    
    res.json({ 
      sessionId,
      status: 'joined',
      message: 'Successfully joined meeting'
    });
  } catch (error) {
    console.error('Failed to join meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session status endpoint
app.get('/api/session-status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    status: session.status,
    startTime: session.startTime,
    meetingUrl: session.meetingUrl
  });
});

// Stop session endpoint
app.post('/api/stop-session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  try {
    await session.browser.close();
    sessions.delete(sessionId);
    res.json({ message: 'Session stopped successfully' });
  } catch (error) {
    console.error('Failed to stop session:', error);
    res.status(500).json({ error: error.message });
  }
});

// List active sessions endpoint
app.get('/api/sessions', (req, res) => {
  const activeSessions = Array.from(sessions.entries()).map(([id, session]) => ({
    sessionId: id,
    status: session.status,
    startTime: session.startTime,
    meetingUrl: session.meetingUrl
  }));
  
  res.json(activeSessions);
});

// Start server
app.listen(port, host, () => {
  console.log(`Bot server running at http://${host}:${port}`);
});
EOL

# Install dependencies
npm init -y
npm install puppeteer-core express cors uuid

# Create systemd service
sudo tee /etc/systemd/system/notulen-bot.service << EOF
[Unit]
Description=Notulen AI Meeting Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/notulen-bot
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=HOST=0.0.0.0
Environment=API_KEY=notulen-ai-bot-key-2024
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable notulen-bot
sudo systemctl start notulen-bot

echo "Bot server setup complete!" 