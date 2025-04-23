# Bot Google Meet - Panduan Troubleshooting

## Arsitektur Sistem

Bot ini terdiri dari dua komponen utama:
1. **chrome-headless** (browserless/chrome) - Container Docker yang menyediakan browser Chrome headless
2. **meet-bot** - Container Docker yang berisi server Node.js dan logika bot untuk bergabung ke Google Meet

## Menjalankan Bot

### Instalasi

1. Pastikan Docker dan Docker Compose sudah terinstal di server Anda
2. Clone repositori ini
3. Jalankan `docker-compose up -d` untuk menjalankan container

### Penggunaan

Kirim POST request ke endpoint `/join` dengan format berikut:

```json
{
  "url": "https://meet.google.com/xxx-xxxx-xxx",
  "username": "Nama Bot"
}
```

Contoh menggunakan curl:
```bash
curl -X POST http://localhost:3002/join \
  -H "Content-Type: application/json" \
  -d '{"url":"https://meet.google.com/xxx-xxxx-xxx","username":"Notulen AI Bot"}'
```

## Troubleshooting

### 1. Masalah Koneksi ke Chrome-Headless

Jika bot tidak dapat terhubung ke chrome-headless, periksa hal berikut:

- Pastikan container chrome-headless berjalan: `docker ps`
- Periksa log chrome-headless: `docker logs chrome-headless`
- Pastikan endpoint WebSocket benar (`ws://chrome:3000` di dalam jaringan Docker)
- Gunakan script pengujian untuk verifikasi koneksi: `python test_bot.py --check`

### 2. Masalah Format JSON

Jika ada kesalahan format JSON, pastikan:

- Request dikirim dengan header `Content-Type: application/json`
- JSON tidak memiliki trailing comma
- Format JSON valid, bisa diverifikasi dengan [JSONLint](https://jsonlint.com/)

### 3. Memperbaiki Koneksi Setelah Restart

Jika bot tidak merespons setelah restart:

1. Matikan kedua container: `docker-compose down`
2. Hapus volume Docker untuk menghindari konflik: `docker volume prune`
3. Restart container: `docker-compose up -d`
4. Tunggu 15-20 detik hingga browser benar-benar siap
5. Pengujian: `python test_bot.py`

### 4. Memeriksa Status Bot

Kirim GET request ke endpoint `/health` untuk memeriksa status bot:

```bash
curl http://localhost:3002/health
```

### 5. Memeriksa Log

Melihat log real-time bot:

```bash
docker logs meet-bot --follow
```

Melihat log chrome-headless:

```bash
docker logs chrome-headless --follow
```

## File Konfigurasi Utama

- `docker-compose.yml` - Konfigurasi Docker
- `docker-meet-bot.js` - Implementasi bot Google Meet 
- `server.js` - Server API untuk mengontrol bot

## Script Pengujian

Gunakan script `test_bot.py` untuk menguji bot:

```bash
# Periksa status server
python test_bot.py --check

# Menguji bergabung ke meeting
python test_bot.py --meet "https://meet.google.com/xxx-xxx-xxx" --name "Nama Bot"
```

## Solusi Umum

1. **Error koneksi WebSocket**: Pastikan network Docker berfungsi dengan baik. Gunakan fallback IP `172.27.0.2` jika nama host `chrome` tidak berfungsi.

2. **Bot stuck**: Restart kedua container dengan `docker-compose down && docker-compose up -d`.

3. **Error format JSON**: Periksa dan validasi payload JSON menggunakan JSONLint atau `python -m json.tool`.

4. **Browserless/Chrome crash**: Biasanya karena kekurangan sumber daya. Pastikan server memiliki minimal 2GB RAM dan 1vCPU untuk performa yang stabil. 