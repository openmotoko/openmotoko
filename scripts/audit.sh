#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass=0
warn=0
fail=0

ok() { echo -e "${GREEN}[PASS]${NC} $1"; ((pass++)); }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; ((warn++)); }
fail() { echo -e "${RED}[FAIL]${NC} $1"; ((fail++)); }

echo "=== OpenMotoko Security Audit ==="
echo ""

echo "--- File Permissions ---"

if [[ -f .env ]]; then
  perms=$(stat -f '%Lp' .env 2>/dev/null || stat -c '%a' .env 2>/dev/null)
  if [[ "$perms" == "600" ]]; then
    ok ".env permissions: $perms"
  else
    fail ".env permissions: $perms (should be 600). Fix: chmod 600 .env"
  fi
else
  warning ".env not found (expected at project root)"
fi

if [[ -f docker/.env ]]; then
  perms=$(stat -f '%Lp' docker/.env 2>/dev/null || stat -c '%a' docker/.env 2>/dev/null)
  if [[ "$perms" == "600" ]]; then
    ok "docker/.env permissions: $perms"
  else
    fail "docker/.env permissions: $perms (should be 600). Fix: chmod 600 docker/.env"
  fi
fi

if [[ -d data ]]; then
  perms=$(stat -f '%Lp' data 2>/dev/null || stat -c '%a' data 2>/dev/null)
  if [[ "$perms" == "700" ]] || [[ "$perms" == "750" ]]; then
    ok "data/ permissions: $perms"
  else
    warning "data/ permissions: $perms (recommended: 700). Fix: chmod 700 data/"
  fi
else
  warning "data/ directory not found"
fi

echo ""
echo "--- Open Ports ---"

if command -v ss &>/dev/null; then
  listening=$(ss -tlnp 2>/dev/null | grep -c LISTEN || true)
  echo "Listening TCP ports: $listening"
  ss -tlnp 2>/dev/null | grep LISTEN | while read -r line; do
    echo "  $line"
  done
elif command -v lsof &>/dev/null; then
  echo "Listening ports:"
  lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | tail -n +2 | while read -r line; do
    echo "  $line"
  done
else
  warning "Neither ss nor lsof available for port scanning"
fi

echo ""
echo "--- Dependency Audit ---"

if command -v pnpm &>/dev/null; then
  echo "Running pnpm audit..."
  if pnpm audit --prod 2>/dev/null; then
    ok "No known vulnerabilities in production dependencies"
  else
    fail "Vulnerabilities found in dependencies"
  fi
else
  warning "pnpm not found, skipping dependency audit"
fi

echo ""
echo "--- Outdated Dependencies ---"

if command -v pnpm &>/dev/null; then
  echo "Checking for outdated packages..."
  pnpm outdated -r 2>/dev/null || warning "Could not check outdated packages"
else
  warning "pnpm not found, skipping outdated check"
fi

echo ""
echo "--- Environment Checks ---"

if [[ -f .env ]]; then
  if grep -q 'change-me' .env 2>/dev/null; then
    fail "Default placeholder values found in .env"
  else
    ok "No default placeholders in .env"
  fi

  if grep -q 'OPENMOTOKO_SESSION_SECRET=$' .env 2>/dev/null || grep -q 'OPENMOTOKO_SESSION_SECRET=""' .env 2>/dev/null; then
    fail "OPENMOTOKO_SESSION_SECRET is empty"
  else
    ok "Session secret is set"
  fi
fi

echo ""
echo "--- Docker Security ---"

if command -v docker &>/dev/null; then
  if docker ps &>/dev/null; then
    running=$(docker ps --filter "name=openmotoko" --format '{{.Names}}' 2>/dev/null)
    if [[ -n "$running" ]]; then
      echo "Running containers:"
      docker ps --filter "name=openmotoko" --format '  {{.Names}}: {{.Status}}' 2>/dev/null

      for container in $running; do
        user=$(docker inspect --format '{{.Config.User}}' "$container" 2>/dev/null)
        if [[ -n "$user" ]] && [[ "$user" != "root" ]] && [[ "$user" != "0" ]]; then
          ok "$container runs as non-root user ($user)"
        else
          warning "$container may be running as root"
        fi
      done
    fi
  fi
fi

echo ""
echo "=== Audit Summary ==="
echo -e "${GREEN}Passed: $pass${NC}  ${YELLOW}Warnings: $warn${NC}  ${RED}Failed: $fail${NC}"

if [[ $fail -gt 0 ]]; then
  exit 1
fi
