#!/bin/bash

# Script untuk menguji API Bot Meeting di Lightsail
# Usage: ./test-lightsail-api.sh [meeting_url]

# Konfigurasi
LIGHTSAIL_IP="47.129.100.3"
API_URL="http://$LIGHTSAIL_IP:8080/api"
API_KEY="notulen-ai-bot-key-2024"

# Pastikan jq terinstall
if ! command -v jq &> /dev/null; then
    echo "Error: jq tidak terinstall. Install dengan: sudo apt install jq"
    echo "Atau untuk Windows dengan: choco install jq"
    echo "Melanjutkan tanpa pretty-print JSON..."
    HAS_JQ=false
else
    HAS_JQ=true
fi

# Fungsi untuk pretty-print JSON
pretty_json() {
    if [ "$HAS_JQ" = true ]; then
        echo "$1" | jq .
    else
        echo "$1"
    fi
}

# 1. Test health endpoint
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
echo "Health Response:"
pretty_json "$HEALTH_RESPONSE"
echo ""

# 2. Test join meeting (jika URL diberikan)
if [ -n "$1" ]; then
    MEETING_URL="$1"
    echo "2. Testing join meeting dengan URL: $MEETING_URL"
    JOIN_RESPONSE=$(curl -s -X POST "$API_URL/join-meeting" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_KEY" \
        -d "{\"url\":\"$MEETING_URL\"}")
    
    echo "Join Response:"
    pretty_json "$JOIN_RESPONSE"
    
    # Extract session ID
    if [ "$HAS_JQ" = true ]; then
        SESSION_ID=$(echo "$JOIN_RESPONSE" | jq -r '.sessionId')
    else
        # Simple extraction without jq (basic, might fail on complex JSON)
        SESSION_ID=$(echo "$JOIN_RESPONSE" | grep -o '"sessionId":"[^"]*"' | awk -F'"' '{print $4}')
    fi
    
    echo "Session ID: $SESSION_ID"
    echo ""
    
    if [ -n "$SESSION_ID" ]; then
        # 3. Test get meeting status
        echo "3. Testing get meeting status..."
        echo "Checking status every 10 seconds (Ctrl+C untuk menghentikan)..."
        
        for i in {1..12}; do
            echo "Check status ke-$i..."
            STATUS_RESPONSE=$(curl -s "$API_URL/meeting-status/$SESSION_ID" \
                -H "Authorization: Bearer $API_KEY")
            
            echo "Status Response:"
            pretty_json "$STATUS_RESPONSE"
            echo ""
            
            # Wait 10 seconds before next check
            if [ $i -lt 12 ]; then
                echo "Menunggu 10 detik..."
                sleep 10
            fi
        done
        
        # 4. Ask if want to leave the meeting
        echo "Apakah ingin meninggalkan meeting? (y/n)"
        read LEAVE_CHOICE
        if [[ $LEAVE_CHOICE == "y" ]]; then
            echo "4. Testing leave meeting..."
            LEAVE_RESPONSE=$(curl -s -X POST "$API_URL/leave-meeting/$SESSION_ID" \
                -H "Authorization: Bearer $API_KEY")
            
            echo "Leave Response:"
            pretty_json "$LEAVE_RESPONSE"
        fi
    fi
else
    echo "Tidak ada URL meeting yang diberikan. Gunakan: ./test-lightsail-api.sh https://meet.google.com/xxx-xxxx-xxx"
fi

echo "Test selesai!" 