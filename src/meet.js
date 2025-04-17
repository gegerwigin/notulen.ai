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
const USER_DATA_DIR = path.join(__dirname, 'chrome-user-data-' + Date.now()); // Make unique for each session
const LOG_FILE = 'meet.log';
const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL || '';
const GOOGLE_PASSWORD = process.env.GOOGLE_PASSWORD || '';

// Global driver reference
let driver = null;

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
            await execAsync('taskkill /F /IM chromedriver.exe /T');
        } else {
            await execAsync('pkill -f chrome');
            await execAsync('pkill -f chromedriver');
        }
        log('Killed existing Chrome processes');
        await sleep(2000); // Wait for processes to fully terminate
    } catch (error) {
        log('No Chrome processes to kill');
    }
}

async function startBrowser() {
    try {
        log('Starting browser initialization...');
        
        // Create user data directory if it doesn't exist
        if (!fs.existsSync(USER_DATA_DIR)) {
            fs.mkdirSync(USER_DATA_DIR, { recursive: true });
            log('Created user data directory');
        }

        // Configure Chrome options
        const options = new Options();
        
        // Server-specific arguments
        const args = [
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--window-size=1920,1080',
            '--disable-extensions',
            '--disable-popup-blocking',
            '--start-maximized',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--disable-software-rasterizer',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu-compositing',
            '--use-gl=swiftshader',
            '--disable-gl-drawing-for-tests',
            `--user-data-dir=${USER_DATA_DIR}`
        ];

        if (process.platform === 'linux') {
            args.push(
                '--disable-setuid-sandbox',
                '--single-process',
                '--no-first-run'
            );
        }

        options.addArguments(...args);
        
        // Set binary path for Linux
        if (process.platform === 'linux') {
            options.setBinaryPath('/usr/bin/google-chrome-stable');
        }

        log('Chrome options configured');

        // Create WebDriver
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        // Wait for browser to be fully initialized
        await driver.manage().setTimeouts({ implicit: 10000 });
        await driver.manage().window().maximize();
        
        log('Browser started successfully');
        return driver;
    } catch (error) {
        log('Error in startBrowser:', error);
        if (driver) {
            try {
                await driver.quit();
            } catch (quitError) {
                log('Error while quitting driver:', quitError);
            }
        }
        throw error;
    }
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

const joinButtonSelectors = [
    { 
        selector: "//span[contains(text(), 'Ask to join')]/ancestor::button",
        isXPath: true,
        description: "Ask to join button (XPath)"
    },
    {
        selector: "//span[contains(text(), 'Join now')]/ancestor::button",
        isXPath: true,
        description: "Join now button (XPath)"
    },
    {
        selector: '[aria-label*="Join now"]',
        isXPath: false,
        description: "Join now button (aria-label)"
    },
    {
        selector: '[aria-label*="Ask to join"]',
        isXPath: false,
        description: "Ask to join button (aria-label)"
    }
];

async function waitForMeetingLoad(driver) {
    try {
        log('Waiting for page load...');
        await driver.wait(async () => {
            const readyState = await driver.executeScript('return document.readyState');
            return readyState === 'complete';
        }, 30000, 'Page did not finish loading');

        // Wait for any of the known meeting UI elements
        const uiSelectors = [
            '[data-meeting-title]',
            '[data-premeeting-ui]',
            '.VfPpkd-Bz112c-LgbsSe.yHy1rc.eT1oJ.tWDL4c.Cs0vCd',  // Common Meet button class
            '[aria-label*="join"]',
            '[aria-label*="Join"]'
        ];

        log('Waiting for meeting UI elements...');
        for (const selector of uiSelectors) {
            try {
                await driver.wait(until.elementLocated(By.css(selector)), 5000);
                log(`Found UI element: ${selector}`);
                return true;
            } catch (error) {
                log(`Selector ${selector} not found, trying next...`);
            }
        }

        // Take a screenshot for debugging
        await driver.takeScreenshot().then(
            data => fs.writeFileSync('meeting_load_state.png', data, 'base64')
        );

        throw new Error('No meeting UI elements found');
    } catch (error) {
        log('Error while waiting for meeting load:', error);
        await driver.takeScreenshot().then(
            data => fs.writeFileSync('meeting_load_error.png', data, 'base64')
        );
        return false;
    }
}

async function findJoinButton(driver) {
    for (let attempt = 1; attempt <= 5; attempt++) {
        log(`Attempt ${attempt} to find join button...`);
        
        // First check if we need to handle any permission dialogs
        try {
            const permissionDialogs = await driver.findElements(By.css('[aria-label*="Allow"]'));
            for (const dialog of permissionDialogs) {
                if (await dialog.isDisplayed()) {
                    await dialog.click();
                    log('Handled permission dialog');
                    await sleep(1000);
                }
            }
        } catch (error) {
            log('No permission dialogs found');
        }

        for (const selector of joinButtonSelectors) {
            try {
                const elements = selector.isXPath
                    ? await driver.findElements(By.xpath(selector.selector))
                    : await driver.findElements(By.css(selector.selector));

                for (const element of elements) {
                    // Check if the button is displayed and enabled
                    const isDisplayed = await element.isDisplayed();
                    const isEnabled = await element.isEnabled();
                    
                    if (isDisplayed && isEnabled) {
                        // Get button text for logging
                        const text = await element.getText();
                        log(`Found join button: "${text}" using selector: ${selector.description}`);
                        return element;
                    }
                }
            } catch (error) {
                log(`Failed with selector ${selector.description}: ${error.message}`);
            }
        }

        // Take a screenshot after each failed attempt
        await driver.takeScreenshot().then(
            data => fs.writeFileSync(`join_button_attempt_${attempt}.png`, data, 'base64')
        );

        if (attempt < 5) {
            log('Waiting before next attempt...');
            await sleep(3000);
        }
    }

    throw new Error('Failed to find join button after all attempts');
}

async function joinMeet(driver) {
    try {
        log('Navigating to meeting URL:', MEET_LINK);
        await driver.get(MEET_LINK);
        await sleep(5000);

        const currentUrl = await driver.getCurrentUrl();
        if (currentUrl.includes('accounts.google.com')) {
            log('Login page detected, attempting to login...');
            await login(driver);
            await sleep(3000);
            await driver.get(MEET_LINK);
            await sleep(5000);
        }

        log('Waiting for meeting page to load...');
        const isLoaded = await waitForMeetingLoad(driver);
        if (!isLoaded) {
            throw new Error('Meeting page failed to load properly');
        }

        // Ensure camera and microphone are disabled
        log('Setting up media preferences...');
        await driver.executeScript(`
            // Override getUserMedia
            navigator.mediaDevices.getUserMedia = async () => {
                const stream = new MediaStream();
                Object.defineProperty(stream, 'active', { get: () => true });
                return stream;
            };
            
            // Override enumerateDevices
            navigator.mediaDevices.enumerateDevices = async () => [];

            // Disable WebRTC if possible
            if (window.RTCPeerConnection) {
                window.RTCPeerConnection = function() {
                    return {
                        close: () => {},
                        addTrack: () => {},
                        createOffer: async () => {},
                        setLocalDescription: async () => {},
                        setRemoteDescription: async () => {}
                    };
                };
            }
        `);

        log('Looking for join button...');
        const joinButton = await findJoinButton(driver);
        
        log('Clicking join button...');
        await driver.executeScript("arguments[0].click();", joinButton);
        
        // Wait for confirmation that we've joined
        await sleep(5000);
        const meetingUrl = await driver.getCurrentUrl();
        if (!meetingUrl.includes('meet.google.com')) {
            throw new Error('Failed to join meeting - redirected away from Meet');
        }

        log('Successfully joined the meeting');
        return true;
    } catch (error) {
        log('Error in joinMeet:', error);
        await driver.takeScreenshot().then(
            data => fs.writeFileSync('join_meet_error.png', data, 'base64')
        );
        throw error;
    }
}

async function main() {
    // Validate meeting URL
    if (!MEET_LINK || !MEET_LINK.match(/^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i)) {
        log('Error: Invalid meeting URL format. Expected format: https://meet.google.com/xxx-xxxx-xxx');
        process.exit(1);
    }

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
        try {
            // Kill any existing Chrome processes
            await killChromeProcesses();
            log('Starting browser...');

            // Initialize driver
            driver = await startBrowser();
            log('Browser initialized successfully');

            // Join the meeting
            await joinMeet(driver);
            break;
        } catch (error) {
            retries++;
            log(`Attempt ${retries}/${maxRetries} failed: ${error.message}`);

            if (driver) {
                try {
                    await driver.quit();
                } catch (quitError) {
                    log('Error while quitting driver:', quitError);
                }
            }

            if (retries < maxRetries) {
                const waitTime = 5000 * retries;
                log(`Retrying in ${waitTime/1000} seconds...`);
                await sleep(waitTime);
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

main().catch(error => {
    log('Fatal error:', error);
    process.exit(1);
}); 