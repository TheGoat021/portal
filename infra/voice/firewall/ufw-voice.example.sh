#!/usr/bin/env bash
set -euo pipefail

sudo ufw default deny incoming
sudo ufw default allow outgoing

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# SIP
sudo ufw allow 5060/udp
sudo ufw allow 5061/tcp

# RTP media range
sudo ufw allow 10000:20000/udp

# Se o ARI/AMI forem locais, nao exponha. Se precisar expor para um IP fixo seu,
# troque por regras allow from <IP>.
# sudo ufw allow from X.X.X.X to any port 8088 proto tcp
# sudo ufw allow from X.X.X.X to any port 5038 proto tcp

sudo ufw --force enable
sudo ufw status verbose
