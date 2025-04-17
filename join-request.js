const http = require('http');

const data = JSON.stringify({
    meetingUrl: 'https://meet.google.com/coh-kyoz-oga',
    platform: 'google-meet',
    options: {
        enableCamera: false,
        enableMicrophone: false,
        displayName: 'Notulen Bot'
    }
});

console.log('Preparing to connect to:', '18.141.229.165:3000');
console.log('Request data:', data);

const options = {
    hostname: '18.141.229.165',
    port: 3000,
    path: '/api/join-meeting',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer notulen-ai-bot-key-2024'
    },
    timeout: 30000 // Menambah timeout karena perlu waktu untuk inisialisasi browser
};

console.log('Sending request with options:', JSON.stringify(options, null, 2));

const req = http.request(options, (res) => {
    console.log('Connection established');
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Response headers:', JSON.stringify(res.headers, null, 2));
    
    let responseData = '';
    
    res.on('data', (chunk) => {
        responseData += chunk;
        console.log('Received chunk of data');
    });

    res.on('end', () => {
        console.log('Response complete:', responseData);
    });
});

req.on('error', (error) => {
    console.error('Detailed error information:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.code === 'ECONNREFUSED') {
        console.error('Server tidak merespons di port ini. Kemungkinan service belum jalan atau port salah.');
    }
});

req.on('timeout', () => {
    console.error('Request timed out after 10 seconds');
    req.destroy();
});

req.write(data);
req.end();

console.log('Request sent, waiting for response...'); 