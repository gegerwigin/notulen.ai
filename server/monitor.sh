#!/bin/bash

# Configuration
INSTANCE_IP="54.255.198.173"
KEY_PATH="~/.ssh/notula-bot.pem"

# Check service status
echo "Checking service status..."
ssh -i $KEY_PATH ubuntu@$INSTANCE_IP "sudo systemctl status notula-bot"

# Check logs
echo "Recent logs:"
ssh -i $KEY_PATH ubuntu@$INSTANCE_IP "journalctl -u notula-bot -n 50 --no-pager"

# Check system resources
echo "System resources:"
ssh -i $KEY_PATH ubuntu@$INSTANCE_IP << 'EOF'
  echo "CPU Usage:"
  top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'
  
  echo "Memory Usage:"
  free -m | awk 'NR==2{printf "%.2f%%\n", $3*100/$2}'
  
  echo "Disk Usage:"
  df -h / | awk 'NR==2{print $5}'
EOF

# Check if bot is responsive
echo "Checking bot API..."
curl -s -o /dev/null -w "%{http_code}" http://$INSTANCE_IP:3001/health 