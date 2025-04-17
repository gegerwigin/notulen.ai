#!/bin/bash

# Update system and install dependencies
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

# Create project directory
mkdir -p /home/bitnami/notulen-bot
cd /home/bitnami/notulen-bot

# Create meet.cjs
cat > meet.cjs << 'EOL'
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { Options } = chrome;
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const MEET_LINK = process.argv[2] || 'https://meet.google.com/gpx-qdzm-twm';
const USER_DATA_DIR = path.join(__dirname, 'chrome-user-data');
const LOG_FILE = 'meet.log';
const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL || 'notula.ai2025@gmail.com';
const GOOGLE_PASSWORD = process.env.GOOGLE_PASSWORD || '1sampai9';

function log(message, error = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}${error ? '\nError: ' + error.stack : ''}\n`;
    console.log(logMessage);
    fs.appendFileSync(LOG_FILE, logMessage);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function killChromeProcesses() {
    try {
        await execAsync('pkill -f chrome');
        log('Killed existing Chrome processes');
    } catch (error) {
        log('No Chrome processes to kill');
    }
}

async function startBrowser() {
    if (!fs.existsSync(USER_DATA_DIR)) {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    }

    const options = new Options();
    options.addArguments(
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--window-size=1280,720',
        '--disable-extensions',
        '--disable-popup-blocking',
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--enable-unsafe-swiftshader',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--disable-software-rasterizer',
        '--disable-gl-drawing-for-tests',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        `--user-data-dir=${USER_DATA_DIR}`
    );

    options.addArguments('--lang=en-US,en');
    options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    options.setChromeBinaryPath('/usr/bin/google-chrome');

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    return driver;
}

async function login(driver) {
    try {
        log('Starting login process...');
        await driver.get('https://accounts.google.com');
        await sleep(2000);
        
        log('Entering email...');
        await driver.wait(until.elementLocated(By.name('identifier')), 10000);
        const emailInput = await driver.findElement(By.name('identifier'));
        
        for (const char of GOOGLE_EMAIL) {
            await emailInput.sendKeys(char);
            await sleep(Math.random() * 200 + 100);
        }
        await sleep(1000);
        await emailInput.sendKeys(Key.RETURN);
        
        await sleep(3000);
        log('Entering password...');
        await driver.wait(until.elementLocated(By.name('password')), 15000);
        const passwordInput = await driver.findElement(By.name('password'));
        
        for (const char of GOOGLE_PASSWORD) {
            await passwordInput.sendKeys(char);
            await sleep(Math.random() * 200 + 100);
        }
        await sleep(1000);
        await passwordInput.sendKeys(Key.RETURN);
        
        log('Waiting for login completion...');
        await sleep(8000);
        
        try {
            const challengeButton = await driver.findElements(By.css('[role="button"]'));
            if (challengeButton.length > 0) {
                log('Detected possible security challenge');
            }
        } catch (error) {
            // Ignore if no security challenge found
        }
        
        log('Login process completed');
    } catch (error) {
        log('Error during login', error);
        throw error;
    }
}

async function joinMeet(driver) {
    try {
        log(`Attempting to join meeting: ${MEET_LINK}`);
        await driver.get(MEET_LINK);
        log('Navigated to meeting URL');
        await sleep(5000);

        // Try different join button selectors
        const joinButtonSelectors = [
            "//span[contains(text(), 'Join now')]",
            "//span[contains(text(), 'Ask to join')]",
            "//button[contains(@aria-label, 'Join now')]",
            "//button[contains(@aria-label, 'Ask to join')]",
            "//div[contains(@role, 'button')]/span[contains(text(), 'Join now')]",
            "//div[contains(@role, 'button')]/span[contains(text(), 'Ask to join')]"
        ];

        // Check if login is needed
        const loginButtonXPath = "//a[contains(@href, 'accounts.google.com')]";
        const loginElements = await driver.findElements(By.xpath(loginButtonXPath));
        if (loginElements.length > 0) {
            log('Login required - attempting login');
            await login(driver);
            await driver.get(MEET_LINK);
            log('Returned to meeting URL after login');
            await sleep(5000);
        }

        let joined = false;
        for (const selector of joinButtonSelectors) {
            try {
                log(`Trying join button selector: ${selector}`);
                const button = await driver.wait(until.elementLocated(By.xpath(selector)), 10000);
                await driver.executeScript("arguments[0].click();", button);
                joined = true;
                log('Successfully clicked join button');
                break;
            } catch (error) {
                log(`Selector ${selector} failed: ${error.message}`);
                continue;
            }
        }

        if (!joined) {
            log('Failed to find join button with standard selectors, trying JavaScript injection');
            await driver.executeScript(`
                function findJoinButton() {
                    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
                    return buttons.find(button => {
                        const text = button.textContent.toLowerCase();
                        return text.includes('join now') || text.includes('ask to join');
                    });
                }
                const joinButton = findJoinButton();
                if (joinButton) {
                    joinButton.click();
                    return true;
                }
                return false;
            `);
        }

        await sleep(5000);
        log('Join attempt completed');

        // Keep session alive
        while (true) {
            await sleep(60000);
            try {
                const url = await driver.getCurrentUrl();
                log(`Session alive at: ${url}`);
            } catch (error) {
                throw new Error('Lost connection to meeting');
            }
        }
    } catch (error) {
        log('Error in joinMeet', error);
        throw error;
    }
}

async function main() {
    let driver;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            await killChromeProcesses();
            log(`Starting browser (attempt ${attempts}/${maxAttempts})...`);
            driver = await startBrowser();
            await joinMeet(driver);
            break;
        } catch (error) {
            log(`Attempt ${attempts} failed`, error);
            if (driver) {
                try {
                    await driver.quit();
                } catch (quitError) {
                    log('Error while quitting driver', quitError);
                }
            }
            if (attempts < maxAttempts) {
                log('Retrying in 5 seconds...');
                await sleep(5000);
            } else {
                log('Max retries reached, exiting...');
                process.exit(1);
            }
        }
    }
}

process.on('SIGTERM', async () => {
    log('Received SIGTERM signal');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    log('Uncaught exception', error);
    process.exit(1);
});

main();
EOL

# Create package.json
cat > package.json << 'EOL'
{
  "name": "notulen-bot",
  "version": "1.0.0",
  "description": "Notulen.ai Meeting Bot",
  "main": "meet.cjs",
  "scripts": {
    "start": "node meet.cjs"
  },
  "dependencies": {
    "selenium-webdriver": "^4.18.1"
  }
}
EOL

# Install dependencies
npm install

# Create systemd service
sudo tee /etc/systemd/system/notulen-bot.service << EOF
[Unit]
Description=Notulen AI Meeting Bot
After=network.target

[Service]
Type=simple
User=bitnami
WorkingDirectory=/home/bitnami/notulen-bot
Environment=GOOGLE_EMAIL=notula.ai2025@gmail.com
Environment=GOOGLE_PASSWORD=1sampai9
ExecStart=/usr/bin/node meet.cjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable notulen-bot
sudo systemctl start notulen-bot

echo "Bot deployment complete!" 