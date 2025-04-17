const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MEET_LINK = process.argv[2] || 'https://meet.google.com/test';
const USER_DATA_DIR = path.join(__dirname, 'chrome-user-data');
const LOG_FILE = path.join(__dirname, 'meet.log');
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// Credentials from environment variables
const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL;
const GOOGLE_PASSWORD = process.env.GOOGLE_PASSWORD;

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
            execSync('taskkill /F /IM chrome.exe /T', { stdio: 'ignore' });
        } else {
            execSync('pkill -f chrome', { stdio: 'ignore' });
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

    const service = new chrome.ServiceBuilder('/usr/local/bin/chromedriver')
        .build();

    const options = new chrome.Options();
    options.addArguments(
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-popup-blocking',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        `--user-data-dir=${USER_DATA_DIR}`,
        '--window-size=1280,720'
    );

    options.addArguments('--lang=en-US,en');
    options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.95 Safari/537.36');

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .setChromeService(service)
        .build();

    return driver;
}

async function login(driver) {
    try {
        log('Starting login process...');
        await driver.get('https://accounts.google.com');
        await sleep(3000);

        // Enter email
        log('Entering email...');
        const emailInput = await driver.wait(
            until.elementLocated(By.css('input[type="email"]')),
            10000
        );
        await emailInput.clear();
        for (const char of GOOGLE_EMAIL) {
            await emailInput.sendKeys(char);
            await sleep(100);
        }
        await sleep(1000);
        await emailInput.sendKeys(Key.RETURN);
        await sleep(3000);

        // Enter password
        log('Entering password...');
        const passwordInput = await driver.wait(
            until.elementLocated(By.css('input[type="password"]')),
            10000
        );
        await passwordInput.clear();
        for (const char of GOOGLE_PASSWORD) {
            await passwordInput.sendKeys(char);
            await sleep(100);
        }
        await sleep(1000);
        await passwordInput.sendKeys(Key.RETURN);
        await sleep(5000);

        log('Login completed');
        
        // Take screenshot for verification
        await driver.takeScreenshot().then(
            data => fs.writeFileSync('login_complete.png', data, 'base64')
        );
    } catch (error) {
        log('Login error', error);
        throw error;
    }
}

async function joinMeet(driver) {
    try {
        log(`Attempting to join meeting: ${MEET_LINK}`);
        await driver.get(MEET_LINK);
        await sleep(5000);
        log('Loaded meeting page');

        // Take screenshot of initial state
        await driver.takeScreenshot().then(
            data => fs.writeFileSync('meeting_page.png', data, 'base64')
        );

        // Check if login is needed
        const pageSource = await driver.getPageSource();
        if (pageSource.includes('Sign in') || pageSource.includes('accounts.google.com')) {
            log('Login required - starting login process');
            await login(driver);
            await driver.get(MEET_LINK);
            await sleep(5000);
        }

        // Handle camera/microphone permissions
        try {
            await driver.executeScript(`
                navigator.mediaDevices.getUserMedia({ audio: true, video: true })
                    .then(() => {})
                    .catch(() => {});
            `);
        } catch (error) {
            log('Media permission handling error (non-critical)', error);
        }

        // Wait for and click dismiss button if present
        try {
            const dismissButtons = await driver.findElements(By.xpath("//*[contains(text(), 'Dismiss')]"));
            if (dismissButtons.length > 0) {
                await dismissButtons[0].click();
                await sleep(1000);
            }
        } catch (error) {
            log('No dismiss button found (non-critical)');
        }

        // Try to find and click join button
        const joinButtonSelectors = [
            "//span[contains(text(), 'Join now')]",
            "//span[contains(text(), 'Ask to join')]",
            "//div[@role='button']//span[contains(text(), 'Join now')]",
            "//div[@role='button']//span[contains(text(), 'Ask to join')]",
            "//button[contains(., 'Join now')]",
            "//button[contains(., 'Ask to join')]"
        ];

        let joinButtonFound = false;
        for (const selector of joinButtonSelectors) {
            try {
                log(`Trying join button selector: ${selector}`);
                const elements = await driver.findElements(By.xpath(selector));
                if (elements.length > 0) {
                    // Try JavaScript click first
                    try {
                        await driver.executeScript("arguments[0].click();", elements[0]);
                        joinButtonFound = true;
                        log('Successfully clicked join button using JavaScript');
                        break;
                    } catch (error) {
                        // Try regular click if JavaScript click fails
                        await elements[0].click();
                        joinButtonFound = true;
                        log('Successfully clicked join button using regular click');
                        break;
                    }
                }
            } catch (error) {
                log(`Selector ${selector} failed: ${error.message}`);
            }
        }

        if (!joinButtonFound) {
            log('Taking screenshot of failed join attempt');
            await driver.takeScreenshot().then(
                data => fs.writeFileSync('join_failed.png', data, 'base64')
            );
            throw new Error('Could not find or click join button');
        }

        await sleep(5000);
        log('Successfully joined meeting');

        // Keep session alive
        while (true) {
            await sleep(30000);
            try {
                const currentUrl = await driver.getCurrentUrl();
                log(`Session active at: ${currentUrl}`);
                
                // Take periodic screenshots to verify meeting status
                await driver.takeScreenshot().then(
                    data => fs.writeFileSync('meeting_active.png', data, 'base64')
                );
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

    log(`Starting bot with email: ${GOOGLE_EMAIL}`);
    let retryCount = 0;
    let driver;

    while (retryCount < MAX_RETRIES) {
        try {
            await killChromeProcesses();
            driver = await startBrowser();
            await joinMeet(driver);
            break;
        } catch (error) {
            retryCount++;
            log(`Attempt ${retryCount} failed: ${error.message}`);
            
            if (driver) {
                try {
                    await driver.quit();
                } catch (quitError) {
                    log(`Error while quitting driver: ${quitError.message}`);
                }
            }

            if (retryCount < MAX_RETRIES) {
                log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
                await sleep(RETRY_DELAY);
            } else {
                log('Maximum retry attempts reached. Exiting...');
                process.exit(1);
            }
        }
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    log('Received SIGINT. Cleaning up...');
    try {
        await killChromeProcesses();
    } catch (error) {
        log(`Error during cleanup: ${error.message}`);
    }
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    log('Uncaught exception', error);
    process.exit(1);
});

// Start the bot
main().catch(error => {
    log(`Unhandled error in main: ${error.message}`);
    process.exit(1);
}); 