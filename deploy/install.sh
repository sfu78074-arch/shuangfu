#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/sfu78074-arch/shuangfu.git"
SRC_DIR="/opt/shuangfu-src"
WEB_DIR="/var/www/shuangfu"
NGINX_SITE="/etc/nginx/sites-available/shuangfu"

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 或 sudo 运行。"
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx git ufw ca-certificates

if [ -d "$SRC_DIR/.git" ]; then
  git -C "$SRC_DIR" fetch --depth=1 origin main
  git -C "$SRC_DIR" reset --hard origin/main
else
  rm -rf "$SRC_DIR"
  git clone --depth=1 --branch main "$REPO_URL" "$SRC_DIR"
fi

install -d -m 0755 "$WEB_DIR"
rm -rf "$WEB_DIR"/*
for f in index.html p0.txt p1.txt p2.txt p3.txt p4.txt s42.js s43.js s44simple.js robots.txt; do
  install -m 0644 "$SRC_DIR/$f" "$WEB_DIR/$f"
done

install -m 0644 "$SRC_DIR/deploy/nginx.conf" "$NGINX_SITE"
ln -sfn "$NGINX_SITE" /etc/nginx/sites-enabled/shuangfu
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable --now nginx
systemctl reload nginx

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

cat <<EOF
部署完成。
当前先通过服务器公网 IP 的 HTTP 访问：
  http://<SERVER_IP>/

安全说明：
- 只开放 SSH / HTTP / HTTPS。
- Nginx 已启用基础安全响应头并禁止目录兜底访问。
- 保留必要的 Web/系统安全日志，不额外安装第三方统计脚本。
- HTTPS 可在拿到固定公网 IP 后使用支持 IP 地址证书的 ACME/Certbot 配置，或以后绑定域名。
EOF
