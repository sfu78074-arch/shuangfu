#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="/opt/shuangfu-src"
WEB_DIR="/var/www/shuangfu"

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 或 sudo 运行。"
  exit 1
fi

if [ ! -d "$SRC_DIR/.git" ]; then
  echo "未找到安装目录，请先运行 deploy/install.sh。"
  exit 1
fi

git -C "$SRC_DIR" fetch --depth=1 origin main
git -C "$SRC_DIR" reset --hard origin/main

for f in index.html p0.txt p1.txt p2.txt p3.txt p4.txt s42.js s43.js s44simple.js robots.txt; do
  install -m 0644 "$SRC_DIR/$f" "$WEB_DIR/$f"
done

install -m 0644 "$SRC_DIR/deploy/nginx.conf" /etc/nginx/sites-available/shuangfu
nginx -t
systemctl reload nginx

echo "S4.4 已更新到最新 main 版本。"
