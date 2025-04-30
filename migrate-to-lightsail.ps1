# Script untuk mempersiapkan files untuk migrasi ke Lightsail
# Jalankan script ini dari project root

# Konfigurasi
$LIGHTSAIL_IP = "<IP_LIGHTSAIL_ANDA>" # Ganti dengan IP Lightsail yang sebenarnya
$LIGHTSAIL_USER = "ubuntu" # Username default Lightsail untuk Ubuntu
$OUTPUT_DIR = ".\lightsail-deploy"
$SSH_KEY_PATH = "~\.ssh\lightsail-key.pem" # Path ke private key Lightsail

# Buat direktori output jika belum ada
if (-not (Test-Path $OUTPUT_DIR)) {
    New-Item -ItemType Directory -Path $OUTPUT_DIR | Out-Null
    Write-Host "Direktori $OUTPUT_DIR dibuat."
}

# Copy file-file yang diperlukan
$FILES_TO_COPY = @(
    ".\server-api.js",
    ".\meet-bot-stealth.js",
    ".\package.json"
)

foreach ($file in $FILES_TO_COPY) {
    Copy-Item -Path $file -Destination $OUTPUT_DIR -Force
    Write-Host "File $file di-copy ke $OUTPUT_DIR"
}

# Buat file ecosystem.config.js untuk PM2
$ECOSYSTEM_CONFIG = @"
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
"@

$ECOSYSTEM_CONFIG | Out-File -FilePath "$OUTPUT_DIR\ecosystem.config.js" -Encoding utf8
Write-Host "File ecosystem.config.js dibuat di $OUTPUT_DIR"

# Buat script setup untuk Lightsail
$SETUP_SCRIPT = @'
#!/bin/bash

# Update sistem
sudo apt update
sudo apt upgrade -y

# Install dependencies untuk Chrome headless
sudo apt install -y xvfb pulseaudio libxss1 libappindicator1 libasound2 \
    libatk-bridge2.0-0 libgtk-3-0 libnss3 libx11-xcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxfixes3 libxi6 libxrandr2 libxss1 libxtst6 \
    fonts-liberation libgbm1 libu2f-udev libvulkan1 unzip wget curl

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb

# Install PM2
sudo npm install -g pm2

# Buat direktori bot jika belum ada
mkdir -p ~/notula-bot

# Pindahkan files ke direktori
mv *.js ~/notula-bot/
mv package.json ~/notula-bot/

# Setup aplikasi
cd ~/notula-bot
npm install
pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
'@

$SETUP_SCRIPT | Out-File -FilePath "$OUTPUT_DIR\setup-lightsail.sh" -Encoding utf8 -NoNewline
Write-Host "File setup-lightsail.sh dibuat di $OUTPUT_DIR"

Write-Host "`nPersiapan files untuk Lightsail selesai."
Write-Host "Files tersedia di: $OUTPUT_DIR"
Write-Host "`nLangkah selanjutnya:"
Write-Host "1. Ganti <IP_LIGHTSAIL_ANDA> di script ini dengan IP Lightsail yang sebenarnya"
Write-Host "2. Upload files ke Lightsail dengan perintah:"
Write-Host "   scp -i $SSH_KEY_PATH -r ${OUTPUT_DIR}\* ${LIGHTSAIL_USER}@${LIGHTSAIL_IP}:~/"
Write-Host "3. SSH ke instance Lightsail:"
Write-Host "   ssh -i $SSH_KEY_PATH ${LIGHTSAIL_USER}@${LIGHTSAIL_IP}"
Write-Host "4. Jalankan script setup:"
Write-Host "   chmod +x setup-lightsail.sh && ./setup-lightsail.sh" 