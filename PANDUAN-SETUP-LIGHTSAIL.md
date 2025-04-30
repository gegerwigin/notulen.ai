# Panduan Setup Bot Meeting di AWS Lightsail

## Pendahuluan

Dokumen ini berisi panduan langkah demi langkah untuk men-deploy bot meeting Notulen.AI di AWS Lightsail. Lightsail dipilih karena menyediakan VM lengkap yang diperlukan untuk menjalankan Chrome/Chromium secara headless untuk bergabung ke Google Meet.

## Langkah 1: Membuat Instance Lightsail

1. Login ke [AWS Management Console](https://aws.amazon.com/console/)
2. Pilih layanan "Lightsail"
3. Klik "Create instance"
4. Pilih Region: Asia Pacific (Singapore) - ap-southeast-1
5. Pilih platform: Linux/Unix
6. Pilih blueprint: OS Only > Ubuntu 20.04 LTS
7. Pilih plan: Minimal $5/bulan (1GB RAM, 1 vCPU, 40GB SSD)
   - Untuk performa lebih baik, gunakan plan $10/bulan (2GB RAM, 1 vCPU)
8. Beri nama instance: notula-meeting-bot
9. Klik "Create instance"

## Langkah 2: Mengatur Firewall

1. Pilih instance yang baru dibuat
2. Pilih tab "Networking"
3. Pada "Firewall", tambahkan aturan:
   - Application: Custom, Protocol: TCP, Port: 8080
   - Application: HTTP, Protocol: TCP, Port: 80
   - Application: HTTPS, Protocol: TCP, Port: 443

## Langkah 3: Connect ke Instance

1. Pilih instance
2. Klik tombol "Connect using SSH" atau gunakan SSH client lain

Jika ingin menggunakan SSH client, download private key dari tab "Connect" dan gunakan perintah:

```bash
ssh -i /path/to/private-key.pem ubuntu@<IP_LIGHTSAIL>
```

## Langkah 4: Setup Bot Meeting

### Install dependencies

```bash
# Update repository
sudo apt update
sudo apt upgrade -y

# Install dependencies untuk Chrome
sudo apt install -y xvfb pulseaudio libxss1 libappindicator1 libasound2 \
    libatk-bridge2.0-0 libgtk-3-0 libnss3 libx11-xcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxfixes3 libxi6 libxrandr2 libxss1 libxtst6 \
    fonts-liberation libgbm1 libu2f-udev libvulkan1 unzip wget curl

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi instalasi Node.js
node -v
npm -v

# Install Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb

# Verifikasi instalasi Chrome
google-chrome --version
```

### Buat direktori aplikasi

```bash
mkdir -p ~/notula-bot
cd ~/notula-bot
```

### Copy file bot dari local machine

Jika ingin men-deploy dari local machine, gunakan perintah berikut di terminal lokal:

```bash
scp -i /path/to/private-key.pem server-api.js meet-bot-stealth.js package.json ecosystem.config.js ubuntu@<IP_LIGHTSAIL>:~/notula-bot/
```

### Konfigurasi aplikasi

```bash
cd ~/notula-bot

# Install dependencies
npm install

# Buat file ecosystem.config.js jika belum ada
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'notula-bot',
    script: 'server-api.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080,
      CHROME_BIN: '/usr/bin/google-chrome-stable',
      BOT_EMAIL: 'bot@notula.ai',
      BOT_PASSWORD: '1sampai9',
      BOT_API_KEY: 'notulen-ai-bot-key-2024'
    }
  }]
}
EOL

# Install PM2
sudo npm install -g pm2
```

## Langkah 5: Login Akun Google untuk Bot

Sebelum menjalankan bot, login manual dari VM untuk memastikan autentikasi berjalan lancar:

```bash
# Setup X11 forwarding (opsional, jika ingin run GUI)
# Untuk Windows, install VcXsrv atau Xming
# Untuk Mac/Linux, enable X11 forwarding di SSH

# Jalankan Chrome untuk login manual
google-chrome --no-sandbox
```

Pada browser yang terbuka:
1. Buka https://accounts.google.com
2. Login dengan akun bot: bot@notula.ai (password: 1sampai9)
3. Buka https://meet.google.com dan pastikan login berhasil

## Langkah 6: Jalankan Bot Service

```bash
# Start bot dengan PM2
cd ~/notula-bot
pm2 start ecosystem.config.js

# Setup autostart pada boot
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Cek status bot
pm2 status
pm2 logs
```

## Langkah 7: Setup Nginx (Opsional)

Jika ingin menggunakan domain dan HTTPS:

```bash
# Install Nginx dan Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Buat konfigurasi Nginx
sudo nano /etc/nginx/sites-available/notula-bot
```

Isi dengan konfigurasi berikut:

```
server {
    listen 80;
    server_name <YOUR_DOMAIN>; # Contoh: bot.notula.ai

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

Aktifkan site dan dapatkan SSL:

```bash
sudo ln -s /etc/nginx/sites-available/notula-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL dengan Certbot
sudo certbot --nginx -d <YOUR_DOMAIN>
```

## Langkah 8: Test API

```bash
# Test health check
curl http://localhost:8080/api/health

# Test join meeting (ganti dengan URL meeting yang valid)
curl -X POST http://localhost:8080/api/join-meeting \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer notulen-ai-bot-key-2024" \
  -d '{"url":"https://meet.google.com/abc-defg-hij"}'
```

## Troubleshooting

### Bot Error "Navigation Timeout"

Kemungkinan penyebab:
1. Browser tidak dapat menjalankan sesi GUI virtual
2. Resource yang tidak cukup
3. Masalah autentikasi

Solusi:
```bash
# Cek log untuk detail error
pm2 logs notula-bot

# Pastikan Chrome dapat berjalan
google-chrome --no-sandbox --headless --disable-gpu https://meet.google.com

# Pastikan dependencies terpasang
sudo apt install -y xvfb pulseaudio
```

### Bot Tidak Dapat Join Meeting

Kemungkinan penyebab:
1. Akun Google terdeteksi perilaku tidak biasa
2. IP server terblokir oleh Google

Solusi:
```bash
# Login manual dari server
google-chrome --no-sandbox

# Coba login dengan browser headless
node -e "const puppeteer = require('puppeteer'); (async () => { const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']}); const page = await browser.newPage(); await page.goto('https://accounts.google.com', {waitUntil: 'networkidle2'}); await page.screenshot({path: 'google-accounts.png'}); await browser.close(); })()"

# Cek screenshot untuk melihat apakah ada halaman captcha/verifikasi
```

### Masalah Memory

```bash
# Monitor penggunaan memory
free -m

# Tambahkan swap jika perlu
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Konfigurasi Chrome untuk menggunakan less memory
# Edit ecosystem.config.js dan tambahkan flag di environment variables:
# PUPPETEER_ARGS: '--disable-dev-shm-usage --disable-features=site-per-process'
```

## Referensi

- [AWS Lightsail Documentation](https://docs.aws.amazon.com/lightsail/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Puppeteer Documentation](https://pptr.dev/)
- [Google Meet API](https://developers.google.com/meet) 