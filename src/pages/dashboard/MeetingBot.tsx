import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress, List, ListItem, ListItemText, Divider } from '@mui/material';
import { VideoCall as VideoCallIcon } from '@mui/icons-material';
import { meetingBotService } from '../../services/meeting-bot/MeetingBotService';

const MeetingBot: React.FC = () => {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const handleJoinMeeting = async () => {
    if (!meetingUrl) {
      setError('Please enter a meeting URL');
      return;
    }

    setIsJoining(true);
    setError(null);
    setLogs([]);

    try {
      const { sessionId } = await meetingBotService.joinMeeting(meetingUrl, {
        enableCamera: false,
        enableMicrophone: false,
        displayName: 'Notulen.AI Bot',
        captureAudio: true
      });

      setSessionId(sessionId);

      // Start polling for status
      const checkStatus = async () => {
        try {
          const statusResult = await meetingBotService.checkStatus(sessionId);
          setStatus(statusResult.status);
          
          // Add logs if available
          if (statusResult.logs && statusResult.logs.length > 0) {
            setLogs(prevLogs => {
              // Add only new logs that aren't already in the list
              const newLogs = statusResult.logs?.filter(log => !prevLogs.includes(log)) || [];
              return [...prevLogs, ...newLogs];
            });
          }
          
          if (statusResult.status === 'error') {
            setError(statusResult.error || 'Failed to join meeting');
            return;
          }

          if (statusResult.status !== 'left') {
            setTimeout(checkStatus, 5000); // Poll every 5 seconds
          }
        } catch (err) {
          console.error('Failed to check status:', err);
        }
      };

      checkStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to join meeting');
    } finally {
      setIsJoining(false);
    }
  };

  const handleStopSession = async () => {
    if (!sessionId) return;

    try {
      await meetingBotService.stopSession(sessionId);
      setSessionId(null);
      setStatus(null);
    } catch (err: any) {
      setError(err.message || 'Failed to stop session');
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <VideoCallIcon fontSize="large" />
          Meeting Bot
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Paste your meeting URL (Google Meet, Zoom, or Microsoft Teams) and our AI bot will join to take notes and generate minutes of meeting.
        </Typography>

        <Box sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="Meeting URL"
            variant="outlined"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/... or https://zoom.us/... or https://teams.microsoft.com/..."
            disabled={isJoining || !!sessionId}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {status && (
          <Alert severity={status === 'error' ? 'error' : status === 'joined' ? 'success' : 'info'} sx={{ mt: 2 }}>
            Bot Status: {status}
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          {!sessionId ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleJoinMeeting}
              disabled={isJoining || !meetingUrl}
              startIcon={isJoining ? <CircularProgress size={20} /> : <VideoCallIcon />}
            >
              {isJoining ? 'Joining...' : 'Join Meeting'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              onClick={handleStopSession}
            >
              Stop Session
            </Button>
          )}
        </Box>
        
        {logs.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Bot Logs
            </Typography>
            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto', p: 1 }}>
              <List dense>
                {logs.map((log, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText 
                        primary={log} 
                        primaryTypographyProps={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.8rem',
                          color: log.includes('Error') || log.includes('GAGAL') ? 'error.main' : 'text.primary'
                        }} 
                      />
                    </ListItem>
                    {index < logs.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default MeetingBot;
