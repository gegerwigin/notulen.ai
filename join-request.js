const http = require('http');

const data = JSON.stringify({
    meetingUrl: 'https://meet.google.com/kzy-xevz-idz' // URL Google Meet yang valid
});

const options = {
    hostname: '18.141.229.165',
    port: 3002,
    path: '/join-meeting',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('Mengirim permintaan untuk bergabung dengan meeting...');

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    res.on('data', (chunk) => {
        console.log(`Response: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`Problem dengan request: ${e.message}`);
});

req.write(data);
req.end(); 