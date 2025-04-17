import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { Box, Button, Typography, Paper, CircularProgress, Alert, Card, CardContent, CardActions, Tooltip, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { Video as VideocamIcon, Calendar as EventIcon, Clock as AccessTimeIcon, Users as PersonIcon, ExternalLink as LaunchIcon, Bot as SmartToyIcon } from 'lucide-react';

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: theme.spacing(1.5),
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
  },
}));

// Meeting platform icons and colors
const platformConfig = {
  'google-meet': {
    name: 'Google Meet',
    color: '#00897b',
    icon: '/icons/google-meet.svg'
  },
  'zoom': {
    name: 'Zoom',
    color: '#2d8cff',
    icon: '/icons/zoom.svg'
  },
  'teams': {
    name: 'Microsoft Teams',
    color: '#6264a7',
    icon: '/icons/teams.svg'
  }
};

interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  location: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: {
    email: string;
    displayName?: string;
  }[];
  meetingLink?: string;
  platform?: 'google-meet' | 'zoom' | 'teams' | null;
}

const Calendar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google login hook
  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      console.log('Google login successful', codeResponse);
      
      // Store the token in sessionStorage
      sessionStorage.setItem('google_access_token', codeResponse.access_token);
      
      // Set the user state
      setUser({
        access_token: codeResponse.access_token
      });
      
      // Fetch user profile (optional)
      axios
        .get('https://www.googleapis.com/oauth2/v1/userinfo', {
          headers: {
            Authorization: `Bearer ${codeResponse.access_token}`,
            Accept: 'application/json'
          }
        })
        .then(() => {
          // Profile data is not used in this component
          console.log('Profile fetched successfully');
        })
        .catch((err) => {
          console.error('Error fetching user profile:', err);
        });
    },
    onError: (error) => {
      console.error('Google login failed', error);
      setError('Failed to login with Google. Please try again.');
    },
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly',
    flow: 'implicit'
  });

  // Get user profile when user state changes
  useEffect(() => {
    if (user) {
      // Fetch calendar events
      fetchCalendarEvents();
    }
  }, [user]);

  // Extract meeting link from event
  const extractMeetingLink = (event: any) => {
    // Check conference data first (Google Meet links)
    if (event.conferenceData && 
        event.conferenceData.entryPoints && 
        event.conferenceData.entryPoints.length > 0) {
      const videoEntry = event.conferenceData.entryPoints.find((entry: any) => entry.entryPointType === 'video');
      if (videoEntry && videoEntry.uri) {
        return { link: videoEntry.uri, platform: 'google-meet' };
      }
    }
    
    // Check description for Zoom or Teams links
    if (event.description) {
      // Check for Zoom links
      const zoomRegex = /https:\/\/(?:[\w-]+\.)?zoom\.us\/(?:j|my)\/([a-zA-Z0-9_.-]+)(?:[?&]pwd=([a-zA-Z0-9_.-]+))?/i;
      const zoomMatch = event.description.match(zoomRegex);
      if (zoomMatch) {
        return { link: zoomMatch[0], platform: 'zoom' };
      }
      
      // Check for Microsoft Teams links
      const teamsRegex = /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[a-zA-Z0-9_%\/=\-\+\.]+/i;
      const teamsMatch = event.description.match(teamsRegex);
      if (teamsMatch) {
        return { link: teamsMatch[0], platform: 'teams' };
      }
    }
    
    // Check location for meeting links (some people put meeting links in location)
    if (event.location) {
      // Check for Zoom links in location
      const zoomRegex = /https:\/\/(?:[\w-]+\.)?zoom\.us\/(?:j|my)\/([a-zA-Z0-9_.-]+)(?:[?&]pwd=([a-zA-Z0-9_.-]+))?/i;
      const zoomMatch = event.location.match(zoomRegex);
      if (zoomMatch) {
        return { link: zoomMatch[0], platform: 'zoom' };
      }
      
      // Check for Google Meet links in location
      const meetRegex = /https:\/\/meet\.google\.com\/[a-z0-9\-]+/i;
      const meetMatch = event.location.match(meetRegex);
      if (meetMatch) {
        return { link: meetMatch[0], platform: 'google-meet' };
      }
      
      // Check for Microsoft Teams links in location
      const teamsRegex = /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[a-zA-Z0-9_%\/=\-\+\.]+/i;
      const teamsMatch = event.location.match(teamsRegex);
      if (teamsMatch) {
        return { link: teamsMatch[0], platform: 'teams' };
      }
    }
    
    return null;
  };

  // Fetch calendar events
  const fetchCalendarEvents = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            Accept: 'application/json'
          },
          params: {
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
          }
        }
      );
      
      // Process events to extract meeting links
      const processedEvents = response.data.items.map((event: any) => {
        const meetingLink = extractMeetingLink(event);
        
        return {
          ...event,
          meetingLink: meetingLink ? meetingLink.link : undefined,
          platform: meetingLink ? meetingLink.platform : null
        };
      }).filter((event: CalendarEvent) => event.meetingLink);
      
      setEvents(processedEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setError('Failed to fetch calendar events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle joining meeting
  const handleJoinMeeting = (event: CalendarEvent) => {
    if (!event.meetingLink) return;
    
    // Store the meeting link in session storage for the Meeting Bot
    sessionStorage.setItem('meetingLink', event.meetingLink);
    
    // Navigate to the Meeting Bot page
    navigate('/dashboard/meeting-bot');
  };

  // Format date and time
  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', py: 4 }}>
      <StyledPaper>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
          Calendar
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Connect your Google Calendar to view and join upcoming meetings from Google Meet, Zoom, and Microsoft Teams.
        </Typography>

        {!user ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
            <Typography variant="body1" gutterBottom>
              Sign in with Google to view your calendar
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => login()} 
              sx={{ mt: 2 }}
            >
              Sign in with Google
            </Button>
          </Box>
        ) : (
          <Box>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Upcoming Meetings
              </Typography>
              <Button 
                variant="outlined" 
                onClick={fetchCalendarEvents}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <EventIcon />}
              >
                Refresh
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : events.length > 0 ? (
              <Box>
                {events.map((event) => (
                  <StyledCard key={event.id}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
                          {event.summary}
                        </Typography>
                        {event.platform && (
                          <Tooltip title={platformConfig[event.platform].name}>
                            <Box 
                              component="img" 
                              src={platformConfig[event.platform].icon}
                              alt={platformConfig[event.platform].name}
                              sx={{ 
                                width: 24, 
                                height: 24,
                                borderRadius: '4px',
                                p: 0.5,
                                backgroundColor: `${platformConfig[event.platform].color}20`
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <EventIcon 
                          size={16} 
                          style={{ color: 'rgba(0, 0, 0, 0.6)', marginRight: 8 }} 
                        />
                        <Typography variant="body2" color="text.secondary">
                          {formatDateTime(event.start.dateTime)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AccessTimeIcon 
                          size={16} 
                          style={{ color: 'rgba(0, 0, 0, 0.6)', marginRight: 8 }} 
                        />
                        <Typography variant="body2" color="text.secondary">
                          {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                        </Typography>
                      </Box>
                      
                      {event.attendees && event.attendees.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon 
                            size={16} 
                            style={{ color: 'rgba(0, 0, 0, 0.6)', marginRight: 8 }} 
                          />
                          <Typography variant="body2" color="text.secondary">
                            {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                      {event.meetingLink && (
                        <>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<SmartToyIcon size={16} />}
                            onClick={() => handleJoinMeeting(event)}
                          >
                            Join with Bot
                          </Button>
                          <Tooltip title="Open in browser">
                            <IconButton
                              size="small"
                              href={event.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ ml: 1 }}
                            >
                              <LaunchIcon size={16} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </CardActions>
                  </StyledCard>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', my: 4, py: 4, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                <VideocamIcon 
                  size={48} 
                  style={{ color: 'rgba(0, 0, 0, 0.6)', marginBottom: 16 }} 
                />
                <Typography variant="body1" color="text.secondary">
                  No upcoming meetings with video links found.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  We look for Google Meet, Zoom, and Microsoft Teams links in your calendar events.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </StyledPaper>
    </Box>
  );
};

export default Calendar;
