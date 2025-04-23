const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());

// Menyimpan proses bot yang aktif
const activeBots = new Map();

// Buat direktori log jika belum ada
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

app.post('/join-meeting', (req, res) => {
  const { meetingUrl } = req.body;
  
  if (!meetingUrl) {
    return res.status(400).json({ success: false, message: 'URL meeting diperlukan' });
  }
  
  console.log(`[${new Date().toISOString()}] Request join meeting: ${meetingUrl}`);
  
  // Generate ID unik untuk bot ini
  const botId = Date.now().toString();
  const logFile = path.join(logDir, `bot-${botId}.log`);
  
  // Buka file log
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  try {
    // Jalankan bot dengan xvfb
    const botProcess = spawn('xvfb-run', [
      '--server-args=-screen 0 1280x720x24',
      'node',
      'meet-bot-simple.js',
      meetingUrl
    ]);
    
    activeBots.set(botId, { process: botProcess, url: meetingUrl, startTime: new Date() });
    
    // Log output
    botProcess.stdout.pipe(logStream);
    botProcess.stderr.pipe(logStream);
    
    botProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      console.log(`[${botId}] ${message}`);
    });
    
    botProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      console.error(`[${botId}] ERROR: ${message}`);
    });
    
    botProcess.on('exit', (code) => {
      console.log(`[${botId}] Bot keluar dengan kode: ${code}`);
      
      // Tutup log file
      logStream.end();
      
      // Hapus dari daftar aktif
      activeBots.delete(botId);
    });
    
    res.json({ 
      success: true, 
      message: 'Bot bergabung ke meeting', 
      botId,
      url: meetingUrl
    });
  } catch (error) {
    console.error(`[${botId}] Error saat menjalankan bot:`, error);
    logStream.write(`Error: ${error.message}\n`);
    logStream.end();
    
    res.status(500).json({ 
      success: false, 
      message: 'Gagal menjalankan bot', 
      error: error.message 
    });
  }
});

// Endpoint untuk menutup bot
app.post('/leave-meeting', (req, res) => {
  const { botId } = req.body;
  
  if (!botId || !activeBots.has(botId)) {
    return res.status(400).json({ success: false, message: 'Bot ID tidak valid atau bot tidak aktif' });
  }
  
  const bot = activeBots.get(botId);
  bot.process.kill();
  activeBots.delete(botId);
  
  console.log(`[${new Date().toISOString()}] Bot ${botId} diminta untuk keluar dari meeting`);
  
  res.json({ 
    success: true, 
    message: 'Bot meninggalkan meeting' 
  });
});

// Endpoint untuk melihat status semua bot
app.get('/status', (req, res) => {
  const botsInfo = [];
  
  for (const [id, bot] of activeBots.entries()) {
    const runtime = Math.floor((new Date() - bot.startTime) / 1000);
    
    botsInfo.push({
      botId: id,
      meetingUrl: bot.url,
      startTime: bot.startTime.toISOString(),
      runtimeSeconds: runtime
    });
  }
  
  res.json({
    success: true,
    activeBots: botsInfo.length,
    bots: botsInfo
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] Server berjalan di http://0.0.0.0:${PORT}`);
}); 