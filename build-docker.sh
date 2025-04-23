#!/bin/bash
cd /home/bitnami/bot-test
sudo docker-compose down
sudo docker-compose build --no-cache
sudo docker-compose up -d
sudo docker ps 