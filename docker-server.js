const express = require('express');
const winston = require('winston');
const GoogleMeetBot = require('./docker-meet-bot');

// Konfigurasi logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console()
    ]
});

const app = express();

// PENTING: Middleware untuk parsing JSON - harus ada!
app.use(express.json());

// Middleware untuk logging request
app.use((req, res, next) => {
    logger.info(`Incoming ${req.method} request to ${req.url}`);
    logger.info(`Headers: ${JSON.stringify(req.headers)}`);
    if (req.body) {
        logger.info(`Body: ${JSON.stringify(req.body)}`);
    }
    next();
});

// Error handler untuk JSON parsing
app.use((err, req, res, next) => {
    logger.error(`Error middleware: ${err.message}`);
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ 
            error: 'Invalid JSON format',
            details: err.message
        });
    }
    next(err);
});

let bot = null;

// Endpoint untuk mengecek status bot
app.get('/status', (req, res) => {
    try {
        if (!bot) {
            return res.json({ status: 'idle', initialized: false });
        }
        return res.json({ 
            status: 'ready',
            initialized: bot.isInitialized
        });
    } catch (error) {
        logger.error(`Error saat mengecek status: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint untuk bergabung ke meeting
app.post('/join', async (req, res) => {
    try {
        logger.info('Processing /join request');
        
        // Validasi input
        const { url, username } = req.body;
        
        if (!url || !username) {
            logger.error('Missing required fields: url or username');
            return res.status(400).json({ 
                error: 'URL meeting dan username harus disediakan',
                receivedData: req.body
            });
        }

        logger.info(`Joining meeting at ${url} as ${username}`);

        // Inisialisasi bot jika belum ada
        if (!bot) {
            logger.info('Membuat instance bot baru');
            bot = new GoogleMeetBot(logger);
        }

        // Tunggu hingga bot selesai diinisialisasi
        let initRetries = 0;
        const maxInitRetries = 3;
        while (!bot.isInitialized && initRetries < maxInitRetries) {
            logger.info('Menunggu bot selesai diinisialisasi...');
            try {
                await bot.initialize();
                break;
            } catch (error) {
                initRetries++;
                if (initRetries >= maxInitRetries) {
                    throw error;
                }
                logger.warn(`Gagal inisialisasi bot (percobaan ${initRetries}/${maxInitRetries}): ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        // Bergabung ke meeting
        logger.info(`Mencoba bergabung ke meeting: ${url} dengan username: ${username}`);
        await bot.joinMeeting(url, username);
        
        logger.info('Berhasil bergabung ke meeting');
        res.json({ 
            success: true, 
            message: 'Berhasil bergabung ke meeting',
            url,
            username
        });

    } catch (error) {
        logger.error(`Error saat bergabung ke meeting: ${error.message}`);
        res.status(500).json({ 
            error: error.message,
            details: 'Gagal bergabung ke meeting'
        });
    }
});

// Endpoint untuk meninggalkan meeting
app.post('/leave', async (req, res) => {
    try {
        if (!bot) {
            return res.status(400).json({ 
                error: 'Tidak ada sesi bot yang aktif' 
            });
        }

        await bot.leaveMeeting();
        
        // Reset instance bot
        bot = null;
        
        res.json({ 
            success: true, 
            message: 'Berhasil meninggalkan meeting' 
        });

    } catch (error) {
        logger.error(`Error saat meninggalkan meeting: ${error.message}`);
        res.status(500).json({ 
            error: error.message,
            details: 'Gagal meninggalkan meeting'
        });
    }
});

// Handle process termination
process.on('SIGTERM', async () => {
    logger.info('Menerima sinyal SIGTERM');
    if (bot) {
        try {
            await bot.leaveMeeting();
        } catch (error) {
            logger.error(`Error saat menutup bot: ${error.message}`);
        }
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('Menerima sinyal SIGINT');
    if (bot) {
        try {
            await bot.leaveMeeting();
        } catch (error) {
            logger.error(`Error saat menutup bot: ${error.message}`);
        }
    }
    process.exit(0);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server berjalan di http://0.0.0.0:${PORT}`);
}); 