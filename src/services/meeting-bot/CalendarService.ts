import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  OAuthProvider 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { meetingBotService } from './MeetingBotService';

/**
 * Interface for calendar events
 */
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  meetingUrl?: string;
  platform?: string;
  attendees?: string[];
  organizer?: string;
  isRecurring?: boolean;
  location?: string;
}

/**
 * Interface for calendar provider
 */
export interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'other';
  connected: boolean;
  lastSynced?: Date;
}

/**
 * Service for managing calendar integration
 */
export class CalendarService {
  private connectedProviders: CalendarProvider[] = [];
  
  constructor() {
    // Load connected providers on initialization
    this.loadConnectedProviders();
  }
  
  /**
   * Load connected calendar providers from Firestore
   */
  private async loadConnectedProviders(): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
      const providersSnapshot = await getDocs(
        collection(db, 'users', currentUser.uid, 'calendarProviders')
      );
      
      this.connectedProviders = providersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CalendarProvider[];
      
    } catch (error) {
      console.error('Error loading calendar providers:', error);
      // Reset connected providers to empty array on error
      this.connectedProviders = [];
      
      // Check if this is a permissions error
      if (error instanceof Error && error.message.includes('permission')) {
        console.warn('Permissions issue detected. User may need to reauthenticate.');
      }
    }
  }
  
  /**
   * Connect to Google Calendar
   */
  async connectGoogleCalendar(): Promise<CalendarProvider> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Set up Google OAuth provider with necessary scopes
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
      
      // Force reauthentication to ensure fresh tokens
      provider.setCustomParameters({
        prompt: 'consent'
      });
      
      // Sign in with popup
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (!credential) {
        throw new Error('Failed to get Google credentials');
      }
      
      // Save provider to Firestore
      const providerId = 'google-' + currentUser.uid;
      const providerData: CalendarProvider = {
        id: providerId,
        name: 'Google Calendar',
        type: 'google',
        connected: true,
        lastSynced: new Date()
      };
      
      try {
        await setDoc(
          doc(db, 'users', currentUser.uid, 'calendarProviders', providerId),
          {
            ...providerData,
            lastSynced: serverTimestamp(),
            accessToken: credential.accessToken,
            // Store other necessary tokens
          }
        );
      } catch (firestoreError) {
        console.error('Error saving calendar provider to Firestore:', firestoreError);
        // Continue without throwing - we'll still return the provider data
        // This allows the app to function even if Firestore write fails
      }
      
      // Add to connected providers
      this.connectedProviders.push(providerData);
      
      return providerData;
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      
      // Handle specific Firebase auth errors
      if (error instanceof Error) {
        if (error.message.includes('popup')) {
          throw new Error('Popup was blocked or closed. Please enable popups and try again.');
        } else if (error.message.includes('permission') || error.message.includes('insufficient')) {
          throw new Error('Missing or insufficient permissions. Please check your account permissions and try again.');
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Connect to Outlook Calendar
   */
  async connectOutlookCalendar(): Promise<CalendarProvider> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Set up Microsoft OAuth provider with necessary scopes
      const provider = new OAuthProvider('microsoft.com');
      provider.addScope('calendars.read');
      provider.addScope('user.read');
      
      // Sign in with popup
      const result = await signInWithPopup(auth, provider);
      const credential = OAuthProvider.credentialFromResult(result);
      
      if (!credential) {
        throw new Error('Failed to get Microsoft credentials');
      }
      
      // Save provider to Firestore
      const providerId = 'outlook-' + currentUser.uid;
      const providerData: CalendarProvider = {
        id: providerId,
        name: 'Outlook Calendar',
        type: 'outlook',
        connected: true,
        lastSynced: new Date()
      };
      
      await setDoc(
        doc(db, 'users', currentUser.uid, 'calendarProviders', providerId),
        {
          ...providerData,
          lastSynced: serverTimestamp(),
          accessToken: credential.accessToken,
          // Store other necessary tokens
        }
      );
      
      // Add to connected providers
      this.connectedProviders.push(providerData);
      
      return providerData;
    } catch (error) {
      console.error('Error connecting to Outlook Calendar:', error);
      throw error;
    }
  }
  
  /**
   * Get all connected calendar providers
   */
  getConnectedProviders(): CalendarProvider[] {
    return this.connectedProviders;
  }
  
  /**
   * Disconnect a calendar provider
   */
  async disconnectProvider(providerId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Remove from Firestore
      await setDoc(
        doc(db, 'users', currentUser.uid, 'calendarProviders', providerId),
        {
          connected: false,
          disconnectedAt: serverTimestamp()
        },
        { merge: true }
      );
      
      // Remove from connected providers
      this.connectedProviders = this.connectedProviders.filter(
        provider => provider.id !== providerId
      );
    } catch (error) {
      console.error('Error disconnecting calendar provider:', error);
      throw error;
    }
  }
  
  /**
   * Get upcoming calendar events from all connected providers
   */
  async getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Get events from Firestore
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      
      const eventsSnapshot = await getDocs(
        query(
          collection(db, 'users', currentUser.uid, 'calendarEvents'),
          where('start', '>=', startDate),
          where('start', '<=', endDate),
          orderBy('start', 'asc')
        )
      );
      
      const events = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convert Firestore timestamps to Date objects
        const start = data.start?.toDate ? data.start.toDate() : new Date(data.start);
        const end = data.end?.toDate ? data.end.toDate() : new Date(data.end);
        
        // Extract meeting URL and platform
        let meetingUrl = data.meetingUrl;
        let platform = data.platform;
        
        // If no meeting URL is explicitly stored, try to extract it from description or location
        if (!meetingUrl && (data.description || data.location)) {
          meetingUrl = this.extractMeetingUrl(data.description || '') || 
                      this.extractMeetingUrl(data.location || '');
          
          // If a meeting URL was found, determine the platform
          if (meetingUrl) {
            platform = meetingBotService.getPlatformForUrl(meetingUrl) || undefined;
          }
        }
        
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          start,
          end,
          meetingUrl,
          platform,
          attendees: data.attendees,
          organizer: data.organizer,
          isRecurring: data.isRecurring,
          location: data.location
        } as CalendarEvent;
      });
      
      return events;
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      throw error;
    }
  }
  
  /**
   * Extract meeting URL from text
   */
  private extractMeetingUrl(text: string): string | null {
    // Regular expressions for different meeting platforms
    const patterns = [
      // Google Meet
      /https:\/\/meet\.google\.com\/[a-z0-9\-]+/i,
      
      // Zoom
      /https:\/\/(?:[a-z0-9-.]+)?zoom\.us\/(?:j|meeting)\/[a-zA-Z0-9?&=]+/i,
      
      // Microsoft Teams
      /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[a-zA-Z0-9%_]+/i,
      /https:\/\/teams\.live\.com\/meet\/[a-zA-Z0-9]+/i
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return null;
  }
  
  /**
   * Schedule a bot to join a meeting
   */
  async scheduleBotForMeeting(eventId: string, options: {
    joinMinutesBefore?: number;
    leaveAfterMeeting?: boolean;
    enableTranscription?: boolean;
  } = {}): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Get the event
      const eventDoc = await getDoc(
        doc(db, 'users', currentUser.uid, 'calendarEvents', eventId)
      );
      
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data();
      let meetingUrl = eventData.meetingUrl;
      
      // If no meeting URL is explicitly stored, try to extract it
      if (!meetingUrl && (eventData.description || eventData.location)) {
        meetingUrl = this.extractMeetingUrl(eventData.description || '') || 
                    this.extractMeetingUrl(eventData.location || '');
      }
      
      if (!meetingUrl) {
        throw new Error('No meeting URL found for this event');
      }
      
      // Set default options
      const schedulingOptions = {
        joinMinutesBefore: options.joinMinutesBefore ?? 5,
        leaveAfterMeeting: options.leaveAfterMeeting ?? true,
        enableTranscription: options.enableTranscription ?? true
      };
      
      // Calculate join time
      const eventStart = eventData.start.toDate();
      const joinTime = new Date(eventStart);
      joinTime.setMinutes(joinTime.getMinutes() - schedulingOptions.joinMinutesBefore);
      
      // Save the scheduled bot to Firestore
      await setDoc(
        doc(db, 'users', currentUser.uid, 'scheduledBots', eventId),
        {
          eventId,
          meetingUrl,
          scheduledJoinTime: joinTime,
          eventStart: eventData.start,
          eventEnd: eventData.end,
          options: schedulingOptions,
          status: 'scheduled',
          createdAt: serverTimestamp(),
          userId: currentUser.uid
        }
      );
    } catch (error) {
      console.error('Error scheduling bot for meeting:', error);
      throw error;
    }
  }
  
  /**
   * Cancel a scheduled bot
   */
  async cancelScheduledBot(eventId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    try {
      await setDoc(
        doc(db, 'users', currentUser.uid, 'scheduledBots', eventId),
        {
          status: 'cancelled',
          cancelledAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error cancelling scheduled bot:', error);
      throw error;
    }
  }
  
  /**
   * Get all scheduled bots
   */
  async getScheduledBots(): Promise<any[]> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    try {
      const botsSnapshot = await getDocs(
        query(
          collection(db, 'users', currentUser.uid, 'scheduledBots'),
          where('status', '==', 'scheduled'),
          orderBy('scheduledJoinTime', 'asc')
        )
      );
      
      return botsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting scheduled bots:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const calendarService = new CalendarService();
