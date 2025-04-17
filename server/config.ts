export const config = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    lightsail: {
      instanceName: process.env.LIGHTSAIL_INSTANCE || 'meeting-bot',
      keyPairName: process.env.LIGHTSAIL_KEY_PAIR || 'meeting-bot-key'
    }
  },
  security: {
    apiKey: process.env.API_KEY || 'your-api-key-here'
  },
  puppeteer: {
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ]
  }
}; 