#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_USER=otter-letters

# Build and install generator
cargo build --release
sudo cp target/release/letters /usr/local/bin/otter-letters

# Create website dir
WWW_DIR="/var/www/boydt.org/www/lyles"
mkdir -p $WWW_DIR
sudo chmod 755 $WWW_DIR

# Sync static files
rsync -a --delete "$ROOT_DIR/www/" "$WWW_DIR"

# Minimize main.js
terser $ROOT_DIR/src/main.js -o $WWW_DIR/main.min.js -c -m --module

# Compress word list
gzip -c $ROOT_DIR/src/words.txt > $WWW_DIR/words.txt.gz

# Create daily letters file
touch $WWW_DIR/today

# Normalize permissions
sudo chown -R $USER:www-data $WWW_DIR
sudo chown $SERVICE_USER:www-data $WWW_DIR/today

# Install service
sudo useradd -r -s /usr/sbin/nologin $SERVICE_USER 2>/dev/null || true
sudo cp "$ROOT_DIR/deploy/otter-letters.service" /etc/systemd/system/
sudo cp "$ROOT_DIR/deploy/otter-letters.timer" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now otter-letters.timer

# Run one time to generate letters
sudo systemctl start otter-letters.service

echo "Done!"
