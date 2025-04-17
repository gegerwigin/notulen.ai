const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// DeepSeek API endpoint and API key
const DEEPSEEK_API_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-7a8bfee089614e24b06855479acddb5d";

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({error: 'Method Not Allowed'});
    return;
  }

  try {
    // Get request body from frontend
    const requestBody = req.body;
    
    console.log('Received request body:', JSON.stringify(requestBody).substring(0, 500) + '...');
    
    // Validate request body
    if (!requestBody.model || !requestBody.messages) {
      res.status(400).json({error: 'Invalid request body'});
      return;
    }

    console.log('Sending request to DeepSeek API...');
    
    // If local development mode is enabled, return a mock response
    if (process.env.VITE_USE_LOCAL_DEEPSEEK === 'true') {
      console.log('Using local development mode, returning mock response');
      return res.json({
        choices: [{
          message: {
            content: JSON.stringify({
              meetingInfo: {
                title: "Mock Meeting Summary",
                date: new Date().toISOString(),
                duration: "1 hour",
                location: "Online"
              },
              summary: "This is a mock meeting summary for development purposes.",
              topics: [
                {
                  title: "Topic 1",
                  points: ["Point 1", "Point 2"]
                }
              ],
              actionItems: [
                {
                  task: "Mock task 1",
                  assignee: "Team member",
                  deadline: "Next week",
                  status: "Pending"
                }
              ],
              participants: [
                {
                  name: "Mock Participant",
                  role: "Developer",
                  contribution: "Presented mock data"
                }
              ]
            })
          }
        }]
      });
    }
    
    // Send request to DeepSeek API
    const deepseekResponse = await fetch(DEEPSEEK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('DeepSeek API response status:', deepseekResponse.status);
    
    // Get response from DeepSeek API
    const responseData = await deepseekResponse.json();
    
    if (!deepseekResponse.ok) {
      console.error('DeepSeek API error:', responseData);
      return res.status(deepseekResponse.status).json({
        error: 'DeepSeek API Error',
        message: responseData.error?.message || 'Unknown error'
      });
    }
    
    console.log('DeepSeek API response:', JSON.stringify(responseData).substring(0, 500) + '...');

    // Send response to frontend
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error in DeepSeek Chat API proxy", error);
    
    // Send error to frontend
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
