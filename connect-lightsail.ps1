# Script PowerShell untuk connect SSH ke Lightsail
# Penggunaan: .\connect-lightsail.ps1

# Konfigurasi
$LIGHTSAIL_IP = "47.129.100.3"
$LIGHTSAIL_USER = "ubuntu"
$SSH_KEY_PATH = ".\LightsailDefaultKey-ap-southeast-1 (12).pem"

# Cek apakah file key ada
if (-not (Test-Path $SSH_KEY_PATH)) {
    Write-Host "Error: File key PEM tidak ditemukan: $SSH_KEY_PATH" -ForegroundColor Red
    Write-Host "Pastikan file key PEM berada di direktori yang sama dengan script ini." -ForegroundColor Yellow
    exit 1
}

# Set permission untuk key file (Windows tidak memerlukan chmod 400, 
# tapi pastikan security permissions sudah benar)
Write-Host "Connecting to Lightsail instance: $LIGHTSAIL_IP..." -ForegroundColor Cyan

# Coba connect menggunakan SSH dengan key
try {
    # Gunakan ssh dari Windows 10/11 
    ssh -i $SSH_KEY_PATH $LIGHTSAIL_USER@$LIGHTSAIL_IP
}
catch {
    Write-Host "Error connecting to Lightsail: $_" -ForegroundColor Red
    
    # Jika error, mungkin perlu menggunakan PuTTY atau ssh command tidak ada
    if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
        Write-Host "Command 'ssh' tidak ditemukan." -ForegroundColor Red
        Write-Host "Pastikan OpenSSH Client terinstall di Windows (Pengaturan > Aplikasi > Fitur Opsional)" -ForegroundColor Yellow
        Write-Host "Atau gunakan PuTTY dengan command:" -ForegroundColor Yellow
        Write-Host "putty -i `"$SSH_KEY_PATH`" $LIGHTSAIL_USER@$LIGHTSAIL_IP" -ForegroundColor White
    }
} 