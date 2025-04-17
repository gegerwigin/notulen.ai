require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const calendarService = require('./calendar-service');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5173;

// Save tokens to a file
function saveTokens(tokens) {
  const tokenPath = path.join(__dirname, 'tokens.json');
  fs.writeFileSync(tokenPath, JSON.stringify(tokens));
  console.log('Tokens saved to', tokenPath);
}

// Routes
app.get('/', (req, res) => {
  const authUrl = calendarService.getAuthUrl();

  res.send(`
    <h1>Google Meet Bot - Proof of Concept</h1>
    <p>Click the button below to authenticate with Google:</p>
    <a href="${authUrl}" style="display: inline-block; background-color: #4285F4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Authenticate with Google</a>
    
    <h2>Important Instructions</h2>
    <p>For the bot to successfully join a meeting:</p>
    <ol>
      <li>Create your own test meeting at <a href="https://meet.google.com/new" target="_blank">meet.google.com/new</a></li>
      <li>In the meeting settings, ensure "Quick access" is ON (allows people to join without asking)</li>
      <li>Or, be prepared to manually admit the bot when it requests to join</li>
    </ol>
  `);
});

// OAuth callback route
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const tokens = await calendarService.getTokensFromCode(code);
    
    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send(`
      <h1>Authentication Failed</h1>
      <p>Error: ${error.message}</p>
      <a href="/">Try Again</a>
    `);
  }
});

// Dashboard route
app.get('/dashboard', async (req, res) => {
  try {
    // Check if we have valid tokens
    if (!calendarService.loadTokens()) {
      return res.redirect('/');
    }
    
    // Get user profile
    const userProfile = await calendarService.getUserProfile();
    
    // Get upcoming meetings
    const upcomingMeetings = await calendarService.getUpcomingEvents(5);
    
    // Get current meeting if any
    const currentMeeting = await calendarService.getCurrentMeeting();
    
    // Render dashboard
    res.send(`
      <h1>Notulen.ai Meeting Bot Dashboard</h1>
      <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
        <p><strong>Logged in as:</strong> ${userProfile.name} (${userProfile.email})</p>
      </div>
      
      ${currentMeeting ? `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #e8f5e9; border-radius: 5px; border-left: 5px solid #4caf50;">
          <h2>Current Meeting</h2>
          <p><strong>${currentMeeting.summary}</strong></p>
          <p>Time: ${new Date(currentMeeting.start).toLocaleTimeString()} - ${new Date(currentMeeting.end).toLocaleTimeString()}</p>
          <p>Link: <a href="${currentMeeting.meetLink}" target="_blank">${currentMeeting.meetLink}</a></p>
          <button onclick="joinMeeting('${currentMeeting.meetLink}')" style="background-color: #4caf50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;">Join with Bot</button>
        </div>
      ` : ''}
      
      <h2>Upcoming Meetings</h2>
      ${upcomingMeetings.length > 0 ? `
        <div style="display: grid; gap: 10px;">
          ${upcomingMeetings.map(meeting => `
            <div style="padding: 15px; background-color: #f5f5f5; border-radius: 5px; border-left: 5px solid #2196f3;">
              <h3>${meeting.summary}</h3>
              <p>Date: ${new Date(meeting.start).toLocaleDateString()}</p>
              <p>Time: ${new Date(meeting.start).toLocaleTimeString()} - ${new Date(meeting.end).toLocaleTimeString()}</p>
              <p>Link: <a href="${meeting.meetLink}" target="_blank">${meeting.meetLink}</a></p>
              <button onclick="joinMeeting('${meeting.meetLink}')" style="background-color: #2196f3; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">Join with Bot</button>
            </div>
          `).join('')}
        </div>
      ` : '<p>No upcoming meetings with Google Meet links found.</p>'}
      
      <h2>Manual Join</h2>
      <p>Enter a Google Meet link to join with the bot:</p>
      <div style="display: flex; margin-bottom: 20px;">
        <input type="text" id="meetingLink" placeholder="https://meet.google.com/xxx-xxxx-xxx" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px 0 0 4px;">
        <button onclick="joinManualMeeting()" style="background-color: #4285F4; color: white; padding: 8px 16px; border: none; border-radius: 0 4px 4px 0; cursor: pointer;">Join</button>
      </div>
      
      <script>
        function joinMeeting(link) {
          window.location.href = '/join-meeting?link=' + encodeURIComponent(link);
        }
        
        function joinManualMeeting() {
          const link = document.getElementById('meetingLink').value;
          if (link) {
            window.location.href = '/join-meeting?link=' + encodeURIComponent(link);
          } else {
            alert('Please enter a valid Google Meet link');
          }
        }
      </script>
    `);
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/">Back to Home</a>
    `);
  }
});

// Join meeting route
app.get('/join-meeting', (req, res) => {
  const { link } = req.query;
  
  if (!link) {
    return res.status(400).send('Meeting link is required');
  }
  
  // Spawn a child process to run the meet-bot.js script
  const child = spawn('node', ['meet-bot.js', link], {
    detached: true,
    stdio: 'ignore'
  });
  
  // Detach the child process
  child.unref();
  
  res.send(`
    <h1>Joining Meeting</h1>
    <p>Attempting to join meeting: ${link}</p>
    <p>A browser window should open shortly. Please check your system tray or taskbar.</p>
    <p><a href="/dashboard">Back to Dashboard</a></p>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Open this URL in your browser to start the authentication process');
});
