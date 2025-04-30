#!/bin/bash

# Script untuk setup dan menjalankan bot meeting di Lightsail
# Jalankan script ini setelah clone repo dan instalasi dependencies

# Buat direktori data dan logs jika belum ada
mkdir -p data/user-data-dir data/screenshots logs

# Pastikan dependencies terinstall
if ! command -v google-chrome-stable &> /dev/null
then
    echo "Chrome tidak terinstall, menginstall..."
    sudo apt update
    sudo apt install -y xvfb pulseaudio libxss1 libappindicator1 libasound2 \
      libatk-bridge2.0-0 libgtk-3-0 libnss3 libx11-xcb1 libxcomposite1 \
      libxcursor1 libxdamage1 libxfixes3 libxi6 libxrandr2 libxss1 libxtst6 \
      fonts-liberation libgbm1 libu2f-udev libvulkan1 unzip wget curl
      
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    sudo apt install -y ./google-chrome-stable_current_amd64.deb
fi

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "Node.js tidak terinstall, menginstall..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Cek versi Chrome dan Node
echo "Chrome version: $(google-chrome-stable --version)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install PM2 jika belum terinstall
if ! command -v pm2 &> /dev/null
then
    echo "PM2 tidak terinstall, menginstall..."
    sudo npm install pm2 -g
fi

# Install dependencies jika belum
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Login ke Google Chrome secara manual jika diperlukan
echo "Apakah ingin login Google Chrome secara manual? (y/n)"
read manual_login
if [[ $manual_login == "y" ]]; then
    echo "Membuka Chrome untuk login manual, silakan login dengan akun bot..."
    google-chrome-stable --no-sandbox
    echo "Login manual selesai? (y/n)"
    read login_completed
    if [[ $login_completed != "y" ]]; then
        echo "Login tidak dilanjutkan. Keluar."
        exit 1
    fi
fi

# Setup PM2 untuk menjalankan aplikasi
echo "Membuat konfigurasi PM2..."
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'notula-bot',
    script: 'server-api-lightsail.js',
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

# Mulai aplikasi dengan PM2
echo "Memulai aplikasi bot dengan PM2..."
pm2 start ecosystem.config.js

# Simpan konfigurasi agar restart di boot
echo "Menyimpan konfigurasi PM2..."
pm2 save

# Setup startup script
echo "Mengatur PM2 start pada boot..."
pm2 startup

echo "Setup bot meeting selesai!"
echo "Status PM2:"
pm2 status

echo ""
echo "Gunakan commands berikut untuk manajemen:"
echo "- Restart bot: pm2 restart notula-bot"
echo "- Lihat logs: pm2 logs notula-bot"
echo "- Stop bot: pm2 stop notula-bot"
echo "- Cek status: pm2 status" 