import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress, 
  List,
  ListItem,
  Divider,
  Chip,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Clock, ExternalLink, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { FaGoogle } from 'react-icons/fa';
import { CalendarIcon } from 'lucide-react';
import { FaVideo } from 'react-icons/fa';
import { MeetingBotService } from '../services/meeting-bot/MeetingBotService';
import { toast } from 'react-hot-toast';
import { FaRobot } from 'react-icons/fa';

const StyledListItem = styled(ListItem)(({ theme }) => ({
  borderRadius: '8px',
  marginBottom: theme.spacing(1),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const UpcomingMeetings = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = useGoogleLogin({
    onSuccess: (response) => {
      sessionStorage.setItem('google_access_token', response.access_token);
      setIsLoggedIn(true);
      fetchCalendarEvents();
    },
    onError: (error) => {
      console.error('Calendar Login Failed:', error);
      setError('Failed to connect to Google Calendar');
    },
    scope: [
      'https://www.googleapis.com/auth/calendar.settings.readonly',
      'https://www.googleapis.com/auth/calendar.events.public.readonly',
      'https://www.googleapis.com/auth/calendar.primary.readonly'
    ].join(' '),
    flow: 'implicit'
  });

  // Format time
  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // Check if event is happening now
  const isEventNow = (start: string, end: string) => {
    const now = new Date();
    const startTime = new Date(start);
    const endTime = new Date(end);
    return now >= startTime && now <= endTime;
  };

  // Improved error handling
  const handleCalendarError = (error: any) => {
    console.error('Calendar error:', error);
    if (error.response?.status === 403) {
      setError('Calendar access not authorized. Please check permissions.');
    } else if (error.response?.status === 401) {
      sessionStorage.removeItem('google_access_token');
      setError('Session expired. Please login again.');
    } else {
      setError('Failed to fetch calendar events. Please try again.');
    }
  };

  // Fetch calendar events when component mounts
  useEffect(() => {
    const token = sessionStorage.getItem('google_access_token');
    if (token) {
      fetchCalendarEvents();
    }
  }, []);

  // Fetch calendar events
  const fetchCalendarEvents = async () => {
    const token = sessionStorage.getItem('google_access_token');
    if (!token) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          },
          params: {
            timeMin: new Date().toISOString(),
            maxResults: 5,
            singleEvents: true,
            orderBy: 'startTime'
          }
        }
      );
      
      // Filter events with Google Meet links
      const meetEvents = response.data.items
        .filter((event: any) => {
          // Check if event has conferenceData with Google Meet
          return event.conferenceData && 
                event.conferenceData.conferenceId &&
                event.conferenceData.conferenceSolution &&
                event.conferenceData.conferenceSolution.name.includes('Meet');
        })
        .map((event: any) => {
          // Extract relevant information
          const meetLink = event.conferenceData.entryPoints
            .find((entry: any) => entry.entryPointType === 'video')?.uri || null;
            
          return {
            id: event.id,
            summary: event.summary,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            meetLink: meetLink,
            isNow: isEventNow(event.start.dateTime || event.start.date, event.end.dateTime || event.end.date)
          };
        })
        .filter((event: any) => event.meetLink) // Only include events with Meet links
        .slice(0, 3); // Only show top 3 upcoming meetings
      
      setEvents(meetEvents);
    } catch (error: any) {
      handleCalendarError(error);
    } finally {
      setLoading(false);
    }
  };

  // Join meeting with bot
  const joinMeetingWithBot = (meetLink: string) => {
    // Store the meeting link in session storage
    sessionStorage.setItem('meetingLink', meetLink);
    
    // Navigate to the meeting bot page
    navigate('/dashboard/meeting-bot');
  };

  // View all meetings
  const viewAllMeetings = () => {
    navigate('/dashboard/calendar');
  };

  const handleLogin = () => {
    login();
  };

  const isOngoing = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return false;
    const now = new Date();
    const startTime = new Date(start);
    const endTime = new Date(end);
    return now >= startTime && now <= endTime;
  };

  const handleJoinWithBot = async (meetingUrl: string, meetingTitle: string) => {
    try {
      const botService = new MeetingBotService({
        serverUrl: process.env.REACT_APP_BOT_API_ENDPOINT || 'http://localhost:3001',
        apiKey: process.env.REACT_APP_BOT_API_KEY || ''
      });

      toast.loading('Connecting bot to meeting...', { id: 'bot-join' });
      
      const { sessionId } = await botService.joinMeeting(meetingUrl, {
        captureAudio: true,
        displayName: `Notulen.ai Bot - ${meetingTitle}`,
        enableCamera: false,
        enableMicrophone: false,
        onTranscriptionUpdate: (text: string) => {
          console.log('Transcription update:', text);
        }
      });
      
      // Poll for status
      const checkStatus = async () => {
        try {
          const status = await botService.checkStatus(sessionId);
          
          if (status.status === 'error') {
            toast.error(status.error || 'Failed to join meeting', { id: 'bot-join' });
            return;
          }
          
          if (status.status === 'recording') {
            toast.success('Bot is now recording the meeting', { id: 'bot-join' });
            return;
          }
          
          // Continue polling if still connecting or joining
          setTimeout(checkStatus, 3000);
        } catch (error) {
          toast.error('Failed to check bot status', { id: 'bot-join' });
        }
      };

      checkStatus();
    } catch (error) {
      toast.error('Failed to join meeting with bot', { id: 'bot-join' });
      console.error('Bot join error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500">{error}</p>
        {error.includes('login') && (
          <button
            onClick={handleLogin}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Login Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Upcoming Meetings</h2>
        {!isLoggedIn && (
          <button
            onClick={handleLogin}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FaGoogle className="mr-2" />
            Connect Calendar
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2">No upcoming meetings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => (
            <div
              key={event.id || index}
              className={`p-4 rounded-lg border ${
                isOngoing(event.start?.dateTime, event.end?.dateTime)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-blue-500'
              } transition-all duration-200`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{event.summary}</h3>
                  <p className="text-sm text-gray-500">
                    {formatTime(event.start?.dateTime)} - {formatTime(event.end?.dateTime)}
                  </p>
                </div>
                {isOngoing(event.start?.dateTime, event.end?.dateTime) && (
                  <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                    Ongoing
                  </span>
                )}
              </div>
              {event.conferenceData && (
                <div className="flex space-x-2 mt-2">
                  <a
                    href={event.conferenceData.entryPoints?.[0]?.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    <FaVideo className="mr-1" />
                    Join Meeting
                  </a>
                  <button
                    onClick={() => handleJoinWithBot(event.conferenceData.entryPoints?.[0]?.uri, event.summary)}
                    className="inline-flex items-center px-3 py-1 text-sm text-green-600 hover:text-green-800 border border-green-600 rounded-md hover:bg-green-50 transition-colors"
                  >
                    <FaRobot className="mr-1" />
                    Join with Bot
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingMeetings;
