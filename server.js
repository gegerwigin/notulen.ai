const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
const GoogleMeetBot = require('./docker-meet-bot');
const fs = require('fs');
const path = require('path');

// Buat direktori logs jika belum ada
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Konfigurasi logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ 
            filename: path.join(logsDir, 'server.log') 
        })
    ]
});

// Inisialisasi Express
const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware untuk logging request
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Bot instance
let bot = null;
let botBusy = false;
let currentMeeting = null;

// Endpoint health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        botInitialized: bot !== null && bot.isInitialized,
        botBusy: botBusy,
        currentMeeting: currentMeeting
    });
});

// Endpoint untuk mendapatkan logs
app.get('/logs', (req, res) => {
    try {
        const logFile = path.join(logsDir, 'bot.log');
        if (fs.existsSync(logFile)) {
            const logs = fs.readFileSync(logFile, 'utf8');
            const lastLines = logs.split('\n').slice(-200).join('\n'); // Ambil 200 baris terakhir
            res.status(200).send(lastLines);
        } else {
            res.status(404).json({ error: 'File log tidak ditemukan' });
        }
    } catch (error) {
        logger.error(`Gagal membaca log: ${error.message}`);
        res.status(500).json({ error: 'Gagal membaca log' });
    }
});

// Endpoint untuk bergabung ke meeting
app.post('/join', async (req, res) => {
    try {
        // Validasi request dan log detail request untuk debugging
        const { url, username } = req.body;
        
        logger.info(`Menerima request join: ${JSON.stringify(req.body)}`);
        
        if (!url) {
            logger.error('URL meeting tidak ada dalam request');
            return res.status(400).json({ 
                error: 'URL meeting harus diisi',
                receivedData: req.body
            });
        }
        
        if (!username) {
            logger.error('Username tidak ada dalam request');
            return res.status(400).json({ 
                error: 'Username harus diisi',
                receivedData: req.body
            });
        }
        
        // Periksa format URL
        if (!url.match(/^https:\/\/meet\.google\.com\/[a-z0-9\-]+/i)) {
            logger.error(`URL tidak valid: ${url}`);
            return res.status(400).json({ 
                error: 'URL tidak valid, harus berupa URL Google Meet',
                receivedData: { url, username } 
            });
        }
        
        // Cek status bot
        if (botBusy) {
            return res.status(409).json({ 
                error: 'Bot sedang sibuk', 
                currentMeeting 
            });
        }
        
        // Set status bot
        botBusy = true;
        currentMeeting = { url, username, startTime: new Date() };
        logger.info(`Menerima permintaan untuk bergabung ke meeting: ${url} sebagai ${username}`);
        
        // Inisialisasi bot jika belum
        try {
            if (!bot || !bot.isInitialized) {
                logger.info('Menginisialisasi bot...');
                bot = new GoogleMeetBot(logger);
                await bot.initialize();
            }
            
            // Join meeting
            logger.info(`Mencoba bergabung ke meeting: ${url}`);
            await bot.joinMeeting(url, username);
            
            // Kirim respons sukses
            res.status(200).json({ 
                success: true, 
                message: 'Berhasil bergabung ke meeting',
                meeting: currentMeeting
            });
            
        } catch (error) {
            logger.error(`Gagal bergabung ke meeting: ${error.message}`);
            botBusy = false;
            currentMeeting = null;
            
            if (bot) {
                try {
                    await bot.close();
                    bot = null;
                } catch (closeError) {
                    logger.error(`Gagal menutup browser: ${closeError.message}`);
                }
            }
            
            res.status(500).json({ 
                error: `Gagal bergabung ke meeting: ${error.message}` 
            });
        }
    } catch (error) {
        logger.error(`Error umum: ${error.message}`);
        botBusy = false;
        res.status(500).json({ error: 'Terjadi kesalahan internal' });
    }
});

// Endpoint untuk meninggalkan meeting
app.post('/leave', async (req, res) => {
    try {
        // Cek apakah bot sedang dalam meeting
        if (!botBusy || !currentMeeting) {
            return res.status(400).json({ error: 'Bot tidak dalam meeting' });
        }
        
        logger.info(`Menerima permintaan untuk meninggalkan meeting: ${currentMeeting.url}`);
        
        try {
            // Tinggalkan meeting
            if (bot && bot.isInitialized) {
                await bot.leaveMeeting();
                logger.info('Berhasil meninggalkan meeting');
            }
            
            // Reset status
            const meetingInfo = { ...currentMeeting };
            botBusy = false;
            currentMeeting = null;
            
            res.status(200).json({ 
                success: true, 
                message: 'Berhasil meninggalkan meeting',
                meeting: meetingInfo
            });
        } catch (error) {
            logger.error(`Gagal meninggalkan meeting: ${error.message}`);
            
            // Reset status meskipun gagal
            botBusy = false;
            currentMeeting = null;
            
            // Coba tutup browser
            if (bot) {
                try {
                    await bot.close();
                    bot = null;
                } catch (closeError) {
                    logger.error(`Gagal menutup browser: ${closeError.message}`);
                }
            }
            
            res.status(500).json({ error: `Gagal meninggalkan meeting: ${error.message}` });
        }
    } catch (error) {
        logger.error(`Error umum: ${error.message}`);
        botBusy = false;
        currentMeeting = null;
        res.status(500).json({ error: 'Terjadi kesalahan internal' });
    }
});

// Endpoint untuk status
app.get('/status', (req, res) => {
    res.status(200).json({
        botInitialized: bot !== null && bot.isInitialized,
        botBusy: botBusy,
        currentMeeting: currentMeeting
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error(`Error handler: ${err.message}`);
    res.status(500).json({ error: 'Terjadi kesalahan internal' });
});

// Mulai server
app.listen(port, () => {
    logger.info(`Server berjalan di port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM diterima, membersihkan...');
    if (bot) {
        try {
            await bot.close();
        } catch (error) {
            logger.error(`Gagal menutup browser: ${error.message}`);
        }
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT diterima, membersihkan...');
    if (bot) {
        try {
            await bot.close();
        } catch (error) {
            logger.error(`Gagal menutup browser: ${error.message}`);
        }
    }
    process.exit(0);
});

// Tangani uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise);
    logger.error('Reason:', reason);
}); 