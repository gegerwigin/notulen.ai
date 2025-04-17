# Configuration
$SERVER = "ubuntu@18.141.229.165"
$KEY_PATH = "C:\Users\mahar\Downloads\LightsailDefaultKey-ap-southeast-1 (1).pem"
$REMOTE_DIR = "/home/ubuntu/notulen.ai"

# Ensure key file has correct permissions
Write-Host "Setting key file permissions..."
icacls.exe $KEY_PATH /reset
icacls.exe $KEY_PATH /grant:r ${env:USERNAME}:"(R)"
icacls.exe $KEY_PATH /inheritance:r

# Create deployment package
Write-Host "Creating deployment package..."
npm run build
tar -czf deploy.tar.gz dist/ package.json package-lock.json setup.sh

# Copy files to server
Write-Host "Copying files to server..."
ssh -i $KEY_PATH -o StrictHostKeyChecking=no $SERVER "mkdir -p $REMOTE_DIR"
scp -i $KEY_PATH deploy.tar.gz ${SERVER}:${REMOTE_DIR}/
scp -i $KEY_PATH setup.sh ${SERVER}:${REMOTE_DIR}/

# Execute setup on server
Write-Host "Executing setup script on server..."
ssh -i $KEY_PATH $SERVER "cd $REMOTE_DIR && tar xzf deploy.tar.gz && chmod +x setup.sh && ./setup.sh"

# Cleanup
Write-Host "Cleaning up..."
Remove-Item deploy.tar.gz

Write-Host "Deployment complete!" 