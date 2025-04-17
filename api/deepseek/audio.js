const fetch = require('node-fetch');

// DeepSeek API endpoint dan API key
const DEEPSEEK_AUDIO_ENDPOINT = "https://api.deepseek.com/v1/audio/transcriptions";
const DEEPSEEK_API_KEY = "sk-7a8bfee089614e24b06855479acddb5d";

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

  // Hanya terima request POST
  if (req.method !== 'POST') {
    res.status(405).json({error: 'Method Not Allowed'});
    return;
  }

  try {
    // Ambil body request dari frontend
    const requestBody = req.body;
    
    console.log('Received audio request, model:', requestBody.model, 'language:', requestBody.language);
    console.log('Audio file size (base64):', requestBody.file ? requestBody.file.length : 'No file');
    
    // Pastikan model dan file ada
    if (!requestBody.model || !requestBody.file) {
      res.status(400).json({error: 'Invalid request body'});
      return;
    }

    console.log('Sending request to DeepSeek Audio API...');
    
    // Kirim request ke DeepSeek Audio API
    const deepseekResponse = await fetch(DEEPSEEK_AUDIO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('DeepSeek Audio API response status:', deepseekResponse.status);
    
    // Ambil response dari DeepSeek API
    const responseData = await deepseekResponse.json();
    
    console.log('DeepSeek Audio API response:', 
                responseData.text ? `Text: ${responseData.text.substring(0, 100)}...` : 'No text',
                responseData.error ? `Error: ${JSON.stringify(responseData.error)}` : 'No error');

    // Kirim response ke frontend
    res.status(deepseekResponse.status).json(responseData);
  } catch (error) {
    console.error("Error in DeepSeek Audio API proxy", error);
    
    // Kirim error ke frontend
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack
    });
  }
};
