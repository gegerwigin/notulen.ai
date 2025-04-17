# Notulen.ai API Proxy Server

Server proxy ini berfungsi sebagai perantara antara aplikasi frontend Notulen.ai dan API eksternal (DeepSeek dan OpenAI Whisper) untuk mengatasi masalah CORS dan menyembunyikan API key dari client.

## Fitur

- Proxy untuk DeepSeek Chat API
- Proxy untuk DeepSeek Audio Transcription API
- Proxy untuk OpenAI Whisper API (partial support)
- Konfigurasi CORS yang aman untuk produksi
- Health check endpoint

## Cara Menjalankan Server

### Development

```bash
# Install dependencies
npm install

# Start server
npm start
```

Server akan berjalan di http://localhost:3000

### Production

#### Menggunakan Docker

```bash
# Build Docker image
docker build -t notulen-api-proxy .

# Run Docker container
docker run -p 3000:3000 -d notulen-api-proxy
```

#### Deployment di AWS Lightsail

1. Push kode ke repository Git
2. Di AWS Lightsail, buat instance container baru
3. Pilih "Specify a deployment source" dan masukkan URL repository Git
4. Konfigurasi port 3000
5. Deploy

## Endpoint

- `/api/deepseek/chat` - Proxy untuk DeepSeek Chat API
- `/api/deepseek/audio` - Proxy untuk DeepSeek Audio Transcription API
- `/api/whisper` - Proxy untuk OpenAI Whisper API
- `/health` - Health check endpoint

## Konfigurasi

Server proxy ini dikonfigurasi untuk menerima permintaan dari domain berikut:
- http://localhost:5173 (development)
- https://notulen.ai (production)
- https://www.notulen.ai (production)

Untuk menambahkan domain lain, edit array `allowedOrigins` di file `index.js`.

## Integrasi dengan Frontend

Di aplikasi frontend, gunakan environment variable berikut:

```
VITE_DEEPSEEK_PROXY_URL=http://localhost:3000 # Development
VITE_DEEPSEEK_PROXY_URL=https://api.notulen.ai # Production
VITE_WHISPER_PROXY_URL=http://localhost:3000 # Development
VITE_WHISPER_PROXY_URL=https://api.notulen.ai # Production
```
