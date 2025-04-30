# Integrasi Frontend dengan Bot Meeting Lightsail

## Deskripsi

Dokumen ini menjelaskan cara mengintegrasikan frontend Notulen.AI dengan bot meeting yang berjalan di AWS Lightsail.

## Arsitektur

```
Frontend (Next.js) ───▶ Lightsail Bot API ───▶ Google Meet
    │                          │
    └─────────────────▶ Dashboard UI
```

## Integrasi di Frontend

### 1. Konfigurasi Endpoint Bot

Tambahkan konfigurasi berikut di file `.env.local` pada project frontend:

```
NEXT_PUBLIC_BOT_API_URL=http://<IP_LIGHTSAIL>/api
NEXT_PUBLIC_BOT_API_KEY=notulen-ai-bot-key-2024
```

atau jika menggunakan domain:

```
NEXT_PUBLIC_BOT_API_URL=https://bot.notula.ai/api
NEXT_PUBLIC_BOT_API_KEY=notulen-ai-bot-key-2024
```

### 2. Modifikasi MeetingBotService

File `app/services/MeetingBotService.ts`:

```typescript
import axios from 'axios';

class MeetingBotService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_BOT_API_URL || 'https://bot.notula.ai/api';
    this.apiKey = process.env.NEXT_PUBLIC_BOT_API_KEY || 'notulen-ai-bot-key-2024';
  }

  async joinMeeting(meetingUrl: string): Promise<{ sessionId: string }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/join-meeting`,
        { url: meetingUrl },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error joining meeting:', error);
      throw error;
    }
  }

  async getMeetingStatus(sessionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/meeting-status/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting meeting status:', error);
      throw error;
    }
  }

  async leaveMeeting(sessionId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/leave-meeting/${sessionId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error leaving meeting:', error);
      throw error;
    }
  }
}

export default new MeetingBotService();
```

### 3. Implementasi Halaman Dashboard Bot Meeting

File `app/dashboard/meeting-bot/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button, TextField, Box, Typography, Alert, CircularProgress, Paper } from '@mui/material';
import MeetingBotService from '@/app/services/MeetingBotService';

export default function MeetingBotPage() {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  
  // Polling meeting status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (sessionId && status !== 'completed' && status !== 'error') {
      interval = setInterval(async () => {
        try {
          const response = await MeetingBotService.getMeetingStatus(sessionId);
          setStatus(response.status.state || 'unknown');
          
          if (response.status.transcript) {
            setTranscript(response.status.transcript);
          }
          
          if (response.status.state === 'error') {
            setError(response.status.message || 'An error occurred');
          }
          
          if (response.status.state === 'completed') {
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Error polling status:', err);
          setError('Error checking meeting status');
          clearInterval(interval);
        }
      }, 5000); // Poll every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionId, status]);
  
  const handleJoinMeeting = async () => {
    if (!meetingUrl.trim() || !meetingUrl.includes('meet.google.com')) {
      setError('Please enter a valid Google Meet URL');
      return;
    }
    
    setStatus('joining');
    setError(null);
    
    try {
      const response = await MeetingBotService.joinMeeting(meetingUrl);
      setSessionId(response.sessionId);
    } catch (err: any) {
      console.error('Error joining meeting:', err);
      setError(err.response?.data?.message || 'Failed to join meeting');
      setStatus('error');
    }
  };
  
  const handleLeaveMeeting = async () => {
    if (!sessionId) return;
    
    try {
      await MeetingBotService.leaveMeeting(sessionId);
      setStatus('completed');
    } catch (err) {
      console.error('Error leaving meeting:', err);
    }
  };
  
  const renderStatusIndicator = () => {
    switch (status) {
      case 'joining':
        return (
          <Box display="flex" alignItems="center">
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography>Joining meeting...</Typography>
          </Box>
        );
      case 'joined':
        return (
          <Alert severity="success">
            Bot has joined the meeting and is recording
          </Alert>
        );
      case 'recording':
        return (
          <Alert severity="info">
            Recording in progress...
          </Alert>
        );
      case 'completed':
        return (
          <Alert severity="success">
            Meeting recording completed
          </Alert>
        );
      case 'error':
        return (
          <Alert severity="error">
            {error || 'An error occurred'}
          </Alert>
        );
      default:
        return null;
    }
  };
  
  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Meeting Bot
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Join Google Meet
        </Typography>
        
        <TextField
          fullWidth
          label="Google Meet URL"
          placeholder="https://meet.google.com/xxx-xxxx-xxx"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          disabled={status !== 'idle' && status !== 'error'}
          sx={{ mb: 2 }}
        />
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleJoinMeeting}
            disabled={status !== 'idle' && status !== 'error'}
          >
            Join Meeting
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={handleLeaveMeeting}
            disabled={!sessionId || status === 'completed' || status === 'idle'}
          >
            Leave Meeting
          </Button>
        </Box>
      </Paper>
      
      {renderStatusIndicator()}
      
      {transcript && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Live Transcript
          </Typography>
          <Box sx={{ maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {transcript}
          </Box>
        </Paper>
      )}
      
      {sessionId && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="textSecondary">
            Session ID: {sessionId}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
```

## API Endpoints Bot

Berikut ini adalah endpoint API yang disediakan oleh bot meeting di Lightsail:

| Endpoint | Method | Description | Auth Header |
|----------|--------|-------------|-------------|
| `/api/health` | GET | Mengecek kesehatan sistem | - |
| `/api/join-meeting` | POST | Mengirim bot untuk bergabung ke meeting | Bearer token |
| `/api/meeting-status/:sessionId` | GET | Mendapatkan status meeting | Bearer token |
| `/api/leave-meeting/:sessionId` | POST | Menginstruksikan bot untuk meninggalkan meeting | Bearer token |

## Setup DNS (Opsional)

Untuk penggunaan production, sebaiknya setup domain untuk bot:

1. Buat subdomain (misalnya `bot.notula.ai`) yang mengarah ke IP Lightsail.
2. Setup Nginx di Lightsail untuk SSL dan routing:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Konfigurasi Nginx
sudo nano /etc/nginx/sites-available/notula-bot
```

Isi dengan:

```
server {
    listen 80;
    server_name bot.notula.ai;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan konfigurasi dan dapatkan SSL:

```bash
sudo ln -s /etc/nginx/sites-available/notula-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d bot.notula.ai
```

## Troubleshooting

| Masalah | Penyebab Umum | Solusi |
|---------|---------------|--------|
| 403 Forbidden | API key tidak valid | Periksa header Authorization |
| Connection Refused | Bot server tidak berjalan | Cek status PM2 di Lightsail |
| 504 Gateway Timeout | Operasi memakan waktu terlalu lama | Periksa logs bot dengan `pm2 logs` |
| Bot Error saat Join | Masalah otentikasi Google | Login manual sekali dari VM Lightsail | 