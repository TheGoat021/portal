#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get upgrade -y

sudo apt-get install -y \
  curl \
  git \
  unzip \
  ca-certificates \
  gnupg \
  lsb-release \
  software-properties-common \
  build-essential \
  jq \
  ufw

sudo mkdir -p /opt/axion
sudo mkdir -p /var/log/axion-voice
sudo chown -R "$USER":"$USER" /opt/axion
