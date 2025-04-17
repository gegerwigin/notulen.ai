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
const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL || '';
const GOOGLE_PASSWORD = process.env.GOOGLE_PASSWORD || '';

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
        if (process.platform === 'win32') {
            await execAsync('taskkill /F /IM chrome.exe /T');
        } else {
            await execAsync('pkill -f chrome');
        }
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
        `--user-data-dir=${USER_DATA_DIR}`
    );

    options.addArguments('--lang=en-US,en');
    options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    if (process.platform !== 'win32') {
        options.setChromeBinaryPath('/usr/bin/google-chrome');
    }

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
        
        const email = 'notula.ai2025@gmail.com';
        for (const char of email) {
            await emailInput.sendKeys(char);
            await sleep(Math.random() * 200 + 100);
        }
        await sleep(1000);
        await emailInput.sendKeys(Key.RETURN);
        
        await sleep(3000);
        log('Entering password...');
        await driver.wait(until.elementLocated(By.name('password')), 15000);
        const passwordInput = await driver.findElement(By.name('password'));
        
        const password = '1sampai9';
        for (const char of password) {
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
                log('Detected possible security challenge, taking screenshot...');
                await driver.takeScreenshot().then(
                    data => fs.writeFileSync('security_challenge.png', data, 'base64')
                );
            }
        } catch (error) {
            // Ignore if no security challenge found
        }
        
        log('Login process completed');
        
        await driver.takeScreenshot().then(
            data => fs.writeFileSync('login_result.png', data, 'base64')
        );
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

        const joinButtonXPath = "//span[contains(text(), 'Join now') or contains(text(), 'Ask to join')]";
        const loginButtonXPath = "//a[contains(@href, 'accounts.google.com')]";
        
        log('Waiting for join/login button...');
        await driver.wait(until.elementLocated(By.xpath(`${joinButtonXPath}|${loginButtonXPath}`)), 30000);
        
        await driver.takeScreenshot().then(
            data => fs.writeFileSync('current_state.png', data, 'base64')
        );

        const loginElements = await driver.findElements(By.xpath(loginButtonXPath));
        if (loginElements.length > 0) {
            log('Login required - attempting login');
            await login(driver);
            await driver.get(MEET_LINK);
            log('Returned to meeting URL after login');
        }

        log('Looking for join button...');
        await driver.wait(until.elementLocated(By.xpath(joinButtonXPath)), 30000);
        const joinButton = await driver.findElement(By.xpath(joinButtonXPath));
        await driver.executeScript("arguments[0].click();", joinButton);
        log('Clicked join button');

        await sleep(5000);
        await driver.takeScreenshot().then(
            data => fs.writeFileSync('joined_meeting.png', data, 'base64')
        );
        log('Successfully joined meeting');

        while (true) {
            await sleep(60000);
            log('Session alive');
            
            try {
                await driver.getCurrentUrl();
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
    if (!GOOGLE_EMAIL || !GOOGLE_PASSWORD) {
        log('Error: Google account credentials not provided');
        process.exit(1);
    }

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