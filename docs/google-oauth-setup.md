# Panduan Setup Google OAuth untuk notula.ai

Untuk mengaktifkan login dengan Google dan integrasi Google Calendar di aplikasi notula.ai, ikuti langkah-langkah berikut:

## 1. Login ke Google Cloud Console

- Buka [Google Cloud Console](https://console.cloud.google.com/)
- Login dengan akun Google yang ingin digunakan untuk mengelola project

## 2. Buat atau Pilih Project

- Klik dropdown project di bagian atas dan pilih "New Project"
- Beri nama project "Notula AI" dan klik "Create"
- Tunggu hingga project dibuat, lalu pilih project tersebut

## 3. Konfigurasi OAuth Consent Screen

- Di menu sidebar, klik "APIs & Services" > "OAuth consent screen"
- Pilih tipe user "External" (jika belum memiliki Google Workspace)
- Klik "Create"
- Isi informasi aplikasi:
  - App name: Notula AI
  - User support email: (email Anda)
  - Developer contact information: (email Anda)
  - Authorized domains: notula.ai
- Klik "Save and Continue"
- Di bagian Scopes, tambahkan scopes berikut:
  - `userinfo.email`
  - `userinfo.profile`
  - `calendar.readonly` (jika perlu akses Google Calendar)
  - `calendar.events` (jika perlu mengelola event kalender)
- Klik "Save and Continue"
- Di bagian Test Users, tambahkan email Anda dan email tim pengembang
- Klik "Save and Continue"
- Review dan klik "Back to Dashboard"

## 4. Buat OAuth Client ID

- Di menu sidebar, klik "APIs & Services" > "Credentials"
- Klik "Create Credentials" > "OAuth client ID"
- Pilih Application type: "Web application"
- Isi nama: "Notula AI Web Client"
- Di bagian "Authorized JavaScript origins", tambahkan:
  - `https://notula.ai`
  - `https://www.notula.ai`
  - `https://sekreai.web.app` (URL Firebase Hosting)
  - `http://localhost:5173` (untuk development)
- Di bagian "Authorized redirect URIs", tambahkan:
  - `https://notula.ai/login`
  - `https://www.notula.ai/login`
  - `https://sekreai.web.app/login`
  - `http://localhost:5173/login`
- Klik "Create"

## 5. Simpan Client ID dan Client Secret

- Setelah client dibuat, Anda akan mendapatkan Client ID dan Client Secret
- Catat Client ID dan Secret ini di tempat yang aman
- Update kode aplikasi dengan Client ID baru di file `src/App.tsx`

## 6. Aktifkan Google Calendar API

- Di menu sidebar, klik "APIs & Services" > "Library"
- Cari "Google Calendar API"
- Klik "Enable"

## 7. Update Kode Aplikasi

- Ganti Client ID lama di file `src/App.tsx` dengan Client ID baru
- Pastikan domain yang digunakan pada aplikasi sudah didaftarkan di OAuth consent screen

## 8. Pengujian

- Buka aplikasi di domain yang telah didaftarkan
- Coba login dengan Google
- Verifikasi bahwa integrasi Google Calendar berfungsi dengan baik

## Catatan

- Selama berada dalam status "Testing", Anda hanya dapat menggunakan akun yang terdaftar sebagai test users
- Untuk mengatasi batasan ini, Anda bisa melakukan verifikasi aplikasi dengan Google 