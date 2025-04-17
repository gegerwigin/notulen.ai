const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Fungsi untuk mendeteksi provider meeting
function detectProvider(link) {
    if (link.includes('meet.google.com')) {
        return 'google-meet';
    } else if (link.includes('zoom.us')) {
        return 'zoom';
    } else if (link.includes('teams.microsoft.com')) {
        return 'teams';
    }
    return null;
}

// Implementasi untuk Google Meet
async function joinGoogleMeet(browser, link) {
    try {
        const page = await browser.newPage();
        
        // Konfigurasi permissions untuk kamera dan mikrofon
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'mediaDevices', {
                value: {
                    getUserMedia: async () => null,
                },
            });
        });

        // Buka link Google Meet
        await page.goto(link, { waitUntil: 'networkidle0' });
        
        // Tunggu sampai tombol join muncul dan klik
        await page.waitForSelector('button[jsname="Qx7uuf"]');
        await page.click('button[jsname="Qx7uuf"]');
        
        console.log('Successfully joined Google Meet');
        return true;
    } catch (error) {
        console.error('Error joining Google Meet:', error);
        throw error;
    }
}

// Endpoint untuk menerima link meeting
app.post('/dashboard/meeting-bot', async (req, res) => {
    const { link } = req.body;
    try {
        const provider = detectProvider(link);
        if (!provider) {
            throw new Error('Unsupported meeting provider');
        }
        
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: '/usr/bin/google-chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });
        
        if (provider === 'google-meet') {
            await joinGoogleMeet(browser, link);
        }
        
        res.status(200).json({
            success: true,
            message: `Bot is joining the ${provider} meeting`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Bot server running at http://localhost:${port}`);
}); 