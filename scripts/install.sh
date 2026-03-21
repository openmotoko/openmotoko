#!/usr/bin/env bash
# OpenMotoko Installer
# Usage: curl -fsSL https://openmotoko.ai/install | bash
#
# Environment variables (optional, skip interactive prompts):
#   OPENMOTOKO_LLM_KEY       - LLM provider API key
#   OPENMOTOKO_PASSWORD       - Admin password (min 8 chars)
#   OPENMOTOKO_SESSION_SECRET - Session secret (auto-generated if unset)
#   OPENMOTOKO_INSTALL_DIR    - Install directory (default: ~/.openmotoko)
#   OPENMOTOKO_NONINTERACTIVE - Set to 1 to skip all prompts

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors & helpers
# ---------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { printf "${CYAN}[info]${NC}  %s\n" "$*"; }
ok()    { printf "${GREEN}[ok]${NC}    %s\n" "$*"; }
warn()  { printf "${YELLOW}[warn]${NC}  %s\n" "$*"; }
err()   { printf "${RED}[error]${NC} %s\n" "$*" >&2; }
fatal() { err "$@"; exit 1; }

banner() {
  printf "\n${CYAN}${BOLD}"
  cat <<'ART'
   ____                   __  __       _        _
  / __ \                 |  \/  |     | |      | |
 | |  | |_ __   ___ _ __ | \  / | ___ | |_ ___ | | _____
 | |  | | '_ \ / _ \ '_ \| |\/| |/ _ \| __/ _ \| |/ / _ \
 | |__| | |_) |  __/ | | | |  | | (_) | || (_) |   < (_) |
  \____/| .__/ \___|_| |_|_|  |_|\___/ \__\___/|_|\_\___/
        | |
        |_|
ART
  printf "${NC}\n"
  info "Self-hosted AI agent platform"
  echo ""
}

# ---------------------------------------------------------------------------
# Platform detection
# ---------------------------------------------------------------------------

INSTALL_DIR="${OPENMOTOKO_INSTALL_DIR:-$HOME/.openmotoko}"
NONINTERACTIVE="${OPENMOTOKO_NONINTERACTIVE:-0}"

detect_platform() {
  OS="$(uname -s)"
  ARCH="$(uname -m)"

  case "$OS" in
    Linux*)  PLATFORM="linux" ;;
    Darwin*) PLATFORM="macos" ;;
    *)       fatal "Unsupported operating system: $OS" ;;
  esac

  case "$ARCH" in
    x86_64|amd64) ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *)             fatal "Unsupported architecture: $ARCH" ;;
  esac

  ok "Detected ${PLATFORM} ${ARCH}"
}

# ---------------------------------------------------------------------------
# Dependency checks
# ---------------------------------------------------------------------------

command_exists() {
  command -v "$1" &>/dev/null
}

check_node() {
  if command_exists node; then
    local ver
    ver="$(node --version | sed 's/v//' | cut -d. -f1)"
    if [[ "$ver" -ge 24 ]]; then
      ok "Node.js $(node --version)"
      return 0
    else
      warn "Node.js $(node --version) found, but v24+ is required"
    fi
  fi
  return 1
}

install_node() {
  info "Installing Node.js 24 via nvm..."

  if [[ ! -d "$HOME/.nvm" ]]; then
    info "Installing nvm..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  fi

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck source=/dev/null
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  nvm install 24
  nvm use 24
  nvm alias default 24

  ok "Node.js $(node --version) installed via nvm"
}

check_pnpm() {
  if command_exists pnpm; then
    local ver
    ver="$(pnpm --version | cut -d. -f1)"
    if [[ "$ver" -ge 10 ]]; then
      ok "pnpm $(pnpm --version)"
      return 0
    else
      warn "pnpm $(pnpm --version) found, but v10+ is required"
    fi
  fi
  return 1
}

install_pnpm() {
  info "Installing pnpm 10..."
  corepack enable
  corepack prepare pnpm@latest --activate
  ok "pnpm $(pnpm --version) installed"
}

check_git() {
  if command_exists git; then
    ok "git $(git --version | cut -d' ' -f3)"
    return 0
  fi
  return 1
}

# ---------------------------------------------------------------------------
# Secure input helpers
# ---------------------------------------------------------------------------

prompt_secret() {
  local prompt_text="$1"
  local var_name="$2"
  local min_len="${3:-0}"
  local value=""

  if [[ "$NONINTERACTIVE" == "1" ]]; then
    return
  fi

  while true; do
    printf "${CYAN}${prompt_text}${NC} "
    read -rs value
    echo ""

    if [[ -z "$value" ]]; then
      warn "Skipped (press Enter to skip)"
      return
    fi

    if [[ "$min_len" -gt 0 && "${#value}" -lt "$min_len" ]]; then
      err "Minimum $min_len characters required. Try again."
      continue
    fi

    break
  done

  eval "$var_name=\"\$value\""
}

prompt_text() {
  local prompt_text="$1"
  local var_name="$2"
  local default_val="${3:-}"
  local value=""

  if [[ "$NONINTERACTIVE" == "1" ]]; then
    eval "$var_name=\"\$default_val\""
    return
  fi

  printf "${CYAN}${prompt_text}${NC} "
  if [[ -n "$default_val" ]]; then
    printf "[${default_val}] "
  fi
  read -r value

  if [[ -z "$value" ]]; then
    value="$default_val"
  fi

  eval "$var_name=\"\$value\""
}

generate_secret() {
  local length="${1:-64}"
  if command_exists openssl; then
    openssl rand -hex "$((length / 2))"
  elif [[ -r /dev/urandom ]]; then
    head -c "$((length / 2))" /dev/urandom | od -An -tx1 | tr -d ' \n'
  else
    # Last resort: use Node.js crypto
    node -e "console.log(require('crypto').randomBytes(${length}/2).toString('hex'))"
  fi
}

# ---------------------------------------------------------------------------
# Main installation
# ---------------------------------------------------------------------------

main() {
  banner
  detect_platform

  # --- Prerequisites ---
  info "Checking prerequisites..."

  if ! check_git; then
    fatal "git is required. Install it first: https://git-scm.com/downloads"
  fi

  if ! check_node; then
    install_node
    check_node || fatal "Failed to install Node.js 24+"
  fi

  if ! check_pnpm; then
    install_pnpm
    check_pnpm || fatal "Failed to install pnpm 10+"
  fi

  echo ""

  # --- Clone or update ---
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Existing installation found at $INSTALL_DIR"
    info "Pulling latest changes..."
    git -C "$INSTALL_DIR" pull --ff-only
    ok "Updated to latest"
  else
    info "Cloning OpenMotoko to $INSTALL_DIR..."
    git clone --depth 1 https://github.com/nichochar/openmotoko.git "$INSTALL_DIR"
    ok "Cloned to $INSTALL_DIR"
  fi

  echo ""

  # --- Build ---
  info "Installing dependencies..."
  (cd "$INSTALL_DIR" && pnpm install --frozen-lockfile)
  ok "Dependencies installed"

  info "Building..."
  (cd "$INSTALL_DIR" && pnpm build)
  ok "Build complete"

  echo ""

  # --- Interactive setup ---
  info "Configuration"
  echo "  (Press Enter to skip optional values)"
  echo ""

  # LLM API key
  LLM_KEY="${OPENMOTOKO_LLM_KEY:-}"
  if [[ -z "$LLM_KEY" ]]; then
    prompt_secret "LLM API key (Anthropic/OpenAI/Google):" LLM_KEY
  fi

  # Admin password
  ADMIN_PW="${OPENMOTOKO_PASSWORD:-}"
  if [[ -z "$ADMIN_PW" ]]; then
    prompt_secret "Admin password (min 8 chars):" ADMIN_PW 8
  fi
  if [[ -n "$ADMIN_PW" && "${#ADMIN_PW}" -lt 8 ]]; then
    fatal "Admin password must be at least 8 characters"
  fi

  # Session secret (auto-generate)
  SESSION_SECRET="${OPENMOTOKO_SESSION_SECRET:-}"
  if [[ -z "$SESSION_SECRET" ]]; then
    SESSION_SECRET="$(generate_secret 64)"
    ok "Generated session secret (64 chars)"
  fi

  # Port
  PORT=""
  prompt_text "Port:" PORT "3457"

  echo ""

  # --- Write .env ---
  ENV_FILE="$INSTALL_DIR/.env"
  info "Writing configuration to $ENV_FILE"

  cat > "$ENV_FILE" <<ENVEOF
# OpenMotoko Configuration
# Generated by install.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Server
PORT=${PORT:-3457}
HOST=0.0.0.0

# Security
OPENMOTOKO_PASSWORD=${ADMIN_PW:-}
OPENMOTOKO_SESSION_SECRET=${SESSION_SECRET}

# LLM Provider Keys (fill in the ones you use)
ANTHROPIC_API_KEY=${LLM_KEY:-}
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=

# Data directory
OPENMOTOKO_DATA_DIR=${INSTALL_DIR}/data
ENVEOF

  # Secure file permissions
  chmod 600 "$ENV_FILE"
  ok "Configuration written (mode 600)"

  # Ensure data directory
  mkdir -p "$INSTALL_DIR/data"
  chmod 700 "$INSTALL_DIR/data"
  ok "Data directory created (mode 700)"

  echo ""

  # --- Optional: system service ---
  INSTALL_SERVICE=""
  prompt_text "Install as system service? (y/N):" INSTALL_SERVICE "N"

  if [[ "${INSTALL_SERVICE,,}" == "y" || "${INSTALL_SERVICE,,}" == "yes" ]]; then
    install_service
  fi

  echo ""

  # --- Done ---
  printf "${GREEN}${BOLD}"
  echo "============================================"
  echo "  OpenMotoko installed successfully!"
  echo "============================================"
  printf "${NC}\n"

  echo "  Install dir:  $INSTALL_DIR"
  echo "  Config file:  $ENV_FILE"
  echo "  Data dir:     $INSTALL_DIR/data"
  echo ""
  echo "  Start manually:"
  echo "    cd $INSTALL_DIR && pnpm start"
  echo ""
  echo "  Then open:"
  printf "    ${CYAN}http://localhost:${PORT:-3457}${NC}\n"
  echo ""

  if [[ -z "$ADMIN_PW" ]]; then
    printf "  ${YELLOW}[!] No admin password set — set OPENMOTOKO_PASSWORD in .env${NC}\n"
  fi

  if [[ -z "$LLM_KEY" ]]; then
    printf "  ${YELLOW}[!] No LLM key set — add one to .env before chatting${NC}\n"
  fi

  echo ""
}

# ---------------------------------------------------------------------------
# System service installation
# ---------------------------------------------------------------------------

install_service() {
  if [[ "$PLATFORM" == "linux" ]]; then
    install_systemd_service
  elif [[ "$PLATFORM" == "macos" ]]; then
    install_launchd_service
  fi
}

install_systemd_service() {
  local service_file="/etc/systemd/system/openmotoko.service"

  if [[ $EUID -ne 0 ]]; then
    warn "Systemd service requires root. Generating file for manual install."
    service_file="$INSTALL_DIR/openmotoko.service"
  fi

  # Resolve node and pnpm paths
  local node_bin
  node_bin="$(command -v node)"
  local pnpm_bin
  pnpm_bin="$(command -v pnpm)"

  cat > "$service_file" <<SVCEOF
[Unit]
Description=OpenMotoko AI Agent Platform
After=network.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${INSTALL_DIR}
ExecStart=${pnpm_bin} start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=${INSTALL_DIR}/.env

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${INSTALL_DIR}/data
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SVCEOF

  if [[ $EUID -eq 0 ]]; then
    systemctl daemon-reload
    systemctl enable openmotoko
    systemctl start openmotoko
    ok "Systemd service installed and started"
    echo "  Status:  systemctl status openmotoko"
    echo "  Logs:    journalctl -u openmotoko -f"
  else
    ok "Service file written to $service_file"
    echo "  Install with: sudo cp $service_file /etc/systemd/system/ && sudo systemctl enable --now openmotoko"
  fi
}

install_launchd_service() {
  local plist_dir="$HOME/Library/LaunchAgents"
  local plist_file="$plist_dir/ai.openmotoko.agent.plist"

  mkdir -p "$plist_dir"

  local pnpm_bin
  pnpm_bin="$(command -v pnpm)"

  cat > "$plist_file" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openmotoko.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>${pnpm_bin}</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${INSTALL_DIR}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>${INSTALL_DIR}/data/openmotoko.log</string>
    <key>StandardErrorPath</key>
    <string>${INSTALL_DIR}/data/openmotoko.err</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
</dict>
</plist>
PLISTEOF

  launchctl load "$plist_file"
  ok "LaunchAgent installed and loaded"
  echo "  Unload:  launchctl unload $plist_file"
  echo "  Logs:    tail -f $INSTALL_DIR/data/openmotoko.log"
}

# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

main "$@"
