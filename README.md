<p align="center">
  <img src="packages/landing/public/favicon.svg" width="80" alt="OpenMotoko">
</p>

<h1 align="center">OpenMotoko</h1>
<p align="center"><strong>Personal AI Agent -- Built for Humans</strong></p>
<p align="center">
  <em>"The Net is vast and infinite."</em> -- Major Motoko Kusanagi
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> --
  <a href="#what-can-it-do">Features</a> --
  <a href="#architecture">Architecture</a> --
  <a href="#skills">Skills</a> --
  <a href="#channels">Channels</a> --
  <a href="#deployment">Deployment</a> --
  <a href="#writing-a-skill">Write a Skill</a>
</p>

---

OpenMotoko is a self-hosted AI agent that can run shell commands, read/write files, browse the web, send emails, manage your calendar, interact with GitHub, and search the internet. It works across Telegram, WhatsApp, Discord, Slack, Signal, iMessage, Google Chat, Microsoft Teams, and a built-in web chat.

Unlike most agent frameworks, OpenMotoko ships with a full UI: live activity feed, visual permission controls, cost tracking, a skill marketplace, and a Canvas workspace for artifacts. No YAML files. No terminal-only setup.

Local-first. Open source. MIT licensed.

## What Can It Do

- **9 built-in skills** -- Shell, filesystem, web fetch, web search, browser control, calendar, email, GitHub, timer/cron
- **10 messaging channels** -- Telegram, WhatsApp, Discord, Slack, Signal, iMessage, Google Chat, Microsoft Teams, WebChat, plus a plugin interface for custom channels
- **Multi-LLM support** -- Anthropic Claude (Haiku 4.5, Sonnet 4.6, Opus 4.6), OpenAI, Google Gemini, Ollama (local models)
- **Multi-agent orchestration** -- Primary agent can spawn sub-agents for parallel specialized tasks
- **Real-time UI** -- Live activity feed, WebSocket events, cost dashboard, budget controls
- **Skill marketplace** -- Browse, install, rate community skills from the registry
- **Canvas / A2UI** -- Agent-generated artifacts (code, markdown, HTML, Mermaid diagrams) rendered visually
- **Desktop app** -- Tauri 2.0 for macOS, Windows, Linux with system tray, global shortcuts, auto-update
- **PWA** -- Install as a progressive web app on any device
- **Tailscale integration** -- Expose your instance securely via `tailscale serve`

## Quick Start

### Prerequisites

| Tool | Version | How to check | How to install |
|------|---------|-------------|----------------|
| Node.js | **22+** | `node -v` | [nodejs.org](https://nodejs.org) or `nvm install 22` |
| pnpm | **9+** | `pnpm -v` | `corepack enable && corepack prepare pnpm@9 --activate` |
| Git | any | `git --version` | [git-scm.com](https://git-scm.com) |

> **Important:** Node.js 22 is required. Versions below 22 will cause build errors.

### Step-by-step Setup

```bash
git clone https://github.com/openmotoko/openmotoko.git
cd openmotoko
```

Copy the example environment file and add at least one LLM API key:

```bash
cp docker/.env.example .env
```

Open `.env` in any editor and set your API key(s):

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

You need **at least one** of: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, or a running Ollama instance. Without any key, the agent cannot generate responses.

Install dependencies and build:

```bash
pnpm install
pnpm -r build
```

Start the development servers:

```bash
pnpm dev
```

This starts two servers:

| Server | URL | What it does |
|--------|-----|-------------|
| API | `http://localhost:3457` | Fastify backend with REST + WebSocket |
| Web | `http://localhost:5173` | React frontend (auto-reloads on changes) |

Open **http://localhost:5173** in your browser. You should see the onboarding flow.

### Individual Servers

```bash
pnpm dev:api    # Only the API server on port 3457
pnpm dev:web    # Only the web UI on port 5173
```

### Docker (production)

```bash
cp docker/.env.example docker/.env
# Edit docker/.env with your API keys and secrets
docker compose -f docker/docker-compose.yml up -d
```

The app will be available at `http://your-server:3457`.

For automatic HTTPS with a custom domain, the Docker setup includes Caddy:

```bash
# Set your domain in docker/.env
DOMAIN=agent.yourdomain.com

docker compose -f docker/docker-compose.yml up -d
```

### Troubleshooting

| Problem | Solution |
|---------|----------|
| `pnpm: command not found` | Run `corepack enable` first (comes with Node.js) |
| `Unsupported engine: wanted node >=22.0.0` | Upgrade Node.js to v22+ (`nvm install 22`) |
| Build fails with TypeScript errors | Run `pnpm install` again, then `pnpm -r build` |
| `ANTHROPIC_API_KEY` not working | Make sure the `.env` file is in the project root, not inside `docker/` |
| Port 3457 already in use | Change `OPENMOTOKO_PORT` in your `.env` |
| White/blank page in browser | Make sure `pnpm -r build` completed without errors |

## Architecture

```
CLIENT LAYER        Web App (React 19) / Desktop (Tauri 2) / PWA
        |
    WebSocket + REST API
        |
GATEWAY LAYER       Fastify 5 -- Auth, Rate Limit, Event Bus
        |
CORE LAYER          LLM Router -- Skill Runtime (IPC) -- Channel Manager -- Agent Manager
        |
DATA LAYER          SQLite (Drizzle ORM)
```

### Monorepo Structure

```
openmotoko/
  packages/
    core/               LLM abstraction, DB, skill runtime, event bus, multi-agent, channels
    api/                Fastify REST + WebSocket server
    web/                React 19 PWA (Vite 7 + TailwindCSS 4 + Radix UI)
    skill-sdk/          Manifest schema, capability types, IPC bridge, test harness, templates
    skills/             9 built-in skills
    cli/                openmotoko CLI tool (channels, tailscale, doctor, onboarding)
    desktop/            Tauri 2.0 desktop app (macOS, Windows, Linux)
    landing/            openmotoko.ai landing page
    registry-server/    Skill registry server (publish, search, ratings, security scanning)
    create-skill/       npx create-openmotoko-skill scaffolding CLI
    channels/
      telegram/         grammy adapter
      whatsapp/         Baileys adapter
      discord/          discord.js adapter
      slack/            Bolt SDK adapter
      signal/           signal-cli adapter
      imessage/         BlueBubbles adapter
      google-chat/      Google Chat API adapter
      teams/            Microsoft Teams adapter
      webchat/          Built-in WebSocket chat adapter
  docker/               Dockerfile, Compose, Caddyfile
  .github/workflows/    CI, desktop build, skill validation, registry publish
```

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 22 LTS |
| Language | TypeScript | 5.8 |
| Package Manager | pnpm | 9.15 |
| Backend | Fastify | 5.7 |
| Database | SQLite via better-sqlite3 + Drizzle ORM | 0.45 |
| Validation | Zod | 4.3 |
| LLM -- Anthropic | @anthropic-ai/sdk | 0.78 |
| LLM -- OpenAI | openai | 6.22 |
| LLM -- Google | @google/generative-ai | 0.24 |
| LLM -- Local | ollama | 0.6 |
| Frontend | React | 19.2 |
| Build Tool | Vite | 7.3 |
| CSS | TailwindCSS | 4.2 |
| State | Zustand | 5.0 |
| Data Fetching | TanStack Query | 5.90 |
| Animation | Framer Motion | 11.18 |
| UI Primitives | Radix UI | latest |
| Icons | Lucide React | 0.575 |
| Routing | React Router | 7.13 |
| Desktop | Tauri | 2.0 |
| Lint / Format | Biome | 2.4 |
| Infra | Docker Compose + Caddy 2 | latest |

### LLM Model Aliases

| Alias | Provider | Model |
|-------|----------|-------|
| `fast` | Anthropic | claude-haiku-4-5 |
| `balanced` | Anthropic | claude-sonnet-4-6 |
| `smart` | Anthropic | claude-opus-4-6 |

Set the default model per conversation in the UI or via `model` field in the API.

## Skills

Skills run as **isolated child processes** communicating over typed IPC. Each skill declares capabilities in a `manifest.json`. The agent never has implicit access to your system.

| Skill | Tools | Capabilities | Risk |
|-------|-------|-------------|------|
| shell-executor | `execute_command` | shell | MEDIUM |
| filesystem | `read_file`, `write_file`, `list_directory` | filesystem | MEDIUM |
| web-fetch | `fetch_url`, `extract_content` | network | LOW |
| web-search | `search_web` | network | LOW |
| browser-control | `navigate`, `click`, `type`, `screenshot` | network | HIGH |
| calendar | `list_events`, `create_event` | network | LOW |
| email | `read_inbox`, `send_email` | network, env | MEDIUM |
| github | `list_issues`, `create_pr`, `get_file` | network, env | LOW |
| timer-cron | `set_timer`, `create_schedule` | -- | LOW |

### Writing a Skill

The fastest way to create a new skill:

```bash
npx create-openmotoko-skill my-skill
```

This walks you through an interactive setup (name, description, template, capabilities) and generates a ready-to-build project.

Alternatively, create one manually:

```typescript
import { readFile } from 'node:fs/promises'
import { defineSkill } from '@openmotoko/skill-sdk'

const raw = await readFile(new URL('./manifest.json', import.meta.url), 'utf-8')
const manifest = JSON.parse(raw)

export default defineSkill(manifest, async (toolName, args, ctx) => {
  ctx.log(`Executing ${toolName}`)
  const input = args.input as string
  return { success: true, data: { result: input.toUpperCase() } }
})
```

### Testing a Skill Locally

```typescript
import { SkillTestHarness } from '@openmotoko/skill-sdk'
import mySkill from './index.js'

const harness = new SkillTestHarness(mySkill, { MY_API_KEY: 'test' })
const result = await harness.runTool('my_tool', { input: 'hello' })
console.log(result)
```

### Skill Marketplace

Community skills can be published to the OpenMotoko Skill Registry. The registry server runs security scans on every submission (checks for `eval()`, undeclared capabilities, known vulnerabilities). Users can rate and review skills from within the app.

## Channels

| Channel | Library | Config Required |
|---------|---------|----------------|
| Telegram | grammy | `TELEGRAM_BOT_TOKEN` |
| WhatsApp | Baileys | `WHATSAPP_SESSION_PATH` |
| Discord | discord.js | `DISCORD_BOT_TOKEN` |
| Slack | Bolt SDK | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN` |
| Signal | signal-cli | `SIGNAL_CLI_PATH`, `SIGNAL_PHONE_NUMBER` |
| iMessage | BlueBubbles | `BLUEBUBBLES_URL`, `BLUEBUBBLES_PASSWORD` |
| Google Chat | Chat API | Google Cloud credentials |
| Microsoft Teams | Bot Framework | Teams app registration |
| WebChat | built-in | No config needed (always available) |

### Channel Plugins

Third-party channels can be installed as npm packages:

```typescript
// openmotoko.config.ts
export default {
  channelPlugins: [
    { packageName: 'openmotoko-channel-matrix', config: { homeserver: 'https://matrix.org' } }
  ]
}
```

Or install via the Settings UI under "Channel Plugins".

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/:id` | Get conversation with messages |
| POST | `/api/conversations/:id/messages` | Send message (triggers agent loop) |
| GET | `/api/activity` | Activity feed (paginated) |
| WS | `/ws` | Real-time events (all agent events streamed) |
| GET | `/api/settings` | App settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/skills` | Installed skills |
| POST | `/api/skills/:id/toggle` | Enable/disable skill |
| GET | `/api/registry/search` | Search skill marketplace |
| POST | `/api/registry/install` | Install skill from registry |
| POST | `/api/registry/rate` | Rate a skill |
| GET | `/api/channels` | Channel configs |
| GET | `/api/agents` | List active agents |
| DELETE | `/api/agents/:id` | Kill a running sub-agent |
| GET | `/api/costs/today` | Today's cost summary |
| GET | `/api/costs/history` | Cost history |
| GET | `/api/artifacts` | List artifacts for a conversation |
| GET | `/api/tailscale/status` | Tailscale connection status |
| POST | `/api/auth/login` | Create session |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/health` | Health check |

## Deployment

### Local Desktop

Run `pnpm dev` and open `http://localhost:5173`. Everything runs on your machine, no Docker needed. Your data stays in a local SQLite file.

### VPS / Cloud Server

Docker Compose with Caddy for automatic HTTPS:

```bash
ssh your-server
git clone https://github.com/openmotoko/openmotoko.git
cd openmotoko
cp docker/.env.example docker/.env
nano docker/.env   # Add your API keys, set DOMAIN, change passwords
docker compose -f docker/docker-compose.yml up -d
```

### Hybrid Setup

Backend on a VPS for 24/7 availability (so messaging channels like Telegram stay connected). Use the Tauri desktop app or browser via Tailscale to access the UI securely.

```bash
# On the VPS, enable Tailscale serve
tailscale serve --bg 3457
```

Then access your agent from any device on your tailnet.

## Environment Variables

Create a `.env` file in the project root (for development) or `docker/.env` (for Docker):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | At least one LLM key | -- | Anthropic API key |
| `OPENAI_API_KEY` | | -- | OpenAI API key |
| `GOOGLE_AI_API_KEY` | | -- | Google AI API key |
| `OLLAMA_HOST` | | `http://localhost:11434` | Ollama server URL |
| `OPENMOTOKO_PORT` | | `3457` | API server port |
| `OPENMOTOKO_HOST` | | `0.0.0.0` | API server host |
| `OPENMOTOKO_DB_PATH` | | `./data/openmotoko.db` | SQLite database path |
| `OPENMOTOKO_SESSION_SECRET` | Yes (production) | -- | Random string for session encryption |
| `OPENMOTOKO_PASSWORD` | Yes (production) | -- | Login password |
| `TELEGRAM_BOT_TOKEN` | For Telegram | -- | From @BotFather |
| `DISCORD_BOT_TOKEN` | For Discord | -- | From Discord Developer Portal |
| `SLACK_BOT_TOKEN` | For Slack | -- | `xoxb-` token from Slack App |
| `SLACK_APP_TOKEN` | For Slack | -- | `xapp-` token for Socket Mode |
| `SIGNAL_CLI_PATH` | For Signal | -- | Path to signal-cli binary |
| `SIGNAL_PHONE_NUMBER` | For Signal | -- | Phone number registered with Signal |
| `WHATSAPP_SESSION_PATH` | For WhatsApp | -- | Directory for WhatsApp session data |
| `BLUEBUBBLES_URL` | For iMessage | -- | BlueBubbles server URL |
| `BLUEBUBBLES_PASSWORD` | For iMessage | -- | BlueBubbles password |
| `DOMAIN` | For HTTPS | -- | Your domain for Caddy auto-TLS |
| `TAILSCALE_SERVE_ENABLED` | | `false` | Enable Tailscale Serve integration |
| `TAILSCALE_AUTH_ENABLED` | | `false` | Enable Tailscale identity auth |

## Design

Ghost in the Shell x Cyberpunk aesthetic. Dark-only. Monospace typography. HUD-style UI with clip-path angles, scan-line overlays, and glow accents.

| Token | Hex | Role |
|-------|-----|------|
| `--void` | `#0A0E1A` | Background |
| `--shell` | `#0D1526` | Surface |
| `--ghost` | `#00F0FF` | Primary accent |
| `--edge` | `#FF6B35` | Warning |
| `--pulse` | `#FF2D78` | Error |
| `--alive` | `#39FF14` | Success |
| `--chrome` | `#E8F4F8` | Text |

## Roadmap

- **Phase 1** -- Foundation: Monorepo, LLM abstraction, API, Web UI, Chat, Activity, Telegram, 9 skills, Docker **(done)**
- **Phase 2** -- Full parity: All channels, permissions UI, skill library, onboarding, cost tracking, scheduler **(done)**
- **Phase 3** -- Desktop: Tauri app, PWA, Canvas/A2UI, Tailscale, accessibility **(done)**
- **Phase 4** -- Community: Registry server, SDK + test harness, create-openmotoko-skill CLI, channel plugins, multi-agent **(done)**

## License

MIT
