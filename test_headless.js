const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting headless test');
  
  try {
    // Launch browser in headless mode
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    console.log('Browser launched');
    
    // Create new page
    const page = await browser.newPage();
    console.log('Page created');
    
    // Navigate to Google
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Google homepage loaded');
    
    // Take screenshot
    await page.screenshot({ path: 'headless-test.png' });
    console.log('Screenshot taken');
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Close browser
    await browser.close();
    console.log('Browser closed');
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error during test:', error);
  }
})(); 