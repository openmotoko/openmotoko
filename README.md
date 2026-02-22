<p align="center">
  <img src="packages/landing/public/favicon.svg" width="80" alt="OpenMotoko">
</p>

<h1 align="center">OpenMotoko</h1>
<p align="center"><strong>Personal AI Agent -- Built for Humans</strong></p>
<p align="center">
  <em>"The Net is vast and infinite."</em> -- Major Motoko Kusanagi
</p>

<p align="center">
  <a href="https://openmotoko.ai">Website</a> &middot;
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#skills">Skills</a> &middot;
  <a href="#deployment">Deployment</a>
</p>

---

OpenMotoko does everything an autonomous AI agent should -- shell, filesystem, browser, email, calendar, GitHub, search -- across Telegram, WhatsApp, Discord, Slack, Signal, and iMessage. The difference: it ships with a real UI. Live activity feed showing every action in real-time. Visual permission controls instead of YAML. Zero-terminal setup.

Local-first. Open source. MIT licensed.

## Quick Start

**Requirements:** Node.js 22+, pnpm 9+

```bash
git clone https://github.com/openmotoko/openmotoko.git
cd openmotoko
pnpm install
pnpm -r build
```

**Development:**

```bash
pnpm dev        # API + Web dev servers
pnpm dev:api    # API only (localhost:3457)
pnpm dev:web    # Web only (localhost:5173)
```

**Docker (production):**

```bash
cp docker/.env.example docker/.env
# edit docker/.env with your API keys
docker compose -f docker/docker-compose.yml up -d
```

## Architecture

```
CLIENT LAYER        Web App (React 19) / Desktop (Tauri) / PWA
        |
    WebSocket + REST API
        |
GATEWAY LAYER       Fastify 5 -- Auth, Rate Limit, Event Bus
        |
CORE LAYER          LLM Router -- Skill Runtime (IPC) -- Channel Manager
        |
DATA LAYER          SQLite (Drizzle ORM)
```

### Monorepo

```
openmotoko/
  packages/
    core/             LLM abstraction, DB, skill runtime, event bus
    api/              Fastify REST + WebSocket server
    web/              React PWA (Vite + TailwindCSS 4 + Radix UI)
    skill-sdk/        Manifest schema, capability types, IPC bridge
    skills/           9 core skills
    channels/
      telegram/       grammy adapter
    landing/          openmotoko.ai landing page
  docker/             Dockerfile, Compose, Caddyfile
  scripts/            setup.sh, dev.sh, audit.sh
```

### Tech Stack

| Layer | Stack |
|---|---|
| Runtime | Node.js 22 LTS, TypeScript 5, pnpm 9 |
| Backend | Fastify 5, Drizzle ORM, better-sqlite3, Zod |
| LLM | Anthropic SDK, OpenAI SDK, Google AI SDK, Ollama |
| Frontend | React 19, Vite 6, TailwindCSS 4, Zustand 5, TanStack Query 5, Framer Motion 11 |
| UI | Radix UI primitives, Lucide icons |
| Infra | Docker Compose, Caddy 2 (auto-TLS) |
| Lint | Biome |

## Skills

Skills run as isolated child processes communicating over typed IPC. Each skill declares capabilities in a `manifest.json` -- no implicit system access.

| Skill | Tools | Risk |
|---|---|---|
| shell-executor | `execute_command` | MEDIUM |
| filesystem | `read_file`, `write_file`, `list_directory` | MEDIUM |
| web-fetch | `fetch_url`, `extract_content` | LOW |
| web-search | `search_web` | LOW |
| browser-control | `navigate`, `click`, `type`, `screenshot` | HIGH |
| calendar | `list_events`, `create_event` | LOW |
| email | `read_inbox`, `send_email` | MEDIUM |
| github | `list_issues`, `create_pr`, `get_file` | LOW |
| timer-cron | `set_timer`, `create_schedule` | LOW |

### Writing a Skill

```typescript
import { defineSkill } from '@openmotoko/skill-sdk'

export const mySkill = defineSkill(manifest, async (toolName, args, ctx) => {
  ctx.log(`Executing ${toolName}`)
  // your logic
  return { success: true, data: result }
})
```

## Channels

| Channel | Package | Status |
|---|---|---|
| Telegram | grammy | Phase 1 |
| WhatsApp | Baileys | Phase 2 |
| Discord | discord.js | Phase 2 |
| Signal | signal-cli | Phase 2 |
| Slack | Bolt SDK | Phase 2 |
| iMessage | BlueBubbles | Phase 2 |

## API

| Method | Endpoint | |
|---|---|---|
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id` | Conversation with messages |
| POST | `/api/conversations/:id/messages` | Send message (triggers agent loop) |
| GET | `/api/activity` | Activity feed (paginated) |
| WS | `/ws` | Real-time events |
| GET | `/api/settings` | App settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/skills` | Installed skills |
| POST | `/api/skills/:id/toggle` | Enable/disable skill |
| GET | `/api/channels` | Channel configs |
| PUT | `/api/channels/:id` | Update channel |
| POST | `/api/auth/login` | Create session |
| POST | `/api/auth/logout` | Destroy session |

## Deployment

**Local Desktop** -- Run `pnpm dev`, open `localhost:5173`. Everything local, no Docker needed.

**VPS / EC2** -- Docker Compose with Caddy for automatic TLS. One `.env` file for all config.

```bash
# on a fresh Ubuntu VPS
curl -fsSL https://raw.githubusercontent.com/openmotoko/openmotoko/main/scripts/setup.sh | bash
```

**Hybrid** -- Backend on VPS for 24/7 availability and messaging channels. Desktop app or browser via Tailscale for UI.

## Environment Variables

```
OPENMOTOKO_PORT=3457
OPENMOTOKO_HOST=0.0.0.0
OPENMOTOKO_DB_PATH=./data/openmotoko.db
OPENMOTOKO_SESSION_SECRET=

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
OLLAMA_HOST=http://localhost:11434

TELEGRAM_BOT_TOKEN=
```

## Design

Ghost in the Shell x Cyberpunk aesthetic. Dark-only. Monospace typography (JetBrains Mono, Space Mono, IBM Plex Mono, Fira Code). HUD-style UI with clip-path angles, scan-line overlays, and glow accents.

| Token | Hex | Role |
|---|---|---|
| `--void` | `#0A0E1A` | Background |
| `--shell` | `#0D1526` | Surface |
| `--ghost` | `#00F0FF` | Primary accent |
| `--edge` | `#FF6B35` | Warning |
| `--pulse` | `#FF2D78` | Error |
| `--alive` | `#39FF14` | Success |
| `--chrome` | `#E8F4F8` | Text |

## Roadmap

- **Phase 1** -- Foundation: Monorepo, LLM abstraction, API, Web UI, Chat, Activity, Telegram, 9 skills, Docker **(done)**
- **Phase 2** -- Full parity: All channels, permissions UI, skill library, onboarding, cost tracking, scheduler
- **Phase 3** -- Desktop: Tauri app, PWA, auto-update, accessibility, public launch
- **Phase 4** -- Community: Skill registry, SDK docs, channel plugins, multi-agent

## License

MIT
