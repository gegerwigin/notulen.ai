require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class CalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Try to load tokens if they exist
    this.loadTokens();
  }
  
  // Generate auth URL for Google Calendar access
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/meetings.space.readonly',
      'https://www.googleapis.com/auth/meetings.media.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }
  
  // Exchange code for tokens
  async getTokensFromCode(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.saveTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw error;
    }
  }
  
  // Save tokens to file
  saveTokens(tokens) {
    const tokenPath = path.join(__dirname, 'tokens.json');
    fs.writeFileSync(tokenPath, JSON.stringify(tokens));
    console.log('Tokens saved to', tokenPath);
  }
  
  // Load tokens from file
  loadTokens() {
    try {
      const tokenPath = path.join(__dirname, 'tokens.json');
      if (fs.existsSync(tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(tokenPath));
        this.oauth2Client.setCredentials(tokens);
        return true;
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
    return false;
  }
  
  // Get upcoming events from Google Calendar
  async getUpcomingEvents(maxResults = 10) {
    if (!this.oauth2Client.credentials.access_token) {
      throw new Error('Authentication required. Please authenticate first.');
    }
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    try {
      // Get events from primary calendar
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      const events = response.data.items;
      
      if (!events || events.length === 0) {
        console.log('No upcoming events found.');
        return [];
      }
      
      // Process events to extract Google Meet links
      const meetEvents = events
        .filter(event => {
          // Check if event has conferenceData with Google Meet
          return event.conferenceData && 
                 event.conferenceData.conferenceId &&
                 event.conferenceData.conferenceSolution &&
                 event.conferenceData.conferenceSolution.name.includes('Meet');
        })
        .map(event => {
          // Extract relevant information
          const meetLink = event.conferenceData.entryPoints
            .find(entry => entry.entryPointType === 'video')?.uri || null;
            
          return {
            id: event.id,
            summary: event.summary,
            description: event.description,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            meetLink: meetLink,
            attendees: event.attendees || [],
            organizer: event.organizer
          };
        })
        .filter(event => event.meetLink); // Only include events with Meet links
      
      return meetEvents;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }
  
  // Get the next meeting from Google Calendar
  async getNextMeeting() {
    const events = await this.getUpcomingEvents(5);
    
    if (events.length === 0) {
      return null;
    }
    
    // Sort by start time and get the next meeting
    events.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    // Find the next meeting that hasn't started yet or is currently ongoing
    const now = new Date();
    const nextMeeting = events.find(event => {
      const startTime = new Date(event.start);
      const endTime = new Date(event.end);
      
      // Meeting is in the future or currently happening
      return (startTime > now) || (startTime <= now && endTime >= now);
    });
    
    return nextMeeting || events[0]; // Return the next meeting or the first one if none found
  }
  
  // Check if a meeting is currently happening
  async getCurrentMeeting() {
    const events = await this.getUpcomingEvents(5);
    
    if (events.length === 0) {
      return null;
    }
    
    // Find a meeting that is currently happening
    const now = new Date();
    const currentMeeting = events.find(event => {
      const startTime = new Date(event.start);
      const endTime = new Date(event.end);
      
      // Meeting is currently happening
      return (startTime <= now && endTime >= now);
    });
    
    return currentMeeting;
  }
  
  // Get user profile information
  async getUserProfile() {
    if (!this.oauth2Client.credentials.access_token) {
      throw new Error('Authentication required. Please authenticate first.');
    }
    
    const oauth2 = google.oauth2({
      auth: this.oauth2Client,
      version: 'v2'
    });
    
    try {
      const response = await oauth2.userinfo.get();
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }
}

module.exports = new CalendarService();
