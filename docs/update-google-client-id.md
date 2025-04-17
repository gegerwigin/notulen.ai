# Panduan Update Google Client ID di Aplikasi

Setelah mendapatkan Client ID baru dari Google Cloud Console, ikuti langkah-langkah berikut untuk mengupdate kode aplikasi:

## 1. Update App.tsx

1. Buka file `src/App.tsx`
2. Cari konstanta `GOOGLE_CLIENT_ID` (sekitar line 38)
3. Ganti nilai lama dengan Client ID baru, contoh:

```typescript
// Google OAuth Client ID
const GOOGLE_CLIENT_ID = 'new-client-id-from-google-cloud-console.apps.googleusercontent.com';
```

4. Simpan file

## 2. Update Firebase Environment Variables (Opsional)

Jika Anda menggunakan Firebase Functions yang memerlukan autentikasi Google, update environment variables:

```bash
firebase functions:config:set google.client_id="CLIENT_ID_BARU"
firebase functions:config:set google.client_secret="CLIENT_SECRET_BARU"
```

## 3. Build dan Deploy

1. Build aplikasi:
```bash
npm run build
```

2. Deploy ke Firebase:
```bash
firebase deploy
```

## 4. Pengujian

1. Buka website di domain yang telah didaftarkan (https://www.notula.ai)
2. Coba login dengan Google
3. Pastikan tidak ada error OAuth yang muncul

## Troubleshooting

Jika terjadi error "Error: redirect_uri_mismatch":
1. Pastikan domain yang digunakan untuk akses aplikasi sudah didaftarkan di Google Cloud Console
2. Periksa kembali "Authorized JavaScript origins" dan "Authorized redirect URIs"
3. Jika menggunakan subdomain (www), pastikan subdomain tersebut juga terdaftar 