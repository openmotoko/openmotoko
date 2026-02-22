#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

check_node() {
  if ! command -v node &>/dev/null; then
    echo "[error] Node.js not found. Install Node.js 22 LTS"
    exit 1
  fi

  local version
  version=$(node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$version" -lt 22 ]]; then
    echo "[error] Node.js $version found, need >= 22"
    exit 1
  fi
  echo "[ok] Node.js $(node -v)"
}

check_pnpm() {
  if ! command -v pnpm &>/dev/null; then
    echo "Installing pnpm via corepack..."
    corepack enable
    corepack prepare pnpm@9.15.4 --activate
  fi
  echo "[ok] pnpm $(pnpm -v)"
}

echo "=== OpenMotoko Dev Setup ==="
echo ""

check_node
check_pnpm

echo "Installing dependencies..."
pnpm install

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[ok] Created .env from .env.example"
  echo "[!] Edit .env to add your API keys"
fi

mkdir -p data

echo "Running database migrations..."
pnpm db:migrate

if [[ "${1:-}" == "--seed" ]]; then
  echo "Seeding database..."
  pnpm --filter @openmotoko/core db:seed
fi

echo ""
echo "Starting dev servers..."
echo "  API:  http://localhost:3457"
echo "  Web:  http://localhost:5173"
echo ""

pnpm dev
