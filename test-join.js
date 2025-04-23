const axios = require('axios');
const fs = require('fs');

async function testJoinMeeting() {
  try {
    console.log('Membaca file request.json...');
    const rawData = fs.readFileSync('./request.json', 'utf8');
    const jsonData = JSON.parse(rawData);
    
    console.log('Data request yang akan dikirim:', jsonData);
    
    console.log('Mengirim request ke server...');
    const response = await axios.post('http://localhost:3002/join', jsonData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status response:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.error('Error dalam request:');
    if (error.response) {
      // Response diterima tapi status code di luar range 2xx
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      // Request dibuat tapi tidak ada response (e.g., server down)
      console.error('Tidak ada response dari server. Cek koneksi atau status server.');
    } else {
      // Error saat setup request
      console.error('Error:', error.message);
    }
  }
}

testJoinMeeting(); 