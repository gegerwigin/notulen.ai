import { spawn, exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer-core';

interface Session {
    id: string;
    browser: any;
    page: any;
    status: 'connecting' | 'joined' | 'recording' | 'error' | 'left';
    error?: string;
    startTime: Date;
    meetingUrl: string;
    logs: string[];
}

export class MeetingController {
    private sessions: Map<string, Session> = new Map();

    private async findChromePath(): Promise<string> {
        const paths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
        ];

        for (const path of paths) {
            if (fs.existsSync(path)) {
                return path;
            }
        }
        throw new Error('Chrome not found. Please install Google Chrome.');
    }

    async joinMeeting(meetingUrl: string): Promise<string> {
        const sessionId = uuidv4();
        console.log('Starting new session:', sessionId);

        try {
            const chromePath = await this.findChromePath();
            console.log('Found Chrome at:', chromePath);

            // Create new session
            const session: Session = {
                id: sessionId,
                browser: null,
                page: null,
                status: 'connecting',
                startTime: new Date(),
                meetingUrl,
                logs: []
            };
            this.sessions.set(sessionId, session);

            // Launch browser
            console.log('Launching browser...');
            const browser = await puppeteer.launch({
                headless: false,
                executablePath: chromePath,
                defaultViewport: null,
                args: [
                    '--start-maximized',
                    '--disable-infobars',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                    '--use-fake-ui-for-media-stream',
                    '--use-fake-device-for-media-stream'
                ]
            });
            session.browser = browser;

            // Create new page
            const page = await browser.newPage();
            session.page = page;

            // Set viewport
            await page.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1
            });

            // Set user agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

            // Add error handling
            page.on('error', err => {
                console.error('Page error:', err);
                session.logs.push(`Error: ${err.message}`);
            });

            page.on('console', msg => {
                const text = msg.text();
                console.log(`Browser console (${sessionId}):`, text);
                session.logs.push(text);
            });

            // Navigate to meeting
            console.log('Navigating to meeting:', meetingUrl);
            await page.goto(meetingUrl, { 
                waitUntil: 'networkidle0', 
                timeout: 60000 
            });

            // Wait for and handle any permission dialogs
            await page.evaluate(() => {
                window.onbeforeunload = null;
                return true;
            });

            // Wait for and click dismiss button if present
            try {
                await page.waitForSelector('button[aria-label="Dismiss"]', { timeout: 5000 });
                await page.click('button[aria-label="Dismiss"]');
                console.log('Dismissed initial popup');
            } catch (e) {
                console.log('No dismiss button found, continuing...');
            }

            // Wait for and click "Join as a guest" button using JavaScript click
            try {
                await page.waitForSelector('button[jsname="Qx7uuf"]', { timeout: 10000 });
                await page.evaluate(() => {
                    const button = document.querySelector('button[jsname="Qx7uuf"]');
                    if (button) (button as HTMLElement).click();
                });
                console.log('Clicked "Join as a guest" button');
            } catch (e) {
                console.log('Could not find join as guest button, trying alternative method...');
                try {
                    await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const joinButton = buttons.find(button => 
                            button.textContent?.toLowerCase().includes('join') || 
                            button.textContent?.toLowerCase().includes('gabung')
                        );
                        if (joinButton) (joinButton as HTMLElement).click();
                    });
                } catch (err) {
                    console.log('Failed to find join button through alternative method');
                }
            }

            // Enter guest name
            try {
                await page.waitForSelector('input[jsname="YPqjbf"]', { timeout: 10000 });
                await page.evaluate(() => {
                    const input = document.querySelector('input[jsname="YPqjbf"]');
                    if (input) {
                        (input as HTMLInputElement).value = 'Notula AI Bot';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
                console.log('Entered guest name');
            } catch (e) {
                console.log('Could not find name input, trying alternative method...');
            }

            // Click "Ask to join" button using JavaScript click
            try {
                await page.waitForSelector('button[jsname="QkA63b"]', { timeout: 10000 });
                await page.evaluate(() => {
                    const button = document.querySelector('button[jsname="QkA63b"]');
                    if (button) (button as HTMLElement).click();
                });
                console.log('Clicked "Ask to join" button');
            } catch (e) {
                console.log('Could not find ask to join button, trying alternative method...');
                try {
                    await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const joinButton = buttons.find(button => 
                            button.textContent?.toLowerCase().includes('ask to join') || 
                            button.textContent?.toLowerCase().includes('minta bergabung')
                        );
                        if (joinButton) (joinButton as HTMLElement).click();
                    });
                } catch (err) {
                    console.log('Failed to find ask to join button through alternative method');
                }
            }

            // Update session status
            session.status = 'joined';
            console.log('Successfully requested to join meeting');

            return sessionId;
        } catch (error: any) {
            console.error('Failed to join meeting:', error);
            const session = this.sessions.get(sessionId);
            if (session) {
                session.status = 'error';
                session.error = error.message;
            }
            throw error;
        }
    }

    async getSessionStatus(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        return {
            status: session.status,
            error: session.error,
            logs: session.logs
        };
    }

    async stopSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        try {
            if (session.page) {
                await session.page.close();
            }
            if (session.browser) {
                await session.browser.close();
            }
            session.status = 'left';
            this.sessions.delete(sessionId);
        } catch (error) {
            console.error('Error stopping session:', error);
            throw error;
        }
    }

    getAllSessions() {
        return Array.from(this.sessions.values()).map(session => ({
            id: session.id,
            status: session.status,
            meetingUrl: session.meetingUrl,
            startTime: session.startTime,
            error: session.error
        }));
    }
} 