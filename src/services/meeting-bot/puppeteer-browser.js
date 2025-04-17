"use strict";
/**
 * Puppeteer Browser Wrapper
 *
 * Modul ini menyediakan wrapper untuk Puppeteer yang bekerja di lingkungan browser.
 * Ini membantu mengatasi masalah dengan modul Node.js yang digunakan oleh Puppeteer.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPuppeteer = getPuppeteer;
exports.isPuppeteerSupported = isPuppeteerSupported;
exports.isBrowser = isBrowser;
exports.getChromePath = getChromePath;
exports.getBrowserLaunchOptions = getBrowserLaunchOptions;
// Flag untuk menandai apakah puppeteer tersedia
let isPuppeteerAvailable = null;
// Gunakan dynamic import untuk Puppeteer Core
async function getPuppeteer() {
    // Jika sudah pernah dicek dan tidak tersedia, langsung throw error
    if (isPuppeteerAvailable === false) {
        throw new Error('Puppeteer is not available in this environment');
    }
    try {
        // Gunakan dynamic import untuk menghindari masalah dengan bundling
        const puppeteer = await Promise.resolve().then(() => __importStar(require('puppeteer-core')));
        isPuppeteerAvailable = true;
        return puppeteer.default;
    }
    catch (error) {
        console.error('Error importing puppeteer-core:', error);
        isPuppeteerAvailable = false;
        throw new Error('Failed to import puppeteer-core. This might be due to browser compatibility issues.');
    }
}
// Fungsi untuk mengecek apakah puppeteer tersedia tanpa throw error
async function isPuppeteerSupported() {
    if (isPuppeteerAvailable !== null) {
        return isPuppeteerAvailable;
    }
    try {
        await getPuppeteer();
        return true;
    }
    catch (error) {
        return false;
    }
}
// Fungsi untuk mengecek apakah kode berjalan di browser atau di Node.js
function isBrowser() {
    return typeof window !== 'undefined';
}
// Fungsi untuk mendapatkan path Chrome yang sesuai dengan platform
function getChromePath() {
    if (isBrowser()) {
        // Di browser, kita tidak bisa mengakses filesystem langsung
        // Ini hanya placeholder, karena di browser kita tidak akan menjalankan browser lain
        return '';
    }
    // Di Node.js, kita bisa mendeteksi OS dan memberikan path yang sesuai
    const isWindows = typeof process !== 'undefined' && process.platform === 'win32';
    if (isWindows) {
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    }
    else {
        // Path untuk Linux/Mac
        return '/usr/bin/google-chrome';
    }
}
/**
 * Get browser launch options for Puppeteer
 * @param headless Whether to run in headless mode
 * @returns Browser launch options
 */
function getBrowserLaunchOptions(headless = false) {
    const defaultOptions = {
        headless: headless,
        args: [
            '--use-fake-ui-for-media-stream',
            '--disable-audio-output',
            '--disable-features=site-per-process',
            '--disable-web-security',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--incognito',
            '--user-data-dir=./bot-profile',
            '--disable-extensions',
            '--disable-default-apps',
            '--no-default-browser-check',
            '--mute-audio'
        ],
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation']
    };
    // Tambahkan executablePath jika tidak di browser
    if (!isBrowser()) {
        return {
            ...defaultOptions,
            executablePath: getChromePath()
        };
    }
    return defaultOptions;
}
