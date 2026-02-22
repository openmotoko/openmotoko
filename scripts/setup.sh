#!/usr/bin/env bash
set -euo pipefail

DOCKER_DIR="$(cd "$(dirname "$0")/../docker" && pwd)"

check_docker() {
  if command -v docker &>/dev/null; then
    echo "[ok] Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
    return 0
  fi
  return 1
}

check_compose() {
  if docker compose version &>/dev/null; then
    echo "[ok] Docker Compose $(docker compose version --short)"
    return 0
  fi
  return 1
}

install_docker() {
  echo "Installing Docker..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg lsb-release

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable --now docker
  echo "[ok] Docker installed"
}

echo "=== OpenMotoko VPS Setup ==="
echo ""

if ! check_docker; then
  if [[ $EUID -ne 0 ]]; then
    echo "[error] Docker not found. Run as root to install: sudo bash $0"
    exit 1
  fi
  install_docker
fi

if ! check_compose; then
  echo "[error] Docker Compose plugin not found"
  exit 1
fi

cd "$DOCKER_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[ok] Created .env from .env.example"

  read -rp "Enter your domain (e.g. openmotoko.example.com): " domain
  if [[ -n "$domain" ]]; then
    sed -i "s|DOMAIN=.*|DOMAIN=${domain}|" .env
  fi

  session_secret=$(openssl rand -hex 32)
  sed -i "s|OPENMOTOKO_SESSION_SECRET=.*|OPENMOTOKO_SESSION_SECRET=${session_secret}|" .env

  read -rsp "Set admin password: " admin_pw
  echo ""
  if [[ -n "$admin_pw" ]]; then
    sed -i "s|OPENMOTOKO_PASSWORD=.*|OPENMOTOKO_PASSWORD=${admin_pw}|" .env
  fi

  echo ""
  echo "[!] Edit docker/.env to add your API keys before starting"
  echo ""
else
  echo "[ok] .env already exists"
fi

mkdir -p data

echo "Starting OpenMotoko..."
docker compose up -d --build

echo ""
echo "=== Setup Complete ==="
docker compose ps
echo ""
echo "Logs: docker compose -f docker/docker-compose.yml logs -f"
