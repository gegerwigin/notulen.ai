# PowerShell script to apply CORS configuration to S3 bucket
Write-Host "Applying CORS configuration to S3 bucket..."

# Set AWS credentials
$env:AWS_ACCESS_KEY_ID = "AKIAXGWWQTJ5YWWLNQNM"
$env:AWS_SECRET_ACCESS_KEY = "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"
$env:AWS_DEFAULT_REGION = "ap-southeast-1"

# Path to CORS configuration file
$corsFilePath = Join-Path -Path (Get-Location).Path -ChildPath "..\cors.json"

# Apply CORS configuration using AWS CLI
aws s3api put-bucket-cors --bucket catatai-audio-file --cors-configuration file://$corsFilePath

Write-Host "CORS configuration applied successfully!"

# Verify CORS configuration
Write-Host "Verifying CORS configuration..."
aws s3api get-bucket-cors --bucket catatai-audio-file

Write-Host "CORS configuration verified!"
