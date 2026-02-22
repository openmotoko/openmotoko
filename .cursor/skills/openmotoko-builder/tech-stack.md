# Tech Stack Reference

## Runtime

| Package | Version | Location |
|---|---|---|
| Node.js | 22 LTS | System requirement |
| pnpm | 9.x | System requirement (global) |

## Shared

| Package | Version | Location |
|---|---|---|
| typescript | 5.x | Root devDependency |
| @biomejs/biome | latest | Root devDependency |
| zod | latest | packages/core, packages/api |
| nanoid | latest | packages/core |

## Backend (packages/core)

| Package | Version |
|---|---|
| @anthropic-ai/sdk | latest |
| openai | latest |
| @google/generative-ai | latest |
| ollama | latest |
| drizzle-orm | latest |
| better-sqlite3 | latest |
| node-cron | latest |

| DevDependency | Version |
|---|---|
| drizzle-kit | latest |
| @types/better-sqlite3 | latest |

## API (packages/api)

| Package | Version |
|---|---|
| fastify | 5.x |
| @fastify/websocket | latest |
| @fastify/cookie | latest |
| @fastify/cors | latest |
| @fastify/rate-limit | latest |
| @fastify/static | latest |

## Frontend (packages/web)

| Package | Version |
|---|---|
| react | 19 |
| react-dom | 19 |
| vite | 6 |
| @vitejs/plugin-react | latest |
| tailwindcss | 4 |
| @radix-ui/react-dialog | latest |
| @radix-ui/react-dropdown-menu | latest |
| @radix-ui/react-scroll-area | latest |
| @radix-ui/react-tooltip | latest |
| @radix-ui/react-toggle | latest |
| framer-motion | 11 |
| zustand | 5 |
| @tanstack/react-query | 5 |
| react-router | latest |
| lucide-react | latest |

## Desktop (packages/desktop)

| Package | Version |
|---|---|
| @tauri-apps/cli | 2.x |
| @tauri-apps/api | 2.x |

Rust dependencies managed via `src-tauri/Cargo.toml`:

| Crate | Version |
|---|---|
| tauri | 2.x |
| tauri-plugin-notification | 2.x |
| tauri-plugin-updater | 2.x |
| tauri-plugin-shell | 2.x |

## Channels

| Package | Version | Channel |
|---|---|---|
| grammy | latest | Telegram |
| @whiskeysockets/baileys | latest | WhatsApp |
| discord.js | 14 | Discord |
| @slack/bolt | 4 | Slack |
| signal-cli | latest (system) | Signal |
| BlueBubbles | REST API | iMessage |

## Skills (additional deps)

| Package | Version | Skill |
|---|---|---|
| playwright | latest | browser-control |
| @octokit/rest | latest | github |
| nodemailer | latest | email |
| imapflow | latest | email |

## Infrastructure

| Package | Version |
|---|---|
| Docker + Compose | v2 |
| Caddy | 2.x |

---

## TSConfig Base

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "outDir": "dist",
    "rootDir": "src",
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  }
}
```

## Biome Config

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "warn"
      },
      "style": {
        "useConst": "error",
        "noNonNullAssertion": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded",
      "trailingCommas": "all"
    }
  }
}
```

## Package Naming

All packages use the `@openmotoko/` scope:

| Package | npm Name |
|---|---|
| packages/core | @openmotoko/core |
| packages/api | @openmotoko/api |
| packages/web | @openmotoko/web |
| packages/desktop | @openmotoko/desktop |
| packages/skill-sdk | @openmotoko/skill-sdk |
| packages/skills | @openmotoko/skills |
| packages/channels/telegram | @openmotoko/channel-telegram |
| packages/channels/whatsapp | @openmotoko/channel-whatsapp |
| packages/channels/discord | @openmotoko/channel-discord |
| packages/channels/signal | @openmotoko/channel-signal |
| packages/channels/slack | @openmotoko/channel-slack |
| packages/channels/imessage | @openmotoko/channel-imessage |

## Workspace Protocol

Internal dependencies use pnpm workspace protocol:

```json
{
  "dependencies": {
    "@openmotoko/core": "workspace:*",
    "@openmotoko/skill-sdk": "workspace:*"
  }
}
```

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
WHATSAPP_SESSION_PATH=./data/whatsapp
DISCORD_BOT_TOKEN=
SLACK_BOT_TOKEN=
SLACK_APP_TOKEN=
SIGNAL_CLI_PATH=/usr/local/bin/signal-cli
SIGNAL_PHONE_NUMBER=
BLUEBUBBLES_URL=
BLUEBUBBLES_PASSWORD=

DOMAIN=
```
