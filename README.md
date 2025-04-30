# Notulen.AI Meeting Bot

Bot meeting untuk Notulen.AI yang dapat bergabung ke Google Meet dan merekam transkrip percakapan.

## Fitur

- Bergabung ke meeting Google Meet secara otomatis
- Merekam transkrip/caption meeting
- API endpoints untuk integrasi dengan frontend
- Persistent session untuk menghindari login ulang
- Error handling dan logging yang komprehensif
- Screenshot otomatis untuk debugging

## Arsitektur

```
Frontend (Next.js) ───▶ Lightsail Bot API ───▶ Google Meet
    │                          │
    └─────────────────▶ Dashboard UI
```

## Prasyarat

- AWS Lightsail instance (minimal 2GB RAM, 1 vCPU)
- Ubuntu 20.04 LTS
- Node.js 18+
- Google Chrome
- Akun Google untuk bot (bot@notula.ai)

## Deployment

### Opsi 1: Deployment Otomatis

Gunakan script `deploy-lightsail.sh` dari lokal:

```bash
# Pastikan PEM key berada di folder yang sama
chmod +x deploy-lightsail.sh
./deploy-lightsail.sh
```

### Opsi 2: Setup Manual

1. **Clone repo ke Lightsail:**

```bash
git clone <repo-url> /home/ubuntu/notula-bot
cd /home/ubuntu/notula-bot
```

2. **Jalankan script setup:**

```bash
chmod +x run-bot.sh
./run-bot.sh
```

## Struktur Proyek

```
├── server-api-lightsail.js     # Server API Express
├── meet-bot-lightsail.js       # Implementasi bot untuk Google Meet
├── run-bot.sh                  # Script setup dan running
├── deploy-lightsail.sh         # Script deployment dari lokal
├── package.json                # Dependencies
├── ecosystem.config.js         # Konfigurasi PM2 (dibuat otomatis)
├── data/                       # Direktori untuk data persisten
│   ├── user-data-dir/          # Chrome user data
│   ├── session.json            # Cookie session
│   └── screenshots/            # Screenshots untuk debugging
└── logs/                       # Direktori untuk log files
```

## API Endpoints

| Endpoint | Method | Deskripsi | Auth |
|----------|--------|-----------|------|
| `/api/health` | GET | Health check | - |
| `/api/join-meeting` | POST | Join ke meeting | Bearer token |
| `/api/meeting-status/:sessionId` | GET | Status meeting | Bearer token |
| `/api/leave-meeting/:sessionId` | POST | Leave meeting | Bearer token |

### Format Request untuk Join Meeting

```json
{
  "url": "https://meet.google.com/xxx-xxxx-xxx"
}
```

### Headers

```
Content-Type: application/json
Authorization: Bearer notulen-ai-bot-key-2024
```

## Integrasi dengan Frontend

Frontend akan mengakses bot meeting melalui API. Contoh penggunaan:

```javascript
const API_URL = 'http://47.129.100.3:8080/api';
const API_KEY = 'notulen-ai-bot-key-2024';

// Join meeting
async function joinMeeting(meetingUrl) {
  const response = await fetch(`${API_URL}/join-meeting`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ url: meetingUrl })
  });
  return await response.json();
}

// Get meeting status
async function getMeetingStatus(sessionId) {
  const response = await fetch(`${API_URL}/meeting-status/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  return await response.json();
}
```

## Manajemen Server

### Melihat Logs

```bash
# Logs API Server
pm2 logs notula-bot

# Atau lihat log file
cat /home/ubuntu/notula-bot/logs/meet-bot.log
cat /home/ubuntu/notula-bot/logs/bot-server.log
```

### Restart Bot

```bash
pm2 restart notula-bot
```

### Stop Bot

```bash
pm2 stop notula-bot
```

## Troubleshooting

### Bot Gagal Join Meeting

1. **Periksa Screenshots:**
   Screenshots otomatis disimpan di `/home/ubuntu/notula-bot/data/screenshots/`

2. **Periksa Session:**
   Pastikan session cookies valid:
   ```bash
   cat /home/ubuntu/notula-bot/data/session.json
   ```

3. **Login Manual:**
   Jalankan Chrome secara manual untuk login:
   ```bash
   google-chrome-stable --no-sandbox
   ```

4. **Reset User Data:**
   Jika diperlukan, reset user data dengan:
   ```bash
   rm -rf /home/ubuntu/notula-bot/data/user-data-dir/*
   ```

5. **Periksa Log:**
   Cek log untuk error:
   ```bash
   cat /home/ubuntu/notula-bot/logs/meet-bot.log
   ```

## Referensi

- [Puppeteer Documentation](https://pptr.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
