---
name: openmotoko-builder
description: Guides implementation of the OpenMotoko personal AI agent project. Enforces monorepo conventions, tech stack versions, design system tokens, and phased development workflow. Use when working on any file in the openmotoko workspace, creating new packages, implementing features, or making UI changes.
---

# OpenMotoko Builder

## Project Context

OpenMotoko is a personal AI agent with a Ghost in the Shell / Cyberpunk-themed UI. Monorepo with pnpm workspaces. TypeScript everywhere. Dark-only interface.

## Before Starting Any Task

1. Identify which phase the task belongs to
2. Read the relevant phase document from `phases/PHASE{1-4}.md`
3. For any UI work, read `STYLEGUIDE.md`
4. For package versions and configs, read [tech-stack.md](tech-stack.md)
5. Follow the acceptance criteria defined in the phase document

## Monorepo Structure

```
openmotoko/
  packages/
    core/           # Agent Runtime, LLM Abstraction, DB, Skill Runtime
    api/            # Fastify REST + WebSocket, Auth, Events
    web/            # React PWA (Vite + Tailwind + Radix)
    desktop/        # Tauri 2.0 Wrapper
    skill-sdk/      # Manifest Schema, Capability Types, IPC Bridge
    skills/         # Core Skills (Shell, FS, Browser, etc.)
    channels/
      telegram/     # grammy
      whatsapp/     # Baileys
      discord/      # discord.js
      signal/       # signal-cli Bridge
      slack/        # Bolt SDK
      imessage/     # BlueBubbles
  docker/
  scripts/
```

## Conventions

### TypeScript

- Strict mode always on
- Use `type` imports (`import type { X }`)
- Prefer interfaces over type aliases for object shapes
- Use Zod for runtime validation at API boundaries
- IDs: nanoid (not UUID)
- Dates: Unix milliseconds (number), not Date objects in DB/API

### Package Dependencies

- Always check [tech-stack.md](tech-stack.md) for pinned versions before adding dependencies
- Use workspace protocol for internal deps: `"@openmotoko/core": "workspace:*"`
- All packages scope under `@openmotoko/`

### File Organization

- One export per file for components
- Co-locate types with implementation (not a global `types/` folder)
- Index files only for re-exports, no logic
- Tests next to source: `foo.ts` -> `foo.test.ts`

### CSS / Styling

- All colors via CSS custom properties from STYLEGUIDE.md
- Never hardcode hex values in components
- Use Tailwind utility classes referencing design tokens
- Font assignment by context: display for headings, ui for labels, body for content, code for code
- Animations: CSS for simple, Framer Motion for complex/interactive
- Always respect `prefers-reduced-motion`

### API Design

- RESTful routes under `/api/`
- WebSocket at `/ws` for real-time events
- Request validation via Zod schemas registered with Fastify
- Error responses: `{ error: string, code: string, details?: unknown }`
- All list endpoints support pagination: `?limit=20&offset=0`

### Database

- Drizzle ORM with better-sqlite3
- Schema in `packages/core/src/db/schema.ts`
- Migrations via drizzle-kit
- JSON fields stored as TEXT, parsed at application layer
- Timestamps as INTEGER (Unix ms)

## Workflow by Task Type

**Adding a new API endpoint:**
1. Read `phases/PHASE1.md` section 2.1 for endpoint patterns
2. Create route in `packages/api/src/routes/`
3. Define Zod schemas for request/response
4. Add WebSocket event type if real-time updates needed
5. Register route in server plugin

**Adding a new UI page/component:**
1. Read `STYLEGUIDE.md` for design tokens and component patterns
2. Create component in appropriate directory under `packages/web/src/`
3. Use design tokens via Tailwind classes (bg-void, text-chrome, etc.)
4. Use Radix UI for interactive primitives (dialogs, dropdowns, tooltips)
5. Add Framer Motion animations following presets in STYLEGUIDE.md

**Adding a new Skill:**
1. Read `phases/PHASE1.md` section 5.2 for skill structure
2. Create directory under `packages/skills/src/`
3. Write `manifest.json` declaring capabilities
4. Implement tool functions matching ToolDefinition interface
5. Export via skill-sdk types

**Adding a new Channel:**
1. Read `phases/PHASE2.md` for channel patterns
2. Create package under `packages/channels/`
3. Implement `ChannelAdapter` interface
4. Register in Channel Manager
5. Add config schema for Settings UI

**Modifying the database schema:**
1. Edit `packages/core/src/db/schema.ts`
2. Run `drizzle-kit generate` to create migration
3. Run `drizzle-kit migrate` to apply
4. Update affected API routes and types

## Phase Reference

| Phase | File | Focus |
|---|---|---|
| 0 | `phases/PHASE0.md` | Landing Page: openmotoko.ai, Hero, Features, Waitlist, Logo, SEO |
| 1 | `phases/PHASE1.md` | Monorepo, Core, API, DB, Web UI, Chat, Activity, Telegram, Skills, Docker |
| 2 | `phases/PHASE2.md` | Permissions UI, Skill Library, All Channels, Onboarding, Costs, Scheduler |
| 3 | `phases/PHASE3.md` | Tauri Desktop, PWA, Auto-Update, Accessibility, Windows, Launch |
| 4 | `phases/PHASE4.md` | Community Registry, SDK, Channel Plugins, Multi-Agent, Mobile |
