const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Parse JSON bodies
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware yang sangat permisif
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://notula.ai',
    'https://www.notula.ai',
    'https://sekreai.web.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// DeepSeek Chat API endpoint
app.post('/api/deepseek/chat', async (req, res) => {
  try {
    console.log('Received request to DeepSeek Chat API proxy');
    
    const deepseekApiKey = req.headers.authorization?.split(' ')[1];
    if (!deepseekApiKey) {
      return res.status(401).json({ error: 'DeepSeek API key is required' });
    }
    
    // Menggunakan https module untuk request ke DeepSeek Chat API
    const data = JSON.stringify(req.body);
    
    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${deepseekApiKey}`
      }
    };
    
    const proxyRequest = https.request(options, (proxyRes) => {
      let responseData = '';
      
      proxyRes.on('data', (chunk) => {
        responseData += chunk;
      });
      
      proxyRes.on('end', () => {
        console.log('DeepSeek Chat API response received');
        try {
          const jsonData = JSON.parse(responseData);
          res.status(proxyRes.statusCode).json(jsonData);
        } catch (error) {
          console.error('Error parsing JSON response:', error);
          res.status(500).json({ error: 'Failed to parse response from DeepSeek API' });
        }
      });
    });
    
    proxyRequest.on('error', (error) => {
      console.error('Error in DeepSeek Chat request:', error);
      res.status(500).json({ error: 'Failed to proxy request to DeepSeek API' });
    });
    
    proxyRequest.write(data);
    proxyRequest.end();
    
  } catch (error) {
    console.error('Error proxying to DeepSeek Chat API:', error);
    return res.status(500).json({ error: 'Failed to proxy request to DeepSeek Chat API' });
  }
});

// DeepSeek Audio Transcription API endpoint
app.post('/api/deepseek/audio', async (req, res) => {
  try {
    console.log('Received request to DeepSeek Audio API proxy');
    
    const deepseekApiKey = req.headers.authorization?.split(' ')[1];
    if (!deepseekApiKey) {
      return res.status(401).json({ error: 'DeepSeek API key is required' });
    }
    
    // Menggunakan https module untuk request ke DeepSeek Audio API
    const data = JSON.stringify(req.body);
    
    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${deepseekApiKey}`
      }
    };
    
    const proxyRequest = https.request(options, (proxyRes) => {
      let responseData = '';
      
      proxyRes.on('data', (chunk) => {
        responseData += chunk;
      });
      
      proxyRes.on('end', () => {
        console.log('DeepSeek Audio API response received');
        try {
          const jsonData = JSON.parse(responseData);
          res.status(proxyRes.statusCode).json(jsonData);
        } catch (error) {
          console.error('Error parsing JSON response:', error);
          res.status(500).json({ error: 'Failed to parse response from DeepSeek API' });
        }
      });
    });
    
    proxyRequest.on('error', (error) => {
      console.error('Error in DeepSeek Audio request:', error);
      res.status(500).json({ error: 'Failed to proxy request to DeepSeek API' });
    });
    
    proxyRequest.write(data);
    proxyRequest.end();
    
  } catch (error) {
    console.error('Error proxying to DeepSeek Audio API:', error);
    return res.status(500).json({ error: 'Failed to proxy request to DeepSeek Audio API' });
  }
});

// Whisper API endpoint
app.post('/api/whisper', async (req, res) => {
  try {
    console.log('Received request to Whisper API proxy');
    
    const openaiApiKey = req.headers.authorization?.split(' ')[1];
    if (!openaiApiKey) {
      return res.status(401).json({ error: 'OpenAI API key is required' });
    }
    
    // Untuk Whisper API, kita perlu menggunakan FormData
    // Karena ini kompleks untuk diimplementasikan di server proxy sederhana,
    // kita akan mengembalikan respons fallback untuk sementara
    
    console.log('Returning fallback response for Whisper API');
    return res.status(200).json({ 
      text: "Transcription via proxy server. Please use browser-based transcription for now."
    });
  } catch (error) {
    console.error('Error proxying to Whisper API:', error);
    return res.status(500).json({ error: 'Failed to proxy request to Whisper API' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Proxy server is running' });
});

// Start the server
app.listen(port, () => {
  console.log(`Proxy server listening at http://localhost:${port}`);
});
