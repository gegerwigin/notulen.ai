const express = require('express');
const app = express();
const port = 3003;

// Middleware untuk parsing JSON
app.use(express.json());

// Log semua request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers));
  if (req.body) {
    console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// Endpoint /join
app.post('/join', (req, res) => {
  console.log('Received POST request to /join');
  
  // Log the raw request body
  console.log('Request body:', req.body);
  
  const { url, username } = req.body;

  // Validate inputs
  if (!url || !username) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      received: req.body 
    });
  }

  // Success response
  return res.status(200).json({ 
    success: true,
    message: 'Test successful!',
    url,
    username
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running at http://0.0.0.0:${port}`);
}); 