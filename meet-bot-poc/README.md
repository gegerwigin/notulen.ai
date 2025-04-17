# Google Meet Bot - Proof of Concept

This is a proof of concept for Notulen.ai to demonstrate how to programmatically join Google Meet meetings using browser automation.

## Prerequisites

- Node.js (v14 or higher)
- npm
- A Google account with access to Google Meet

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   The `.env` file should already be set up with your Google OAuth credentials.

## Usage

There are two ways to use this proof of concept:

### Option 1: Using the Web Interface

1. Start the Express server:
   ```
   node server.js
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Click the "Authenticate with Google" button and follow the prompts to authorize the application.

4. After authentication, you'll be redirected back to the application where you can enter a Google Meet link to join.

### Option 2: Using the Command Line

1. First, authenticate with Google:
   ```
   node meet-bot.js
   ```
   This will provide a URL to visit for authentication.

2. After visiting the URL and authenticating, you'll be redirected to a page with a code parameter in the URL.

3. Run the script with the code:
   ```
   node meet-bot.js --code=YOUR_CODE_HERE
   ```

4. Once authenticated, you can join meetings by providing a meeting link:
   ```
   node meet-bot.js https://meet.google.com/xxx-xxxx-xxx
   ```

## Features

- OAuth authentication with Google
- Automated browser control using Puppeteer
- Joining Google Meet meetings programmatically
- Disabling camera and microphone before joining
- Simulated audio recording (placeholder for actual implementation)

## Next Steps

After verifying that this proof of concept works, the next steps would be:

1. Implement actual WebRTC audio capture
2. Connect the captured audio to a transcription service
3. Integrate with the main Notulen.ai application
4. Set up proper error handling and recovery mechanisms
5. Create a more robust authentication system

## Notes

- This is a proof of concept and not intended for production use
- The browser automation may break if Google Meet's UI changes
- For production, consider using a headless browser or a more efficient approach
