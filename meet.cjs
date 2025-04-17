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
    
    // Use Windows Chrome path
    const isWindows = process.platform === 'win32';
    const chromePath = isWindows ? 
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 
        '/usr/bin/google-chrome';
    
    options.setChromeBinaryPath(chromePath);
    log(`Using Chrome binary path: ${chromePath}`);

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

        // Save page source for debugging
        const pageSource = await driver.getPageSource();
        fs.writeFileSync('page_source.html', pageSource);
        log('Saved page source');

        // Save screenshot for debugging
        const screenshot = await driver.takeScreenshot();
        fs.writeFileSync('pre-join.png', screenshot, 'base64');
        log('Saved pre-join screenshot');

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

        // Disable camera and microphone using keyboard shortcuts
        const actions = driver.actions({bridge: true});
        await actions.keyDown(Key.CONTROL).sendKeys('e').perform(); // Disable camera
        await sleep(1000);
        await actions.keyDown(Key.CONTROL).sendKeys('d').perform(); // Disable microphone
        await sleep(1000);
        log('Disabled camera and microphone');

        let joined = false;
        const joinButtonSelectors = [
            // Original selectors
            "//span[contains(text(), 'Join now')]",
            "//span[contains(text(), 'Ask to join')]",
            "//button[contains(@aria-label, 'Join now')]",
            "//button[contains(@aria-label, 'Ask to join')]",
            "//div[contains(@role, 'button')]/span[contains(text(), 'Join now')]",
            "//div[contains(@role, 'button')]/span[contains(text(), 'Ask to join')]",
            // New selectors
            "//div[@role='button']//span[text()='Join now']",
            "//div[@role='button']//span[text()='Ask to join']",
            "//button[contains(@data-id, 'join')]",
            "//button[contains(@data-id, 'ask')]",
            "//div[@role='button'][contains(., 'Join')]",
            "//div[@role='button'][contains(., 'Ask')]"
        ];

        for (const selector of joinButtonSelectors) {
            try {
                log(`Trying join button selector: ${selector}`);
                // Try to find the element first
                const elements = await driver.findElements(By.xpath(selector));
                if (elements.length > 0) {
                    log(`Found ${elements.length} elements matching selector: ${selector}`);
                    // Try to get element properties
                    for (let i = 0; i < elements.length; i++) {
                        const element = elements[i];
                        const isDisplayed = await element.isDisplayed();
                        const isEnabled = await element.isEnabled();
                        const text = await element.getText();
                        log(`Element ${i + 1}: displayed=${isDisplayed}, enabled=${isEnabled}, text="${text}"`);
                        
                        if (isDisplayed && isEnabled) {
                            // Take screenshot before clicking
                            const beforeClick = await driver.takeScreenshot();
                            fs.writeFileSync(`join_button_attempt_${i + 1}.png`, beforeClick, 'base64');
                            
                            // Try to click using different methods
                            try {
                                await driver.executeScript("arguments[0].click();", element);
                                joined = true;
                                log(`Successfully clicked element ${i + 1} using JavaScript`);
                            } catch (clickError) {
                                try {
                                    await element.click();
                                    joined = true;
                                    log(`Successfully clicked element ${i + 1} using WebDriver click`);
                                } catch (directClickError) {
                                    log(`Failed to click element ${i + 1}: ${directClickError.message}`);
                                    continue;
                                }
                            }
                            
                            if (joined) {
                                // Save screenshot after clicking
                                const afterClick = await driver.takeScreenshot();
                                fs.writeFileSync('post-join.png', afterClick, 'base64');
                                break;
                            }
                        }
                    }
                } else {
                    log(`No elements found for selector: ${selector}`);
                }
                
                if (joined) break;
            } catch (error) {
                log(`Error with selector ${selector}: ${error.message}`);
                continue;
            }
        }

        if (!joined) {
            log('Failed to find join button with standard selectors, trying JavaScript injection');
            const pageSource = await driver.getPageSource();
            fs.writeFileSync('page_source_before_js.html', pageSource);
            
            const joinSuccess = await driver.executeScript(`
                function findJoinButton() {
                    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
                    console.log('Found buttons:', buttons.length);
                    return buttons.find(button => {
                        const text = (button.textContent || '').toLowerCase();
                        const hasJoinText = text.includes('join now') || text.includes('ask to join');
                        console.log('Button text:', text, 'Has join text:', hasJoinText);
                        return hasJoinText;
                    });
                }
                const joinButton = findJoinButton();
                if (joinButton) {
                    console.log('Found join button:', joinButton);
                    joinButton.click();
                    return true;
                }
                console.log('No join button found');
                return false;
            `);
            
            if (joinSuccess) {
                log('Successfully joined using JavaScript injection');
                joined = true;
            } else {
                const finalPageSource = await driver.getPageSource();
                fs.writeFileSync('page_source_after_js.html', finalPageSource);
                throw new Error('Could not find join button');
            }
        }

        await sleep(5000);
        log('Join attempt completed');

        // Keep session alive and monitor meeting status
        while (true) {
            await sleep(60000);
            try {
                const url = await driver.getCurrentUrl();
                const screenshot = await driver.takeScreenshot();
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                fs.writeFileSync(`status-${timestamp}.png`, screenshot, 'base64');
                log(`Session alive at: ${url}`);
            } catch (error) {
                throw new Error('Lost connection to meeting');
            }
        }
    } catch (error) {
        log('Error in joinMeet', error);
        // Save error screenshot and page source
        try {
            const errorScreenshot = await driver.takeScreenshot();
            fs.writeFileSync('join-failed.png', errorScreenshot, 'base64');
            const errorPageSource = await driver.getPageSource();
            fs.writeFileSync('error_page_source.html', errorPageSource);
            log('Saved error screenshot and page source');
        } catch (screenshotError) {
            log('Failed to save error data', screenshotError);
        }
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