#!/bin/bash

# Script untuk deployment ke AWS Lightsail
# Jalankan dari direktori project lokal

# Konfigurasi
LIGHTSAIL_IP="47.129.100.3"
LIGHTSAIL_USER="ubuntu"
SSH_KEY_PATH="LightsailDefaultKey-ap-southeast-1.pem"
REMOTE_DIR="/home/ubuntu/notula-bot"

# Periksa apakah key file ada
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "Error: File key PEM tidak ditemukan: $SSH_KEY_PATH"
    echo "Pastikan file key PEM berada di direktori yang sama dengan script ini."
    exit 1
fi

# Set permission untuk key file
chmod 400 "$SSH_KEY_PATH"

# Persiapkan direktori di Lightsail
echo "Membuat direktori di Lightsail..."
ssh -i "$SSH_KEY_PATH" $LIGHTSAIL_USER@$LIGHTSAIL_IP "mkdir -p $REMOTE_DIR"

# Upload file-file yang diperlukan
echo "Uploading files ke Lightsail..."
scp -i "$SSH_KEY_PATH" server-api-lightsail.js meet-bot-lightsail.js package.json run-bot.sh $LIGHTSAIL_USER@$LIGHTSAIL_IP:$REMOTE_DIR/

# Set permission untuk script
echo "Setting permissions..."
ssh -i "$SSH_KEY_PATH" $LIGHTSAIL_USER@$LIGHTSAIL_IP "chmod +x $REMOTE_DIR/run-bot.sh"

# Connect ke Lightsail dan setup
echo "Setting up dan menjalankan bot di Lightsail..."
ssh -i "$SSH_KEY_PATH" $LIGHTSAIL_USER@$LIGHTSAIL_IP << 'ENDSSH'
cd /home/ubuntu/notula-bot
bash run-bot.sh
ENDSSH

echo "Deployment selesai!"
echo "URL API Bot: http://$LIGHTSAIL_IP:8080/api"
echo ""
echo "Testing API Health:"
curl -s "http://$LIGHTSAIL_IP:8080/api/health"
echo "" 