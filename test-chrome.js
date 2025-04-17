const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log('Starting browser...');
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: '/usr/bin/google-chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1280,720',
                '--hide-scrollbars',
                '--disable-notifications',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream'
            ]
        });

        console.log('Browser launched!');
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // Set up request interception to handle media permissions
        await page.setPermissions('https://meet.google.com', ['camera', 'microphone']);
        
        // Navigate to the meeting
        console.log('Going to meeting...');
        await page.goto('https://meet.google.com/muc-rgak-fxk', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        // Wait for and handle the Google sign-in if needed
        const emailInput = await page.$('input[type="email"]');
        if (emailInput) {
            console.log('Signing in...');
            await emailInput.type('notulaai@gmail.com');
            await emailInput.press('Enter');
            
            // Wait for password field
            await page.waitForSelector('input[type="password"]', { timeout: 5000 });
            await page.type('input[type="password"]', 'notulaai123');
            await page.keyboard.press('Enter');
            
            // Wait for redirect
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
        }

        // Wait for the meeting UI to load
        await page.waitForTimeout(5000);

        // Handle camera and microphone
        const mediaButtons = await page.$$('button');
        for (const button of mediaButtons) {
            const label = await button.evaluate(el => el.getAttribute('aria-label') || '');
            if (label.includes('camera') || label.includes('microphone')) {
                await button.click();
                await page.waitForTimeout(1000);
            }
        }

        // Find and click the join button
        const joinSelectors = [
            'button[jsname="Qx7uuf"]',
            'button[jsname="A5il2e"]',
            '[aria-label="Join now"]',
            '[aria-label="Ask to join"]'
        ];

        let joined = false;
        for (const selector of joinSelectors) {
            try {
                const button = await page.waitForSelector(selector, { timeout: 3000 });
                if (button) {
                    await button.click();
                    console.log(`Joined using selector: ${selector}`);
                    joined = true;
                    break;
                }
            } catch (e) {
                console.log(`No join button found for selector: ${selector}`);
            }
        }

        if (!joined) {
            throw new Error('Could not find any join button');
        }

        console.log('Successfully joined the meeting');
        
        // Keep the connection alive
        await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000));

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})(); 