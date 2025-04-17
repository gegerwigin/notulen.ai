#!/bin/bash

# Buat direktori project
mkdir -p ~/meetbot
cd ~/meetbot

# Install dependencies sistem
sudo apt-get update
sudo apt-get install -y wget unzip curl

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

# Copy meet.js ke direktori project
cat > meet.js << 'EOL'
import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userDataDir = path.join(__dirname, 'chrome-profile');
if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
}

const logFile = path.join(__dirname, 'meet.log');
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(logFile, logMessage);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    let driver;
    try {
        const options = new chrome.Options()
            .addArguments('--headless=new')
            .addArguments('--no-sandbox')
            .addArguments('--disable-dev-shm-usage')
            .addArguments('--disable-gpu')
            .addArguments('--window-size=1280,720')
            .addArguments('--disable-software-rasterizer')
            .addArguments('--disable-extensions')
            .addArguments('--disable-gl-drawing-for-tests')
            .addArguments('--enable-unsafe-swiftshader')
            .addArguments(`--user-data-dir=${userDataDir}`)
            .addArguments('--mute-audio')
            .addArguments('--disable-notifications')
            .addArguments('--disable-features=DialMediaRouteProvider');

        log('Initializing driver with persistent profile');
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        const meetUrl = process.argv[2];
        if (!meetUrl) {
            throw new Error('Please provide a Google Meet URL as an argument');
        }

        log(`Navigating to ${meetUrl}`);
        await driver.get(meetUrl);

        // Wait for and click dismiss button if present
        try {
            const dismissButton = await driver.wait(until.elementLocated(By.css('[aria-label="Dismiss"]')), 5000);
            await dismissButton.click();
            log('Clicked dismiss button');
        } catch (error) {
            log('No dismiss button found, continuing...');
        }

        // Take screenshot before joining
        const beforeJoinScreenshot = path.join(screenshotDir, 'before-join.png');
        await driver.takeScreenshot().then(data => {
            fs.writeFileSync(beforeJoinScreenshot, data, 'base64');
        });
        log('Took screenshot before joining');

        // Check if we need to sign in
        try {
            const signInButton = await driver.findElement(By.css('a[data-authuser]'));
            if (signInButton) {
                log('Found sign in button, clicking...');
                await signInButton.click();
                await sleep(3000);
            }
        } catch (error) {
            log('No sign in button found, continuing...');
        }

        // Wait for and click join button
        let joinAttempts = 0;
        const maxJoinAttempts = 5;
        while (joinAttempts < maxJoinAttempts) {
            try {
                // Try to find and click the join button using JavaScript
                await driver.executeScript(`
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const joinButton = buttons.find(button => 
                        button.textContent.toLowerCase().includes('join now') || 
                        button.textContent.toLowerCase().includes('ask to join')
                    );
                    if (joinButton) {
                        joinButton.click();
                        return true;
                    }
                    return false;
                `);
                
                log('Clicked join button');
                break;
            } catch (error) {
                joinAttempts++;
                log(`Join attempt ${joinAttempts} failed: ${error.message}`);
                if (joinAttempts === maxJoinAttempts) {
                    throw new Error('Failed to join meeting after maximum attempts');
                }
                await sleep(2000);
            }
        }

        // Take screenshot after joining
        await sleep(5000);
        const afterJoinScreenshot = path.join(screenshotDir, 'after-join.png');
        await driver.takeScreenshot().then(data => {
            fs.writeFileSync(afterJoinScreenshot, data, 'base64');
        });
        log('Took screenshot after joining');

        // Keep the session alive
        log('Keeping session alive...');
        while (true) {
            try {
                await driver.getCurrentUrl();
                await sleep(30000);
            } catch (error) {
                log('Session error, attempting to reconnect...');
                break;
            }
        }

    } catch (error) {
        log(`Error: ${error.message}`);
        if (driver) {
            const errorScreenshot = path.join(screenshotDir, 'error.png');
            await driver.takeScreenshot().then(data => {
                fs.writeFileSync(errorScreenshot, data, 'base64');
            });
        }
        throw error;
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

main().catch(error => {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
});
EOL

# Create package.json
cat > package.json << 'EOL'
{
  "name": "meetbot",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "selenium-webdriver": "^4.18.1"
  }
}
EOL

# Install dependencies
npm install

# Create systemd service
sudo tee /etc/systemd/system/meetbot.service << EOL
[Unit]
Description=Meet Bot Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/meetbot
ExecStart=/usr/bin/node meet.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

# Enable dan start service
sudo systemctl daemon-reload
sudo systemctl enable meetbot
sudo systemctl start meetbot

echo "Setup complete! Bot is ready to use." 