# Phase 1 -- Foundation

**Zeitraum:** Woche 1-8
**Ziel:** Funktionierender Agent der ueber die Web-UI und Telegram bedienbar ist.

---

## Voraussetzungen

- Node.js 22 LTS installiert
- pnpm 9 installiert
- SQLite3 verfuegbar auf dem System
- LLM API Key (mindestens einer: Anthropic, OpenAI, Google, oder lokales Ollama)

---

## Woche 1 -- Monorepo Setup + LLM Abstraction

### 1.1 Monorepo Scaffolding

**Dateien:**

```
openmotoko/
  package.json                 # pnpm workspace root
  pnpm-workspace.yaml          # workspace definition
  tsconfig.base.json           # shared TS config
  biome.json                   # linter + formatter
  .npmrc                       # strict-peer-dependencies=true
  .gitignore
  packages/
    core/
      package.json
      tsconfig.json
      src/
        index.ts
    api/
      package.json
      tsconfig.json
      src/
        index.ts
    web/
      package.json
      tsconfig.json
      src/
        main.tsx
    desktop/
      package.json
      src-tauri/
    skill-sdk/
      package.json
      tsconfig.json
      src/
        index.ts
    skills/
      package.json
      tsconfig.json
      src/
    channels/
      telegram/
        package.json
        tsconfig.json
        src/
          index.ts
```

**Dependencies (root):**

| Package | Version |
|---|---|
| pnpm | 9.x (global) |
| typescript | 5.x |
| @biomejs/biome | latest |

**tsconfig.base.json Kernkonfiguration:**

- `target`: `ES2022`
- `module`: `Node16`
- `moduleResolution`: `Node16`
- `strict`: `true`
- `skipLibCheck`: `true`
- `outDir`: `dist`
- `rootDir`: `src`
- `declaration`: `true`
- `composite`: `true` (fuer Project References)

**pnpm-workspace.yaml:**

```yaml
packages:
  - "packages/*"
  - "packages/channels/*"
```

**Akzeptanzkriterien:**

- [ ] `pnpm install` laeuft fehlerfrei durch
- [ ] `pnpm -r build` kompiliert alle Packages
- [ ] `pnpm biome check .` zeigt keine Fehler
- [ ] Jedes Package kann Typen aus anderen Packages importieren via Workspace-Protocol

### 1.2 LLM Abstraction Layer

**Package:** `packages/core`

**Dateien:**

```
packages/core/src/
  llm/
    types.ts              # LLMProvider, LLMMessage, LLMResponse, LLMConfig
    router.ts             # Provider-Selection, Fallback-Logic
    providers/
      anthropic.ts        # Claude via @anthropic-ai/sdk
      openai.ts           # GPT-4o, o1, o3 via openai
      google.ts           # Gemini via @google/generative-ai
      ollama.ts           # Lokale Modelle via ollama
      index.ts            # Re-exports
    streaming.ts          # Unified streaming interface (AsyncIterableIterator)
    cost-tracker.ts       # Token-zaehlung pro Request, kumulierte Kosten
```

**Dependencies (packages/core):**

| Package | Version |
|---|---|
| @anthropic-ai/sdk | latest |
| openai | latest |
| @google/generative-ai | latest |
| ollama | latest |
| zod | latest |

**Typen-Spezifikation:**

```typescript
interface LLMProvider {
  id: string
  name: string
  chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>
  stream(messages: LLMMessage[], config: LLMConfig): AsyncIterableIterator<LLMChunk>
  listModels(): Promise<ModelInfo[]>
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
}

interface LLMConfig {
  model: string
  temperature?: number
  maxTokens?: number
  tools?: ToolDefinition[]
  systemPrompt?: string
}

interface LLMResponse {
  content: string
  toolCalls: ToolCall[]
  usage: { inputTokens: number; outputTokens: number; cost: number }
  model: string
  provider: string
}
```

**Router-Logik:**

- Konfigurierbare Provider-Reihenfolge
- Automatischer Fallback bei Provider-Fehler (Rate Limit, Timeout)
- Model-Aliase: `"fast"` -> Provider-spezifisches schnelles Modell, `"smart"` -> bestes verfuegbares

**Akzeptanzkriterien:**

- [ ] Jeder Provider kann einzeln instanziiert und getestet werden
- [ ] Streaming funktioniert mit allen vier Providern
- [ ] Router waehlt korrekten Provider basierend auf Config
- [ ] Cost-Tracker berechnet korrekte Kosten pro Provider/Modell
- [ ] Alle Typen sind exportiert und von anderen Packages nutzbar

---

## Woche 2 -- Fastify API + SQLite Schema

### 2.1 Fastify REST + WebSocket Server

**Package:** `packages/api`

**Dateien:**

```
packages/api/src/
  server.ts               # Fastify-Instanz, Plugin-Registration
  plugins/
    auth.ts               # Session Token Auth (HTTP-only Cookies)
    websocket.ts          # @fastify/websocket, Event Broadcasting
    cors.ts               # CORS Config
    rate-limit.ts         # @fastify/rate-limit
  routes/
    conversations.ts      # CRUD Conversations
    messages.ts           # Send Message, Get History
    activity.ts           # Activity Feed Stream
    settings.ts           # App Settings, LLM Config
    skills.ts             # Skill Management
    channels.ts           # Channel Config
    auth.ts               # Login, Session
  events/
    bus.ts                # In-Process EventEmitter, typisierte Events
    types.ts              # AgentEvent, ActivityEvent, MessageEvent
  middleware/
    validate.ts           # Zod Schema Validation
```

**Dependencies (packages/api):**

| Package | Version |
|---|---|
| fastify | 5.x |
| @fastify/websocket | latest |
| @fastify/cookie | latest |
| @fastify/cors | latest |
| @fastify/rate-limit | latest |
| @fastify/static | latest |
| zod | latest |

**Event-Bus-Typen:**

```typescript
type AgentEvent =
  | { type: 'message:received'; conversationId: string; message: LLMMessage }
  | { type: 'message:sent'; conversationId: string; message: LLMMessage }
  | { type: 'tool:called'; conversationId: string; tool: string; input: unknown }
  | { type: 'tool:result'; conversationId: string; tool: string; output: unknown }
  | { type: 'llm:stream'; conversationId: string; chunk: string }
  | { type: 'llm:complete'; conversationId: string; response: LLMResponse }
  | { type: 'cost:updated'; totalToday: number; lastRequest: number }
  | { type: 'skill:activated'; skillId: string }
  | { type: 'channel:message'; channel: string; from: string; content: string }
```

**REST API Endpoints:**

| Method | Path | Beschreibung |
|---|---|---|
| GET | `/api/conversations` | Liste aller Conversations |
| POST | `/api/conversations` | Neue Conversation erstellen |
| GET | `/api/conversations/:id` | Conversation mit Messages |
| POST | `/api/conversations/:id/messages` | Nachricht senden |
| GET | `/api/activity` | Activity Feed (paginated) |
| WS | `/ws` | WebSocket fuer Live-Events |
| GET | `/api/settings` | Aktuelle Settings |
| PUT | `/api/settings` | Settings aktualisieren |
| GET | `/api/skills` | Installierte Skills |
| POST | `/api/skills/:id/toggle` | Skill aktivieren/deaktivieren |
| GET | `/api/channels` | Konfigurierte Channels |
| POST | `/api/auth/login` | Session erstellen |
| POST | `/api/auth/logout` | Session beenden |

**Akzeptanzkriterien:**

- [ ] Server startet auf konfiguriertem Port
- [ ] WebSocket-Verbindung empfaengt alle AgentEvents in Echtzeit
- [ ] Rate Limiting blockt nach konfiguriertem Threshold
- [ ] Auth Middleware schuetzt alle Routes ausser `/api/auth/login`
- [ ] Zod-Validation gibt strukturierte Fehlermeldungen zurueck

### 2.2 SQLite Schema + Drizzle ORM

**Package:** `packages/core` (DB ist Teil des Core)

**Dateien:**

```
packages/core/src/
  db/
    client.ts             # better-sqlite3 Instanz, Drizzle-Wrapper
    schema.ts             # Alle Tabellen
    migrations/           # Drizzle-generierte Migrations
    seed.ts               # Default-Daten (Settings, Core Skills)
```

**Dependencies (zusaetzlich in packages/core):**

| Package | Version |
|---|---|
| drizzle-orm | latest |
| drizzle-kit | latest (devDependency) |
| better-sqlite3 | latest |
| @types/better-sqlite3 | latest (devDependency) |

**Schema:**

```
conversations
  id            TEXT PRIMARY KEY (nanoid)
  title         TEXT
  model         TEXT
  systemPrompt  TEXT
  channelId     TEXT NULLABLE (FK channels.id)
  createdAt     INTEGER (unix ms)
  updatedAt     INTEGER (unix ms)

messages
  id            TEXT PRIMARY KEY (nanoid)
  conversationId TEXT (FK conversations.id)
  role          TEXT ('user' | 'assistant' | 'tool' | 'system')
  content       TEXT
  toolCalls     TEXT NULLABLE (JSON)
  toolResults   TEXT NULLABLE (JSON)
  tokens        INTEGER
  cost          REAL
  model         TEXT
  provider      TEXT
  createdAt     INTEGER (unix ms)

activity
  id            TEXT PRIMARY KEY (nanoid)
  type          TEXT (AgentEvent type)
  conversationId TEXT NULLABLE
  channel       TEXT NULLABLE
  skillId       TEXT NULLABLE
  data          TEXT (JSON payload)
  createdAt     INTEGER (unix ms)

skills
  id            TEXT PRIMARY KEY
  name          TEXT
  version       TEXT
  description   TEXT
  manifest      TEXT (JSON)
  enabled       INTEGER (0/1)
  installedAt   INTEGER (unix ms)

channels
  id            TEXT PRIMARY KEY
  type          TEXT ('telegram' | 'whatsapp' | 'discord' | 'signal' | 'slack' | 'imessage')
  config        TEXT (JSON, encrypted)
  enabled       INTEGER (0/1)
  createdAt     INTEGER (unix ms)

settings
  key           TEXT PRIMARY KEY
  value         TEXT (JSON)
  updatedAt     INTEGER (unix ms)

cost_log
  id            TEXT PRIMARY KEY (nanoid)
  conversationId TEXT NULLABLE
  provider      TEXT
  model         TEXT
  inputTokens   INTEGER
  outputTokens  INTEGER
  cost          REAL
  createdAt     INTEGER (unix ms)
```

**Akzeptanzkriterien:**

- [ ] `drizzle-kit generate` erzeugt Migration ohne Fehler
- [ ] `drizzle-kit migrate` erstellt alle Tabellen
- [ ] CRUD-Operationen fuer alle Tabellen funktionieren typsicher
- [ ] Seed-Script fuellt Default-Settings und Core-Skill-Manifests

---

## Woche 3-4 -- React App + Chat Screen + Activity Feed

### 3.1 React App Grundstruktur

**Package:** `packages/web`

**Dateien:**

```
packages/web/
  index.html
  vite.config.ts
  tailwind.config.ts
  postcss.config.ts
  src/
    main.tsx
    app.tsx               # Router Setup, Layout
    styles/
      globals.css         # Design Tokens (CSS Custom Properties), Font Imports
      animations.css      # Scanlines, Glitch, Terminal Cursor
    lib/
      api.ts              # Fetch-Wrapper, Typen
      ws.ts               # WebSocket Client, Reconnect-Logic
      store.ts            # Zustand Root Store
    hooks/
      use-websocket.ts    # WebSocket Hook mit Auto-Reconnect
      use-conversations.ts
      use-activity.ts
    layouts/
      root-layout.tsx     # Sidebar + Main Content Area
    pages/
      chat.tsx
      activity.tsx
      skills.tsx
      settings.tsx
    components/
      sidebar/
        sidebar.tsx
        nav-item.tsx
        conversation-list.tsx
      chat/
        message-bubble.tsx
        thought-process.tsx
        input-bar.tsx
        model-badge.tsx
      activity/
        activity-feed.tsx
        activity-item.tsx
        status-badge.tsx
      shared/
        hud-overlay.tsx
        glass-panel.tsx
        terminal-cursor.tsx
        glitch-text.tsx
```

**Dependencies (packages/web):**

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

**Routing:**

| Path | Page | Beschreibung |
|---|---|---|
| `/` | Redirect -> `/chat` | |
| `/chat` | Chat | Letzte Conversation oder neue |
| `/chat/:id` | Chat | Spezifische Conversation |
| `/activity` | Activity Feed | Live-Dashboard |
| `/skills` | Skills | Skill-Verwaltung |
| `/settings` | Settings | App-Konfiguration |

**Akzeptanzkriterien:**

- [ ] `pnpm --filter web dev` startet Vite Dev Server
- [ ] Alle Design Tokens aus STYLEGUIDE.md als CSS Custom Properties geladen
- [ ] Alle vier Fonts (JetBrains Mono, Space Mono, IBM Plex Mono, Fira Code) geladen
- [ ] Routing zwischen allen vier Seiten funktioniert
- [ ] Sidebar zeigt Conversation-Liste
- [ ] Dark-only Theme, kein Flash of Light

### 3.2 Chat Screen mit Thought Process

**Kernkomponenten:**

`message-bubble.tsx`
- Rendert User- und Assistant-Nachrichten
- Assistant-Nachrichten haben expandierbaren Thought-Process-Bereich
- Markdown-Rendering fuer Assistant-Content
- Code-Blocks mit Syntax-Highlighting

`thought-process.tsx`
- Chronologische Liste aller Tool-Calls einer Antwort
- Pro Tool-Call: Tool-Name, Input-Parameter (collapsible JSON), Output (collapsible), Dauer, Status-Badge
- Default: collapsed. Ein Klick expanded alle.
- Animiert mit Framer Motion (height auto-animation)

`input-bar.tsx`
- Textarea mit Auto-Resize
- Send-Button mit `--ghost` Accent
- Model-Badge zeigt aktuelles Modell
- Cmd+Enter zum Senden
- Terminal-Cursor-Blink waehrend Agent arbeitet

**WebSocket-Integration:**
- Neue Nachrichten kommen als `message:sent` Events
- Streaming via `llm:stream` Events, Chunks werden live an die letzte Assistant-Message angehaengt
- Tool-Calls via `tool:called` und `tool:result` Events fuellen den Thought-Process

**Akzeptanzkriterien:**

- [ ] Nachrichten werden in Echtzeit via WebSocket angezeigt
- [ ] LLM-Streaming zeigt Text zeichenweise an
- [ ] Thought-Process ist per Default collapsed, expandiert smooth
- [ ] Tool-Calls zeigen Name, Input, Output, Dauer
- [ ] Input-Bar hat Auto-Resize und Keyboard-Shortcut

### 3.3 Activity Feed

**Kernkomponenten:**

`activity-feed.tsx`
- Chronologische Liste aller Agent-Aktionen
- Auto-Scroll bei neuen Events (deaktivierbar durch manuelles Hochscrollen)
- Drei Kennzahlen oben: Kosten heute ($), aktive Conversations, System-Status
- Filter: Channel, Skill, Zeitraum

`activity-item.tsx`
- Kompakte Zeile: Timestamp | Icon | Event-Type | Kurzbeschreibung
- Expandierbar: volles Input/Output JSON
- Farbkodiert nach Event-Typ (ghost=LLM, edge=Tool, alive=Success, pulse=Error)

`status-badge.tsx`
- Wiederverwendbar: `running` | `success` | `error` | `pending`
- Farben aus Design Tokens

**Akzeptanzkriterien:**

- [ ] Feed zeigt Events in Echtzeit via WebSocket
- [ ] Kosten-Kennzahl aktualisiert sich live
- [ ] Filter funktionieren kombiniert
- [ ] Events sind expandierbar mit Detail-Ansicht

---

## Woche 4 -- Telegram Channel

### 4.1 Telegram Adapter

**Package:** `packages/channels/telegram`

**Dateien:**

```
packages/channels/telegram/src/
  index.ts                # Export: TelegramChannel
  adapter.ts              # grammy Bot Setup, Message Handling
  types.ts                # TelegramConfig, Mapped Message Types
```

**Dependencies:**

| Package | Version |
|---|---|
| grammy | latest |

**Interface:**

```typescript
interface ChannelAdapter {
  id: string
  type: string
  start(config: ChannelConfig): Promise<void>
  stop(): Promise<void>
  sendMessage(chatId: string, content: string): Promise<void>
  onMessage(handler: (msg: IncomingMessage) => void): void
}
```

Jeder Channel implementiert dieses Interface. Der Channel Manager im Core registriert Adapter und routet eingehende Nachrichten an den Agent.

**Akzeptanzkriterien:**

- [ ] Bot empfaengt Nachrichten und leitet sie an den Agent Core weiter
- [ ] Agent-Antworten werden zurueck an Telegram gesendet
- [ ] Conversation-Mapping: ein Telegram-Chat = eine OpenMotoko-Conversation
- [ ] Activity Feed zeigt Telegram-Events

---

## Woche 5-6 -- Core Skills

### 5.1 Skill Runtime

**Package:** `packages/core`

**Dateien:**

```
packages/core/src/
  skills/
    runtime.ts            # Skill-Process-Pool, IPC Bridge
    loader.ts             # Manifest lesen, Capabilities validieren
    registry.ts           # Installierte Skills verwalten
    types.ts              # SkillManifest, SkillCapabilities, ToolDefinition
```

**Architektur:**

- Skills laufen als separate Node.js Child-Processes
- Kommunikation ueber `child_process.fork()` mit typisiertem IPC
- Runtime injiziert nur die APIs die das Manifest erlaubt
- Jeder Skill exponiert `ToolDefinition[]` die dem LLM als Tools bereitgestellt werden

### 5.2 Core Skills

**Package:** `packages/skills`

Jeder Skill ist ein eigenes Verzeichnis mit `manifest.json` und `index.ts`:

```
packages/skills/src/
  shell-executor/
    manifest.json
    index.ts
  filesystem/
    manifest.json
    index.ts
  web-fetch/
    manifest.json
    index.ts
  web-search/
    manifest.json
    index.ts
  browser-control/
    manifest.json
    index.ts
  calendar/
    manifest.json
    index.ts
  email/
    manifest.json
    index.ts
  github/
    manifest.json
    index.ts
  timer-cron/
    manifest.json
    index.ts
```

| Skill | Tool-Funktionen | Zusaetzliche Dependencies |
|---|---|---|
| shell-executor | `execute_command` | - |
| filesystem | `read_file`, `write_file`, `list_directory` | - |
| web-fetch | `fetch_url`, `extract_content` | - |
| web-search | `search_web` | - |
| browser-control | `navigate`, `click`, `type`, `screenshot` | playwright |
| calendar | `list_events`, `create_event` | googleapis / apple-calendar TBD |
| email | `read_inbox`, `send_email` | nodemailer, imapflow |
| github | `list_issues`, `create_pr`, `get_file` | @octokit/rest |
| timer-cron | `set_timer`, `create_schedule` | node-cron |

**Akzeptanzkriterien:**

- [ ] Jeder Skill laeuft als isolierter Child-Process
- [ ] Manifest-Capabilities werden vom Runtime enforced
- [ ] LLM kann jeden Skill als Tool aufrufen
- [ ] Tool-Results werden korrekt an den LLM zurueckgegeben
- [ ] Activity Feed zeigt alle Skill-Ausfuehrungen

---

## Woche 7 -- Docker + Deployment

### 7.1 Docker Compose

**Dateien:**

```
docker/
  Dockerfile              # Multi-stage: build all packages, serve API + static web
  docker-compose.yml      # Production: openmotoko + caddy
  docker-compose.dev.yml  # Development: hot-reload, volume mounts
  Caddyfile               # Reverse Proxy, Auto-TLS
  .env.example            # Alle Environment Variables dokumentiert
```

**Services (Production):**

| Service | Image | Ports |
|---|---|---|
| openmotoko | Custom (Node 22 Alpine) | 3457 (intern) |
| caddy | caddy:2-alpine | 80, 443 |

**Environment Variables (.env.example):**

```
OPENMOTOKO_PORT=3457
OPENMOTOKO_HOST=0.0.0.0
OPENMOTOKO_DB_PATH=./data/openmotoko.db
OPENMOTOKO_SESSION_SECRET=<random>
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
OLLAMA_HOST=http://localhost:11434
TELEGRAM_BOT_TOKEN=
DOMAIN=openmotoko.example.com
```

### 7.2 Setup + Audit Scripts

**Dateien:**

```
scripts/
  setup.sh                # VPS One-Command Setup: Docker, Compose, .env, start
  audit.sh                # Security: offene Ports, File Permissions, Dependencies
  dev.sh                  # Lokales Dev: pnpm install, DB migrate, start all
```

**Akzeptanzkriterien:**

- [ ] `docker compose up` startet den gesamten Stack
- [ ] Caddy holt automatisch TLS-Zertifikat fuer konfigurierte Domain
- [ ] Web-UI erreichbar ueber HTTPS
- [ ] WebSocket funktioniert durch Caddy hindurch
- [ ] `setup.sh` laeuft auf frischem Ubuntu 24.04 VPS durch
- [ ] `audit.sh` prueft offene Ports, Datei-Permissions, veraltete Dependencies

---

## Woche 8 -- Alpha Testing

### Testszenarien

| Szenario | Beschreibung | Akzeptanz |
|---|---|---|
| Lokaler Desktop | API + Web auf localhost, Chat-Conversation fuehren | Agent antwortet, Thought-Process sichtbar |
| VPS Deployment | Docker Compose auf VPS, Zugriff ueber Domain | HTTPS funktioniert, WebSocket stabil |
| Telegram Integration | Nachricht an Bot senden, Antwort empfangen | Message erscheint in Web-UI Activity Feed |
| Multi-Provider | Conversation mit Claude starten, zu GPT-4o wechseln | Beide Provider antworten korrekt |
| Skill Execution | Agent soll eine Datei lesen (filesystem Skill) | Tool-Call sichtbar im Thought-Process |
| Cost Tracking | 10 Nachrichten senden, Kosten pruefen | Activity Feed zeigt kumulierte Kosten |

---

## Technische Entscheidungen Phase 1

| Entscheidung | Wahl | Begruendung |
|---|---|---|
| Monorepo-Tool | pnpm Workspaces | Kein Turborepo/Nx-Overhead, pnpm reicht fuer die Groesse |
| Linter/Formatter | Biome | Schneller als ESLint+Prettier, ein Tool fuer beides |
| DB | SQLite via better-sqlite3 | Kein externer DB-Server, ideal fuer lokale Deployments |
| ORM | Drizzle | Type-safe, leichtgewichtig, native SQLite-Unterstuetzung |
| API Framework | Fastify 5 | Schema-Validation eingebaut, Plugin-System, schneller als Express |
| State Management | Zustand | Minimal, kein Boilerplate, perfekt fuer mittelgrosse Apps |
| Styling | TailwindCSS 4 + CSS Custom Properties | Design Tokens als CSS Vars, Tailwind fuer Utility-Klassen |
| IDs | nanoid | Kurz, URL-safe, kein UUID-Overhead |
