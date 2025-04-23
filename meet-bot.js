const puppeteer = require('puppeteer');

class GoogleMeetBot {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        try {
            console.log('Menginisialisasi bot...');
            this.browser = await puppeteer.connect({
                browserWSEndpoint: 'ws://chrome-headless:3000',
                defaultViewport: {
                    width: 1280,
                    height: 720
                }
            });

            this.page = await this.browser.newPage();
            await this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');
            
            console.log('Browser berhasil diinisialisasi');
            console.log('Halaman berhasil dibuat');
            console.log('Bot berhasil diinisialisasi');
            console.log('Bot siap menerima perintah');
            return true;
        } catch (error) {
            console.error('Gagal menginisialisasi bot:', error);
            throw error;
        }
    }

    async delay(ms) {
        console.log(`Menunggu ${ms}ms...`);
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async joinMeeting(meetingUrl) {
        try {
            console.log(`Bersiap bergabung meeting: ${meetingUrl}`);

            console.log(`Menuju URL meeting: ${meetingUrl}`);
            await this.page.goto(meetingUrl, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            console.log('Halaman meeting berhasil dimuat');

            await this.delay(5000);

            const title = await this.page.title();
            console.log('Judul halaman:', title);

            const joinButtons = [
                'button[jsname="Qx7uuf"]',
                '[aria-label="Join now"]',
                '[aria-label="Ask to join"]',
                '[data-mdc-dialog-action="join"]'
            ];

            let joined = false;
            for (const selector of joinButtons) {
                try {
                    console.log(`Mencari tombol: ${selector}`);
                    const button = await this.page.waitForSelector(selector, { timeout: 5000 });
                    if (button) {
                        console.log(`Menemukan tombol: ${selector}, mengklik...`);
                        await button.click();
                        console.log(`Berhasil klik tombol: ${selector}`);
                        joined = true;
                        break;
                    }
                } catch (e) {
                    console.log(`Tidak menemukan tombol ${selector}`);
                }
            }

            if (!joined) {
                throw new Error('Tidak dapat menemukan tombol join');
            }

            console.log('Berhasil bergabung meeting');
            return true;
        } catch (error) {
            console.error('Gagal bergabung meeting:', error);
            return false;
        }
    }

    async leaveMeeting() {
        try {
            if (this.page) {
                await this.page.close();
                console.log('Halaman ditutup');
            }
            console.log('Keluar dari meeting');
            return true;
        } catch (error) {
            console.error('Error saat keluar meeting:', error);
            return false;
        }
    }
}

module.exports = { GoogleMeetBot }; 