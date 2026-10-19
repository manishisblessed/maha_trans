#!/bin/bash
# ══════════════════════════════════════════════════════════════════
#  TRANSPE — EC2 First-Time Setup Script
#  Run once on a fresh Ubuntu 22.04 / 24.04 / 26.04 LTS instance.
#  Installs: Node 20 LTS, PM2, Nginx, ffmpeg, ufw, swap, clones repo.
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step=0; total=10
log()  { step=$((step+1)); echo -e "\n${CYAN}[${step}/${total}]${NC} ${GREEN}$1${NC}"; }
ok()   { echo -e "  ${GREEN}✔  $1${NC}"; }
warn() { echo -e "  ${YELLOW}⚠  $1${NC}"; }
fail() { echo -e "\n${RED}✖  $1${NC}"; exit 1; }

echo ""
echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo -e "${CYAN}  TRANSPE — EC2 Setup  $(date '+%Y-%m-%d %H:%M:%S %Z')${NC}"
echo -e "${CYAN}══════════════════════════════════════════════${NC}"

# ── 1. System update ─────────────────────────────────────────────
log "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y -q
sudo apt-get upgrade -y -q
sudo apt-get install -y -q \
  git curl wget unzip \
  ffmpeg \
  nginx \
  ufw \
  certbot python3-certbot-nginx \
  build-essential
ok "System packages installed"

# ── 2. Swap (critical for Next.js build on any instance) ─────────
log "Setting up 4 GB swap..."
if [ -f /swapfile ]; then
  sudo swapon /swapfile 2>/dev/null || true
  ok "Existing /swapfile re-enabled ($(free -m | awk '/^Swap:/{print $2}') MB)"
else
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile  >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab \
    || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  ok "4 GB swap created and enabled"
fi
echo "  Swap: $(free -m | awk '/^Swap:/{print $2}') MB"

# ── 3. Node.js 20 LTS ────────────────────────────────────────────
log "Installing Node.js 20 LTS via NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1
sudo apt-get install -y -q nodejs
ok "Node.js $(node --version) / npm $(npm --version)"

# ── 4. PM2 ───────────────────────────────────────────────────────
log "Installing PM2 globally..."
sudo npm install -g pm2 --quiet
ok "PM2 $(pm2 --version)"

# ── 5. Firewall ──────────────────────────────────────────────────
log "Configuring UFW firewall..."
sudo ufw allow OpenSSH    >/dev/null
sudo ufw allow 'Nginx Full' >/dev/null
sudo ufw --force enable   >/dev/null
ok "UFW enabled — SSH + HTTP (80) + HTTPS (443) open"

# ── 6. Clone repository ──────────────────────────────────────────
log "Cloning repository → /home/ubuntu/TRANSPE..."
if [ -d /home/ubuntu/TRANSPE/.git ]; then
  warn "Repo already exists — pulling latest..."
  cd /home/ubuntu/TRANSPE
  git fetch origin
  git reset --hard origin/main
  ok "Repo updated to $(git rev-parse --short HEAD)"
else
  git clone https://github.com/manishisblessed/maha_trans.git /home/ubuntu/TRANSPE
  ok "Repo cloned — commit $(git -C /home/ubuntu/TRANSPE rev-parse --short HEAD)"
fi
mkdir -p /home/ubuntu/logs

# ── 7. Copy .env ─────────────────────────────────────────────────
log "Placing production .env at /home/ubuntu/env-TRANSPE..."
if [ -f /home/ubuntu/env-TRANSPE ]; then
  ok "/home/ubuntu/env-TRANSPE already exists — keeping it"
elif [ -f /home/ubuntu/transpe.env ]; then
  cp /home/ubuntu/transpe.env /home/ubuntu/env-TRANSPE
  chmod 600 /home/ubuntu/env-TRANSPE
  ok "Copied /home/ubuntu/transpe.env → /home/ubuntu/env-TRANSPE"
else
  warn "No .env uploaded yet — you must place it at /home/ubuntu/env-TRANSPE before running deploy.sh"
fi

# ── 8. Nginx reverse-proxy config ────────────────────────────────
log "Writing Nginx config for transpe.net..."
sudo tee /etc/nginx/sites-available/transpe >/dev/null <<'NGINXEOF'
# ---------- Rate limiting zones ----------
limit_req_zone $binary_remote_addr zone=api:10m  rate=60r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

# ---------- HTTP → redirect (certbot will add SSL block) ----------
server {
    listen 80;
    listen [::]:80;
    server_name transpe.net www.transpe.net;

    # Allow Let's Encrypt ACME challenge (needed before first cert issue)
    location /.well-known/acme-challenge/ { root /var/www/html; }

    # All other traffic → HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# ---------- HTTPS / main app ----------
# NOTE: Certbot will insert ssl_certificate lines here automatically.
# Until you run certbot this block is inactive (port 443 not yet open).
# Once certbot runs, Nginx reloads with full HTTPS + HTTP/2.
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name transpe.net www.transpe.net;

    # --- SSL (managed by certbot) ---
    # ssl_certificate /etc/letsencrypt/live/transpe.net/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/transpe.net/privkey.pem;
    # include /etc/letsencrypt/options-ssl-nginx.conf;
    # ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # KYC uploads can be up to ~16 MB video + metadata
    client_max_body_size 20M;

    # Timeouts (KYC video upload, long API calls)
    proxy_read_timeout    120s;
    proxy_connect_timeout  10s;
    proxy_send_timeout     60s;

    # Common proxy headers
    proxy_http_version 1.1;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        'upgrade';
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Auth endpoints — tight rate limit
    location ~ ^/api/auth {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
    }

    # API endpoints — relaxed rate limit
    location /api/ {
        limit_req zone=api burst=30 nodelay;
        proxy_pass http://127.0.0.1:3000;
    }

    # Everything else (Next.js pages, _next/static, etc.)
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
NGINXEOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/transpe /etc/nginx/sites-enabled/transpe

# Temporarily comment out the HTTPS server block so Nginx starts without certs
sudo python3 -c "
import re, pathlib
p = pathlib.Path('/etc/nginx/sites-available/transpe')
content = p.read_text()
# Comment out the HTTPS server block lines that reference ssl directives
# so Nginx starts cleanly before certbot runs
content2 = re.sub(r'(listen 443)', r'# \1', content)
content2 = re.sub(r'(listen \[::\]:443)', r'# \1', content2)
p.write_text(content2)
"

sudo nginx -t 2>&1 | grep -E 'ok|error' || true
sudo systemctl enable nginx >/dev/null 2>&1
sudo systemctl restart nginx
ok "Nginx started — HTTP redirect active"

# ── 9. PM2 startup on reboot ─────────────────────────────────────
log "Configuring PM2 to auto-start on reboot..."
PM2_STARTUP=$(pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>&1 | grep 'sudo env' | head -1 || true)
if [ -n "$PM2_STARTUP" ]; then
  eval "$PM2_STARTUP" >/dev/null 2>&1 || true
fi
ok "PM2 systemd startup registered"

# ── 10. Verify ffmpeg ────────────────────────────────────────────
log "Verifying ffmpeg + ffprobe..."
ffmpeg_v=$(ffmpeg -version 2>&1 | head -1)
ffprobe_v=$(ffprobe -version 2>&1 | head -1)
ok "$ffmpeg_v"
ok "$ffprobe_v"

# ── Done ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  EC2 SETUP COMPLETE!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
printf "  %-12s %s\n" "Node.js:"  "$(node --version)"
printf "  %-12s %s\n" "NPM:"      "$(npm --version)"
printf "  %-12s %s\n" "PM2:"      "$(pm2 --version)"
printf "  %-12s %s\n" "Git:"      "$(git --version | cut -d' ' -f3)"
printf "  %-12s %s\n" "ffmpeg:"   "$(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')"
printf "  %-12s %s\n" "Nginx:"    "$(nginx -v 2>&1 | awk -F/ '{print $2}')"
printf "  %-12s %s\n" "Swap:"     "$(free -m | awk '/^Swap:/{print $2}') MB"
echo ""
echo -e "${YELLOW}══ NEXT STEPS (in order) ══════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}1. DNS${NC}  — Point your domain registrar:"
echo "       transpe.net      A  →  3.106.88.91"
echo "       www.transpe.net  A  →  3.106.88.91"
echo ""
echo -e "  ${CYAN}2. SSL${NC}  — After DNS propagates (2–5 min), run:"
echo "       sudo certbot --nginx -d transpe.net -d www.transpe.net \\"
echo "         --non-interactive --agree-tos -m admin@transpe.net"
echo ""
echo -e "  ${CYAN}3. DEPLOY${NC} — Run the deploy script:"
echo "       cd /home/ubuntu/TRANSPE && ./deploy.sh"
echo ""
echo -e "  ${CYAN}4. VERIFY${NC}"
echo "       pm2 status"
echo "       pm2 logs --lines 50"
echo "       curl -I https://transpe.net/api/healthz"
echo ""
