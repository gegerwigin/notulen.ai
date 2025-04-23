# Panduan Implementasi Bot Google Meet

## Persiapan Awal
Pastikan sistem Anda memiliki:
- Node.js v18 atau lebih baru
- Docker Desktop
- Git
- Text editor (VS Code disarankan)

## Langkah 1: Setup Project
1. Buat struktur folder project:
```bash
mkdir meet-bot
cd meet-bot
npm init -y
```

2. Install dependensi yang diperlukan:
```bash
npm install express puppeteer winston cors dotenv
npm install --save-dev nodemon
```

3. Update package.json dengan script berikut:
```json
{
  "name": "meet-bot",
  "version": "1.0.0",
  "description": "Google Meet Bot with Docker and Browserless Chrome",
  "main": "docker-server.js",
  "scripts": {
    "start": "node docker-server.js",
    "start:dev": "NODE_ENV=development node docker-server.js",
    "start:prod": "NODE_ENV=production node docker-server.js",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "docker:restart": "docker-compose restart",
    "clean": "rm -rf logs/*.log"
  }
}
```

## Langkah 2: Implementasi Kode
1. Buat file `docker-meet-bot.js`:
- Implementasi bot menggunakan Puppeteer
- Konfigurasi untuk browserless/chrome
- Fungsi untuk join dan leave meeting
- Penanganan error dan logging

2. Buat file `docker-server.js`:
- Setup Express server
- Implementasi endpoint API
- Konfigurasi logging
- Penanganan error

3. Buat file `Dockerfile.alt`:
- Base image Node.js
- Setup working directory
- Install dependensi
- Konfigurasi untuk production

4. Buat file `docker-compose.yml`:
- Konfigurasi service chrome (browserless)
- Konfigurasi service meet-bot
- Setup networking
- Volume untuk logs

## Langkah 3: Build dan Run
1. Build Docker image:
```bash
docker-compose build
```

2. Jalankan container:
```bash
docker-compose up -d
```

3. Cek logs:
```bash
docker-compose logs -f
```

## Langkah 4: Testing API
1. Test endpoint health check:
```bash
curl http://localhost:3002/health
```

2. Test join meeting:
```bash
curl -X POST http://localhost:3002/join \
  -H "Content-Type: application/json" \
  -d '{"url":"https://meet.google.com/xxx-yyyy-zzz","username":"Bot User"}'
```

3. Test leave meeting:
```bash
curl -X POST http://localhost:3002/leave
```

## Langkah 5: Setup Production
1. Konfigurasi environment variables di `.env`:
```env
NODE_ENV=production
PORT=3002
LOG_LEVEL=info
```

2. Update security settings:
- Implementasi rate limiting
- Setup CORS
- Validasi input

## Langkah 6: Monitoring
1. Setup logging:
- Winston untuk application logs
- Docker logs
- Error tracking

2. Implementasi metrics:
- Success/failure rates
- Response times
- Resource usage

## Langkah 7: CI/CD
1. Setup GitHub Actions:
- Automated testing
- Docker build
- Deployment

2. Deployment script:
- Backup
- Rolling updates
- Rollback plan

## Langkah 8: Maintenance
1. Regular tasks:
- Log rotation
- Container health checks
- Dependency updates

2. Troubleshooting guide:
- Common issues
- Debug procedures
- Support contacts

## Struktur File
```
meet-bot/
├── docker-meet-bot.js     # Bot implementation
├── docker-server.js       # Express server
├── Dockerfile.alt         # Docker configuration
├── docker-compose.yml     # Services configuration
├── package.json          # Dependencies
├── .env                  # Environment variables
└── logs/                 # Log files
```

## API Endpoints

### Health Check
- GET `/health`
- Response: `{"success":true,"status":"OK","botInitialized":true}`

### Join Meeting
- POST `/join`
- Body: `{"url":"meeting_url","username":"display_name"}`
- Response: `{"success":true,"message":"Berhasil bergabung ke meeting"}`

### Leave Meeting
- POST `/leave`
- Response: `{"success":true,"message":"Berhasil meninggalkan meeting"}`

## Troubleshooting

### Common Issues
1. Docker Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```
Solusi: Pastikan browserless/chrome container berjalan

2. Browser Launch Error
```
Error: Failed to launch browser
```
Solusi: Periksa koneksi ke browserless/chrome

3. Join Meeting Error
```
Error: Failed to join meeting
```
Solusi: 
- Periksa URL meeting
- Pastikan format username benar
- Cek log untuk detail error

### Debug Mode
Untuk mengaktifkan debug mode:
1. Set environment variable:
```bash
export DEBUG=meet-bot:*
```

2. Jalankan dengan mode development:
```bash
npm run start:dev
```

## Maintenance

### Log Rotation
Gunakan logrotate untuk mengelola log files:
```conf
/app/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 node node
}
```

### Backup
Jalankan backup secara regular:
```bash
# Backup logs
tar -czf backup-$(date +%Y%m%d).tar.gz logs/

# Backup container
docker commit meet-bot meet-bot:backup-$(date +%Y%m%d)
```

### Updates
1. Update dependencies:
```bash
npm update
```

2. Update containers:
```bash
docker-compose pull
docker-compose up -d
```

## Security Best Practices
1. Gunakan secrets management
2. Implementasi rate limiting
3. Validasi semua input
4. Regular security updates
5. Monitoring akses

## Support
Untuk bantuan teknis:
1. Cek logs: `docker-compose logs -f`
2. Restart services: `docker-compose restart`
3. Rebuild jika diperlukan: `docker-compose up -d --build` 