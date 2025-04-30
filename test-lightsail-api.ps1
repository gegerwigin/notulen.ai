# Script PowerShell untuk menguji API Bot Meeting di Lightsail
# Usage: .\test-lightsail-api.ps1 [meetingUrl]

# Konfigurasi
$LIGHTSAIL_IP = "47.129.100.3"
$API_URL = "http://${LIGHTSAIL_IP}:8080/api"
$API_KEY = "notulen-ai-bot-key-2024"

# Fungsi untuk melakukan request dengan format yang baik
function Invoke-APIRequest {
    param (
        [string]$Method,
        [string]$Endpoint,
        [object]$Headers,
        [object]$Body
    )
    
    $fullUrl = "${API_URL}/${Endpoint}"
    Write-Host "Requesting: $Method $fullUrl" -ForegroundColor Yellow
    
    if ($Body) {
        $jsonBody = $Body | ConvertTo-Json -Compress
        $result = Invoke-RestMethod -Method $Method -Uri $fullUrl -Headers $Headers -Body $jsonBody -ContentType "application/json"
    } else {
        $result = Invoke-RestMethod -Method $Method -Uri $fullUrl -Headers $Headers
    }
    
    return $result
}

# 1. Test health endpoint
Write-Host "1. Testing health endpoint..." -ForegroundColor Cyan
$healthResponse = Invoke-RestMethod -Method GET -Uri "${API_URL}/health"
Write-Host "Health Response:" -ForegroundColor Green
$healthResponse | ConvertTo-Json -Depth 3
Write-Host ""

# 2. Test join meeting (jika URL diberikan)
$meetingUrl = $args[0]
if ($meetingUrl) {
    Write-Host "2. Testing join meeting dengan URL: $meetingUrl" -ForegroundColor Cyan
    
    $headers = @{
        "Authorization" = "Bearer $API_KEY"
    }
    
    $body = @{
        "url" = $meetingUrl
    }
    
    try {
        $joinResponse = Invoke-APIRequest -Method "POST" -Endpoint "join-meeting" -Headers $headers -Body $body
        
        Write-Host "Join Response:" -ForegroundColor Green
        $joinResponse | ConvertTo-Json -Depth 3
        
        $sessionId = $joinResponse.sessionId
        Write-Host "Session ID: $sessionId" -ForegroundColor Magenta
        Write-Host ""
        
        if ($sessionId) {
            # 3. Test get meeting status
            Write-Host "3. Testing get meeting status..." -ForegroundColor Cyan
            Write-Host "Checking status every 10 seconds (Ctrl+C untuk menghentikan)..." -ForegroundColor Yellow
            
            for ($i = 1; $i -le 12; $i++) {
                Write-Host "Check status ke-$i..." -ForegroundColor Blue
                
                $statusResponse = Invoke-APIRequest -Method "GET" -Endpoint "meeting-status/$sessionId" -Headers $headers
                
                Write-Host "Status Response:" -ForegroundColor Green
                $statusResponse | ConvertTo-Json -Depth 5
                Write-Host ""
                
                # Wait 10 seconds before next check
                if ($i -lt 12) {
                    Write-Host "Menunggu 10 detik..." -ForegroundColor Gray
                    Start-Sleep -Seconds 10
                }
            }
            
            # 4. Ask if want to leave the meeting
            $leaveChoice = Read-Host "Apakah ingin meninggalkan meeting? (y/n)"
            if ($leaveChoice -eq "y") {
                Write-Host "4. Testing leave meeting..." -ForegroundColor Cyan
                
                $leaveResponse = Invoke-APIRequest -Method "POST" -Endpoint "leave-meeting/$sessionId" -Headers $headers
                
                Write-Host "Leave Response:" -ForegroundColor Green
                $leaveResponse | ConvertTo-Json -Depth 3
            }
        }
    }
    catch {
        Write-Host "Error saat request API: $_" -ForegroundColor Red
        Write-Host "Response status code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        
        if ($_.ErrorDetails) {
            Write-Host "Error detail: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "Tidak ada URL meeting yang diberikan. Gunakan: .\test-lightsail-api.ps1 https://meet.google.com/xxx-xxxx-xxx" -ForegroundColor Red
}

Write-Host "Test selesai!" -ForegroundColor Cyan 