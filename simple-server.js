const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Middleware untuk logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use(bodyParser.json());

// Basic routes
app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.post('/join-meeting', (req, res) => {
    const { meetingUrl } = req.body;
    
    if (!meetingUrl) {
        return res.status(400).json({
            success: false,
            message: 'meetingUrl is required'
        });
    }

    console.log('Received join meeting request:', { meetingUrl });

    // Simulate joining meeting
    setTimeout(() => {
        console.log('Successfully joined meeting:', { meetingUrl });
        res.json({
            success: true,
            message: 'Successfully joined meeting',
            meetingId: '123456789'
        });
    }, 1000);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

const port = 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
}); 