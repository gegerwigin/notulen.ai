const axios = require('axios');

async function checkServerStatus() {
  try {
    console.log('Memeriksa status server bot...');
    const response = await axios.get('http://localhost:3002/health');
    console.log('Status server:', response.data);
    
    // Coba akses chrome-headless langsung
    try {
      console.log('\nMemeriksa akses ke chrome-headless...');
      await axios.get('http://localhost:3001/json/version');
      console.log('Chrome-headless dapat diakses!');
    } catch (chromeError) {
      console.error('Chrome-headless tidak dapat diakses:');
      if (chromeError.response) {
        console.error(`  Status: ${chromeError.response.status}`);
        console.error(`  Data: ${JSON.stringify(chromeError.response.data)}`);
      } else {
        console.error(`  Error: ${chromeError.message}`);
        console.error('  Apakah container chrome-headless berjalan?');
      }
    }
    
  } catch (error) {
    console.error('Server bot tidak dapat diakses:');
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`  Error: ${error.message}`);
      console.error('  Apakah server bot berjalan?');
    }
  }
}

checkServerStatus(); 