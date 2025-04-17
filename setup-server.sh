#!/bin/bash

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb

# Install ChromeDriver
CHROME_VERSION=$(google-chrome --version | cut -d " " -f3 | cut -d "." -f1)
wget https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${CHROME_VERSION}
CHROMEDRIVER_VERSION=$(cat LATEST_RELEASE_${CHROME_VERSION})
wget https://chromedriver.storage.googleapis.com/${CHROMEDRIVER_VERSION}/chromedriver_linux64.zip
unzip chromedriver_linux64.zip
sudo mv chromedriver /usr/bin/chromedriver
sudo chown root:root /usr/bin/chromedriver
sudo chmod +x /usr/bin/chromedriver

# Create bot directory
mkdir -p /home/ubuntu/notulen-bot
cd /home/ubuntu/notulen-bot

# Install dependencies
npm init -y
npm install puppeteer-core express cors uuid

# Create systemd service
sudo tee /etc/systemd/system/notulen-bot.service << EOF
[Unit]
Description=Notulen AI Meeting Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/notulen-bot
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=HOST=0.0.0.0
Environment=API_KEY=notulen-ai-bot-key-2024
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable notulen-bot
sudo systemctl start notulen-bot

echo "Bot server setup complete!" 