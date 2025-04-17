/**
 * Puppeteer Browser Wrapper
 * 
 * Modul ini menyediakan wrapper untuk Puppeteer yang bekerja di lingkungan browser.
 * Ini membantu mengatasi masalah dengan modul Node.js yang digunakan oleh Puppeteer.
 */

import { LaunchOptions } from 'puppeteer-core';

// Flag untuk menandai apakah puppeteer tersedia
let isPuppeteerAvailable: boolean | null = null;

// Gunakan dynamic import untuk Puppeteer Core
export async function getPuppeteer() {
  // Jika sudah pernah dicek dan tidak tersedia, langsung throw error
  if (isPuppeteerAvailable === false) {
    throw new Error('Puppeteer is not available in this environment');
  }

  try {
    // Gunakan dynamic import untuk menghindari masalah dengan bundling
    const puppeteer = await import('puppeteer-core');
    isPuppeteerAvailable = true;
    return puppeteer.default;
  } catch (error) {
    console.error('Error importing puppeteer-core:', error);
    isPuppeteerAvailable = false;
    throw new Error('Failed to import puppeteer-core. This might be due to browser compatibility issues.');
  }
}

// Fungsi untuk mengecek apakah puppeteer tersedia tanpa throw error
export async function isPuppeteerSupported(): Promise<boolean> {
  if (isPuppeteerAvailable !== null) {
    return isPuppeteerAvailable;
  }
  
  try {
    await getPuppeteer();
    return true;
  } catch (error) {
    return false;
  }
}

// Fungsi untuk mengecek apakah kode berjalan di browser atau di Node.js
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Fungsi untuk mendapatkan path Chrome yang sesuai dengan platform
export function getChromePath(): string {
  if (isBrowser()) {
    // Di browser, kita tidak bisa mengakses filesystem langsung
    // Ini hanya placeholder, karena di browser kita tidak akan menjalankan browser lain
    return '';
  }
  
  // Di Node.js, kita bisa mendeteksi OS dan memberikan path yang sesuai
  const isWindows = typeof process !== 'undefined' && process.platform === 'win32';
  
  if (isWindows) {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else {
    // Path untuk Linux/Mac
    return '/usr/bin/google-chrome';
  }
}

/**
 * Get browser launch options for Puppeteer
 * @param headless Whether to run in headless mode
 * @returns Browser launch options
 */
export function getBrowserLaunchOptions(headless: boolean = false): LaunchOptions {
  const defaultOptions: LaunchOptions = {
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
