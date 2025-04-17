#!/bin/bash

# Configuration
SERVER="ubuntu@18.141.229.165"
KEY_PATH="C:/Users/mahar/Downloads/LightsailDefaultKey-ap-southeast-1 (1).pem"
REMOTE_DIR="/home/ubuntu/notulen.ai"

# Create deployment package
echo "Creating deployment package..."
npm run build
tar czf deploy.tar.gz dist/ package.json package-lock.json setup.sh

# Copy files to server
echo "Copying files to server..."
scp -i "$KEY_PATH" deploy.tar.gz "$SERVER:$REMOTE_DIR/"
scp -i "$KEY_PATH" setup.sh "$SERVER:$REMOTE_DIR/"

# Execute setup on server
echo "Executing setup script on server..."
ssh -i "$KEY_PATH" "$SERVER" "cd $REMOTE_DIR && \
    tar xzf deploy.tar.gz && \
    chmod +x setup.sh && \
    ./setup.sh"

# Cleanup
echo "Cleaning up..."
rm deploy.tar.gz

echo "Deployment complete!" 