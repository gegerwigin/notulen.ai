const http = require('http');

const data = JSON.stringify({
    url: 'https://meet.google.com/test',
    username: 'test'
});

const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/join',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    res.on('data', (chunk) => {
        console.log('Response:', chunk.toString());
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end(); 