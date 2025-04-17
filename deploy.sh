#!/bin/bash

# Update system and install basic packages
sudo apt-get update
sudo apt-get install -y curl git unzip build-essential

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb
rm google-chrome-stable_current_amd64.deb

# Get Chrome version and install matching ChromeDriver
CHROME_VERSION=$(google-chrome --version | cut -d " " -f3 | cut -d "." -f1)
wget https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${CHROME_VERSION}
CHROMEDRIVER_VERSION=$(cat LATEST_RELEASE_${CHROME_VERSION})
wget https://chromedriver.storage.googleapis.com/${CHROMEDRIVER_VERSION}/chromedriver_linux64.zip
unzip chromedriver_linux64.zip
sudo mv chromedriver /usr/bin/chromedriver
sudo chown root:root /usr/bin/chromedriver
sudo chmod +x /usr/bin/chromedriver

# Clean up downloaded files
rm chromedriver_linux64.zip LATEST_RELEASE_${CHROME_VERSION}

# Create project directory
PROJECT_DIR="/home/bitnami/notulen-bot"
sudo mkdir -p $PROJECT_DIR
sudo chown -R bitnami:bitnami $PROJECT_DIR

# Copy project files
# Note: This will be done manually after uploading files to server

# Create systemd service file
sudo tee /etc/systemd/system/notulen-bot.service << EOF
[Unit]
Description=Notulen Bot Service
After=network.target

[Service]
Type=simple
User=bitnami
WorkingDirectory=/home/bitnami/notulen-bot
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=notulen-bot

[Install]
WantedBy=multi-user.target
EOF

# Set up logging
sudo tee /etc/rsyslog.d/notulen-bot.conf << EOF
if \$programname == 'notulen-bot' then /var/log/notulen-bot.log
& stop
EOF

# Restart rsyslog to apply changes
sudo systemctl restart rsyslog

# Create log file and set permissions
sudo touch /var/log/notulen-bot.log
sudo chown syslog:adm /var/log/notulen-bot.log

# Install project dependencies and build
cd $PROJECT_DIR
npm install
npm run build

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable notulen-bot
sudo systemctl start notulen-bot

echo "Deployment completed! Check service status with: sudo systemctl status notulen-bot" 