![OpenMotoko](openmotoko-lockup-static.svg)

> _"The Net is vast and infinite."_
> Motoko Kusanagi

[Documentation](https://openmotoko.ai/docs/) | [Quick Start](#quick-start) | [Features](#features) | [Architecture](#architecture) | [Skills](#skills) | [Channels](#channels) | [Deployment](#deployment) | [Writing a Skill](#writing-a-skill) | [API](#api) | [Environment Variables](#environment-variables)

---

OpenMotoko is a self-hosted AI agent that lives on your machine or server. It can run shell commands, read and write files, browse the web, send emails, manage your calendar, interact with GitHub, and search the internet. You talk to it through Telegram, WhatsApp, Discord, Slack, Signal, iMessage, Google Chat, Microsoft Teams, or the built-in web chat.

It ships with a full UI: live activity feed, visual permission controls, cost tracking, a skill marketplace, and a Canvas workspace for artifacts. No YAML files. No terminal-only setup.

Local-first. MIT licensed.

**[openmotoko.ai](https://openmotoko.ai)** | **[Full Documentation](https://openmotoko.ai/docs/)**

## Features

- **9 built-in skills** : Shell, filesystem, web fetch, web search, browser control, calendar, email, GitHub, timer/cron
- **14 messaging channels** : Telegram, WhatsApp, Discord, Slack, Signal, iMessage, Google Chat, Microsoft Teams, Matrix, Feishu/Lark, LINE, IRC, Mattermost, plus WebChat built in
- **Multi-LLM support** : Anthropic Claude (Haiku 4.5 / Sonnet 4.6 / Opus 4.6), OpenAI, Google Gemini, Ollama for local models, or any OpenAI-compatible endpoint
- **Multi-agent orchestration** : The primary agent can spawn sub-agents for parallel specialized tasks
- **Proactive agent** : Pulse scheduler, intent system with approve/edit/reject, autonomy dial with trust levels, immutable action log with HMAC tamper detection
- **Layered memory** : Working memory (sliding window + summary), semantic memory (facts/preferences), episodic memory (interaction history), procedural memory (learned skills)
- **RAG pipeline** : Hybrid vector + BM25 search, cross-encoder reranking, semantic chunking
- **MCP support** : Both client (connect to external MCP servers) and server (expose tools via MCP)
- **Real-time UI** : Live activity feed, WebSocket events, cost dashboard, budget controls
- **Skill marketplace** : Browse, install, rate community skills from the registry
- **Canvas / A2UI** : Agent-generated artifacts (code, markdown, HTML, Mermaid diagrams) rendered visually
- **Desktop app** : Tauri 2.0 for macOS, Windows, Linux with system tray, global shortcuts, auto-update
- **PWA** : Install as a progressive web app on any device
- **Tailscale integration** : Expose your instance securely via `tailscale serve`
- **Docker sandbox** : Run untrusted commands in isolated containers
- **Security hardening** : Session expiry, environment sandboxing, path validation, command blocking, rate limiting, CSP headers, XSS sanitization, sensitive data redaction

## Quick Start

### What You Need

| Tool    | Version     | Check           | Install                                                  |
| ------- | ----------- | --------------- | -------------------------------------------------------- |
| Node.js | 24 or newer | `node -v`       | [nodejs.org](https://nodejs.org) or `nvm install 24`     |
| pnpm    | 10 or newer | `pnpm -v`       | `corepack enable && corepack prepare pnpm@10 --activate` |
| Git     | any         | `git --version` | [git-scm.com](https://git-scm.com)                       |

Node.js 24 is required. Older versions will cause build errors because the project uses features only available in v24+.

### Step 1: Clone and enter the project

```bash
git clone https://github.com/openmotoko/openmotoko.git
cd openmotoko
```

### Step 2: Create your environment file

```bash
cp docker/.env.example .env
```

Open the `.env` file in any text editor. You need at least one LLM API key. Without one, the agent cannot generate responses.

Pick one (or more) and fill in your key:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

or

```
OPENAI_API_KEY=sk-your-key-here
```

or

```
GOOGLE_AI_API_KEY=AIza-your-key-here
```

or, if you run [Ollama](https://ollama.com) locally, no key is needed. The agent will connect to `http://localhost:11434` by default.

### Step 3: Install dependencies and build

```bash
pnpm install
pnpm -r build
```

`pnpm install` downloads all packages. `pnpm -r build` compiles every package in the monorepo. Both commands must succeed before you can start the app.

### Step 4: Start the development servers

```bash
pnpm dev
```

This starts two servers at once:

| Server | URL                     | Purpose                                       |
| ------ | ----------------------- | --------------------------------------------- |
| API    | `http://localhost:3457` | Fastify backend (REST + WebSocket)            |
| Web    | `http://localhost:5173` | React frontend (auto-reloads on file changes) |

Open `http://localhost:5173` in your browser. You will see the onboarding flow where you can configure your agent.

If you only want one of the two servers:

```bash
pnpm dev:api
pnpm dev:web
```

### Step 5 (production): Set a password and session secret

For production use, you must set these two variables in your `.env` file:

```
OPENMOTOKO_PASSWORD=pick-a-strong-password
OPENMOTOKO_SESSION_SECRET=a-random-string-at-least-64-characters-long
```

Without `OPENMOTOKO_PASSWORD`, the API server will refuse to start.

### Common Problems

| Problem                                    | What to do                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm: command not found`                  | Run `corepack enable` first. It ships with Node.js.                                                                           |
| `Unsupported engine: wanted node >=24.0.0` | Your Node.js is too old. Run `nvm install 24` to upgrade.                                                                     |
| Build fails with TypeScript errors         | Run `pnpm install` again, then `pnpm -r build`. If it still fails, delete `node_modules` and run `pnpm install` from scratch. |
| `.env` keys not working                    | The `.env` file must be in the project root for development. For Docker, it goes in the `docker/` folder.                     |
| Port 3457 already in use                   | Set `OPENMOTOKO_PORT` to another port in your `.env`.                                                                         |
| Blank white page in browser                | Make sure `pnpm -r build` completed without errors before running `pnpm dev`.                                                 |
| `OPENMOTOKO_PASSWORD is not set`           | Set `OPENMOTOKO_PASSWORD` in your `.env`. The API server requires it.                                                         |

## Architecture

```
CLIENT LAYER        Web App (React 19) / Desktop (Tauri 2) / PWA
        |
    WebSocket + REST API
        |
GATEWAY LAYER       Fastify 5 with Auth, Rate Limit, Event Bus
        |
CORE LAYER          LLM Router / Skill Runtime (IPC) / Channel Manager / Agent Manager / Memory Manager
        |
DATA LAYER          SQLite (Drizzle ORM)
```

### Monorepo Structure

```
openmotoko/
  packages/
    core/               LLM abstraction, DB, skill runtime, event bus, memory, MCP, sandbox, pulse, intents, autonomy, RAG
    api/                Fastify REST + WebSocket server
    web/                React 19 PWA (Vite 7 + TailwindCSS 4 + Radix UI)
    skill-sdk/          Manifest schema, capability types, IPC bridge, test harness, templates
    skills/             9 built-in skills (shell, filesystem, web-fetch, web-search, browser, calendar, email, github, timer)
    cli/                openmotoko CLI (channels, tailscale, doctor, onboarding, pairing, configure)
    desktop/            Tauri 2 desktop app (macOS, Windows, Linux)
    landing/            Landing page
    registry-server/    Skill registry (publish, search, ratings, security scanning)
    create-skill/       npx create-openmotoko-skill scaffolding CLI
    channels/
      telegram/         grammy
      whatsapp/         Baileys
      discord/          discord.js
      slack/            Bolt SDK
      signal/           signal-cli
      imessage/         BlueBubbles
      google-chat/      Google Chat API
      teams/            Microsoft Bot Framework
      webchat/          Built-in WebSocket
      matrix/           matrix-js-sdk
      feishu/           Feishu/Lark HTTP API
      line/             LINE Messaging API
      irc/              TCP socket
      mattermost/       Mattermost WebSocket API
  docker/               Dockerfile, docker-compose.yml, Caddyfile, .env.example
  .github/workflows/    CI, desktop builds, skill validation
```

### Tech Stack

| Layer           | Technology                              | Version |
| --------------- | --------------------------------------- | ------- |
| Runtime         | Node.js                                 | 24      |
| Language        | TypeScript                              | 5.8     |
| Package Manager | pnpm                                    | 10      |
| Backend         | Fastify                                 | 5.7     |
| Database        | SQLite via better-sqlite3 + Drizzle ORM | 0.45    |
| Validation      | Zod                                     | 4.3     |
| LLM (Anthropic) | @anthropic-ai/sdk                       | 0.78    |
| LLM (OpenAI)    | openai                                  | 6.22    |
| LLM (Google)    | @google/generative-ai                   | 0.24    |
| LLM (Local)     | ollama                                  | 0.6     |
| MCP             | @modelcontextprotocol/sdk               | 1.26    |
| Frontend        | React                                   | 19.2    |
| Build Tool      | Vite                                    | 7.3     |
| CSS             | TailwindCSS                             | 4.2     |
| State           | Zustand                                 | 5.0     |
| Data Fetching   | TanStack Query                          | 5.90    |
| Animation       | Framer Motion                           | 11.18   |
| UI Primitives   | Radix UI                                | latest  |
| Icons           | Lucide React                            | 0.575   |
| Routing         | React Router                            | 7.13    |
| Desktop         | Tauri                                   | 2.10    |
| Lint / Format   | Biome                                   | 2.4     |
| Testing         | Vitest                                  | 4.0     |
| Infra           | Docker Compose + Caddy 2                | latest  |

### LLM Model Aliases

The agent uses three model aliases. You can switch between them per conversation in the UI or via the `model` field in API requests.

| Alias      | Provider  | Model             | Best for                            |
| ---------- | --------- | ----------------- | ----------------------------------- |
| `fast`     | Anthropic | claude-haiku-4-5  | Quick responses, low cost           |
| `balanced` | Anthropic | claude-sonnet-4-6 | General purpose                     |
| `smart`    | Anthropic | claude-opus-4-6   | Complex reasoning, multi-step tasks |

You can also use any OpenAI-compatible endpoint by setting `GENERIC_LLM_BASE_URL` in your `.env`.

## Skills

Skills are isolated child processes that communicate with the agent over typed IPC. Each skill declares its capabilities in a `manifest.json`. The agent never has implicit access to your system. Every action requires an explicit capability grant.

| Skill           | Tools                                       | Capabilities | Risk   |
| --------------- | ------------------------------------------- | ------------ | ------ |
| shell-executor  | `execute_command`                           | shell        | MEDIUM |
| filesystem      | `read_file`, `write_file`, `list_directory` | filesystem   | MEDIUM |
| web-fetch       | `fetch_url`, `extract_content`              | network      | LOW    |
| web-search      | `search_web`                                | network      | LOW    |
| browser-control | `navigate`, `click`, `type`, `screenshot`   | network      | HIGH   |
| calendar        | `list_events`, `create_event`               | network      | LOW    |
| email           | `read_inbox`, `send_email`                  | network, env | MEDIUM |
| github          | `list_issues`, `create_pr`, `get_file`      | network, env | LOW    |
| timer-cron      | `set_timer`, `create_schedule`              | none         | LOW    |

### Writing a Skill

The fastest way to scaffold a new skill:

```bash
npx create-openmotoko-skill my-skill
```

This walks you through an interactive setup (name, description, template, capabilities) and generates a ready-to-build project with tests included.

To create one manually:

```typescript
import { readFile } from "node:fs/promises";
import { defineSkill } from "@openmotoko/skill-sdk";

const raw = await readFile(
  new URL("./manifest.json", import.meta.url),
  "utf-8"
);
const manifest = JSON.parse(raw);

export default defineSkill(manifest, async (toolName, args, ctx) => {
  ctx.log(`Executing ${toolName}`);
  const input = args.input as string;
  return { success: true, data: { result: input.toUpperCase() } };
});
```

### Testing a Skill Locally

The SDK ships with a test harness that simulates the agent runtime:

```typescript
import { SkillTestHarness } from "@openmotoko/skill-sdk";
import mySkill from "./index.js";

const harness = new SkillTestHarness(mySkill, { MY_API_KEY: "test" });
const result = await harness.runTool("my_tool", { input: "hello" });
console.log(result);
```

### Skill Marketplace

Community skills are published to the OpenMotoko Skill Registry. The registry server runs automated security scans on every submission, checking for `eval()`, undeclared capabilities, known vulnerability patterns, and more. Skills that fail the scan (grade F) are rejected. Users can rate and review skills from within the app.

## Channels

| Channel         | Library       | Config Variables                          |
| --------------- | ------------- | ----------------------------------------- |
| Telegram        | grammy        | `TELEGRAM_BOT_TOKEN`                      |
| WhatsApp        | Baileys       | `WHATSAPP_SESSION_PATH`                   |
| Discord         | discord.js    | `DISCORD_BOT_TOKEN`                       |
| Slack           | Bolt SDK      | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`      |
| Signal          | signal-cli    | `SIGNAL_CLI_PATH`, `SIGNAL_PHONE_NUMBER`  |
| iMessage        | BlueBubbles   | `BLUEBUBBLES_URL`, `BLUEBUBBLES_PASSWORD` |
| Google Chat     | Chat API      | Google Cloud credentials                  |
| Microsoft Teams | Bot Framework | Teams app registration                    |
| WebChat         | built-in      | None (always available)                   |
| Matrix          | matrix-js-sdk | Homeserver URL + credentials              |
| Feishu/Lark     | HTTP API      | App ID + App Secret                       |
| LINE            | Messaging API | Channel access token + secret             |
| IRC             | TCP socket    | Server, port, nick, channel               |
| Mattermost      | WebSocket API | Server URL + token                        |

### Channel Plugins

You can add third-party channels as npm packages. Either configure them in `openmotoko.config.ts`:

```typescript
export default {
  channelPlugins: [
    {
      packageName: "openmotoko-channel-matrix",
      config: { homeserver: "https://matrix.org" },
    },
  ],
};
```

Or install them from the Settings UI under "Channel Plugins".

## API

All endpoints are served from the API server (default `http://localhost:3457`).

| Method | Endpoint                          | Description                                           |
| ------ | --------------------------------- | ----------------------------------------------------- |
| POST   | `/api/conversations`              | Create a new conversation                             |
| GET    | `/api/conversations`              | List all conversations                                |
| GET    | `/api/conversations/:id`          | Get a conversation with its messages                  |
| POST   | `/api/conversations/:id/messages` | Send a message (triggers the agent loop)              |
| GET    | `/api/activity`                   | Activity feed (paginated)                             |
| WS     | `/ws`                             | Real-time events via WebSocket                        |
| GET    | `/api/settings`                   | Get app settings                                      |
| PUT    | `/api/settings`                   | Update app settings                                   |
| GET    | `/api/skills`                     | List installed skills                                 |
| POST   | `/api/skills/:id/toggle`          | Enable or disable a skill                             |
| GET    | `/api/registry/search`            | Search the skill marketplace                          |
| POST   | `/api/registry/install`           | Install a skill from the registry                     |
| POST   | `/api/registry/rate`              | Rate a skill                                          |
| GET    | `/api/channels`                   | List channel configurations                           |
| GET    | `/api/agents`                     | List active agents (including sub-agents)             |
| DELETE | `/api/agents/:id`                 | Kill a running sub-agent                              |
| GET    | `/api/costs/today`                | Today's cost summary                                  |
| GET    | `/api/costs/history`              | Cost history over time                                |
| GET    | `/api/artifacts`                  | List artifacts for a conversation                     |
| GET    | `/api/tailscale/status`           | Tailscale connection status                           |
| POST   | `/api/auth/login`                 | Log in (creates a session)                            |
| POST   | `/api/auth/logout`                | Log out (destroys the session)                        |
| GET    | `/api/health`                     | Health check                                          |
| POST   | `/v1/chat/completions`            | OpenAI-compatible chat endpoint (streaming supported) |
| GET    | `/v1/models`                      | OpenAI-compatible model list                          |

The last two endpoints let you use OpenMotoko as a drop-in replacement for OpenAI in any tool that supports custom endpoints.

## Deployment

### Option 1: Local Development

Run `pnpm dev` and open `http://localhost:5173`. Everything runs on your machine. Your data stays in a local SQLite file at `./data/openmotoko.db`. No Docker needed.

### Option 2: Docker on a VPS

Docker Compose with Caddy for automatic HTTPS:

```bash
ssh your-server
git clone https://github.com/openmotoko/openmotoko.git
cd openmotoko
cp docker/.env.example docker/.env
```

Edit `docker/.env` with your API keys, passwords, and domain:

```
ANTHROPIC_API_KEY=sk-ant-your-key
OPENMOTOKO_PASSWORD=your-strong-password
OPENMOTOKO_SESSION_SECRET=a-random-64-char-string
DOMAIN=agent.yourdomain.com
```

Then start:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Caddy will automatically obtain a TLS certificate for your domain. The app will be available at `https://agent.yourdomain.com`.

Without a `DOMAIN` set, the app is available at `http://your-server-ip:3457`.

### Option 3: Fly.io

The repo includes a `fly.toml` preconfigured for the Frankfurt region:

```bash
fly launch
fly secrets set ANTHROPIC_API_KEY=sk-ant-xxx OPENMOTOKO_PASSWORD=xxx OPENMOTOKO_SESSION_SECRET=xxx
fly deploy
```

### Option 4: Hybrid (VPS + Desktop)

Run the backend on a VPS so messaging channels (Telegram, WhatsApp, etc.) stay connected 24/7. Use the Tauri desktop app or browser via Tailscale to access the UI securely from any device.

On the VPS:

```bash
tailscale serve --bg 3457
```

Then connect from any device on your tailnet.

## Environment Variables

Create a `.env` file in the project root for development, or in `docker/.env` for Docker.

### Required

| Variable                                                                   | When       | Description                                                              |
| -------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| At least one of `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY` | Always     | LLM API key. Without one, the agent cannot respond. Ollama needs no key. |
| `OPENMOTOKO_PASSWORD`                                                      | Production | Login password. The API server will not start without it in production.  |
| `OPENMOTOKO_SESSION_SECRET`                                                | Production | Random string (64+ chars) used to encrypt sessions.                      |

### Optional (General)

| Variable               | Default                  | Description                                     |
| ---------------------- | ------------------------ | ----------------------------------------------- |
| `OPENMOTOKO_PORT`      | `3457`                   | API server port                                 |
| `OPENMOTOKO_HOST`      | `0.0.0.0`                | API server bind address                         |
| `OPENMOTOKO_DB_PATH`   | `./data/openmotoko.db`   | Path to the SQLite database file                |
| `OLLAMA_HOST`          | `http://localhost:11434` | URL of your Ollama server                       |
| `GENERIC_LLM_BASE_URL` | none                     | Base URL for any OpenAI-compatible LLM endpoint |
| `DOMAIN`               | none                     | Your domain for automatic HTTPS via Caddy       |
| `NODE_ENV`             | none                     | Set to `production` on servers                  |

### Optional (Channels)

| Variable                | Channel  | Description                                     |
| ----------------------- | -------- | ----------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`    | Telegram | Token from @BotFather                           |
| `DISCORD_BOT_TOKEN`     | Discord  | Token from the Discord Developer Portal         |
| `SLACK_BOT_TOKEN`       | Slack    | `xoxb-` token from your Slack App               |
| `SLACK_APP_TOKEN`       | Slack    | `xapp-` token for Socket Mode                   |
| `SIGNAL_CLI_PATH`       | Signal   | Path to the signal-cli binary on your system    |
| `SIGNAL_PHONE_NUMBER`   | Signal   | Phone number registered with Signal             |
| `WHATSAPP_SESSION_PATH` | WhatsApp | Directory where WhatsApp session data is stored |
| `BLUEBUBBLES_URL`       | iMessage | URL of your BlueBubbles server                  |
| `BLUEBUBBLES_PASSWORD`  | iMessage | BlueBubbles server password                     |

### Optional (Tailscale)

| Variable                  | Default | Description                               |
| ------------------------- | ------- | ----------------------------------------- |
| `TAILSCALE_SERVE_ENABLED` | `false` | Enable Tailscale Serve integration        |
| `TAILSCALE_AUTH_ENABLED`  | `false` | Use Tailscale identity for authentication |

## Design

Ghost in the Shell x Cyberpunk aesthetic. Dark-only. Monospace typography. HUD-style UI with clip-path angles, scan-line overlays, and glow accents.

| Token      | Hex       | Role           |
| ---------- | --------- | -------------- |
| `--void`   | `#0A0E1A` | Background     |
| `--shell`  | `#0D1526` | Surface        |
| `--ghost`  | `#00F0FF` | Primary accent |
| `--edge`   | `#FF6B35` | Warning        |
| `--pulse`  | `#FF2D78` | Error          |
| `--alive`  | `#39FF14` | Success        |
| `--chrome` | `#E8F4F8` | Text           |

## Running Tests

```bash
pnpm test
```

For watch mode during development:

```bash
pnpm test:watch
```

For a coverage report:

```bash
pnpm test:coverage
```

## License

MIT
