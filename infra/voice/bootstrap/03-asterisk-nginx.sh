#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y asterisk nginx

sudo systemctl enable asterisk
sudo systemctl enable nginx

sudo mkdir -p /var/spool/asterisk/monitor
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

sudo chown -R asterisk:asterisk /var/spool/asterisk/monitor
