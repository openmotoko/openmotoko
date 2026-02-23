# Contributing to OpenMotoko

Thanks for your interest in contributing. This guide covers everything you need to get started.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 24+ |
| pnpm | 10+ |
| Git | any |

Enable pnpm if you have not already:

```bash
corepack enable && corepack prepare pnpm@10 --activate
```

## Setup

```bash
git clone https://github.com/openmotoko/openmotoko.git
cd openmotoko
pnpm install
pnpm -r build
```

Verify everything works:

```bash
pnpm test
pnpm check
```

## Project Structure

This is a pnpm monorepo. All packages live under `packages/`:

| Package | Purpose |
|---------|---------|
| `core` | LLM abstraction, DB, skill runtime, memory, MCP, sandbox, events |
| `api` | Fastify REST + WebSocket server |
| `web` | React 19 frontend |
| `skill-sdk` | SDK for building skills |
| `skills` | 9 built-in skills |
| `cli` | CLI tool |
| `desktop` | Tauri 2 desktop app |
| `landing` | Landing page |
| `registry-server` | Skill registry |
| `create-skill` | Scaffolding CLI |
| `channels/*` | Messaging channel adapters |

## Development Workflow

Start the dev servers:

```bash
pnpm dev
```

This runs the API server on `http://localhost:3457` and the web UI on `http://localhost:5173`.

Run only the part you are working on:

```bash
pnpm dev:api
pnpm dev:web
```

## Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting. Check your code before submitting:

```bash
pnpm check
```

Auto-fix what Biome can fix:

```bash
pnpm check:fix
```

Key rules:

- Use template literals instead of string concatenation
- No non-null assertions (`!`). Use optional chaining (`?.`) or default values.
- Remove unused imports
- All variables must have a type or an initial value (no implicit `any`)
- No comments that just narrate what the code does

## Testing

Run the full test suite:

```bash
pnpm test
```

Watch mode for the file you are working on:

```bash
pnpm test:watch
```

Coverage report:

```bash
pnpm test:coverage
```

Tests use [Vitest](https://vitest.dev/). Place test files next to the source files with a `.test.ts` suffix.

## Making Changes

1. Fork the repository
2. Create a branch from `main`: `git checkout -b my-feature`
3. Make your changes
4. Run `pnpm check` and `pnpm test` to make sure nothing is broken
5. Commit with a clear message describing what you changed and why
6. Push your branch and open a pull request

## Commit Messages

Write commit messages that explain the *why*, not the *what*. The diff already shows what changed.

Good:
- `fix session expiry not resetting on activity`
- `add Matrix channel adapter for self-hosted homeservers`

Bad:
- `update file`
- `fix bug`
- `changes`

## Pull Requests

- Keep PRs focused. One feature or fix per PR.
- Include a short description of what the PR does and why.
- If the PR adds a new feature, include a test.
- If the PR changes behavior, update the README if relevant.
- Make sure CI passes before requesting review.

## Adding a New Skill

The easiest way:

```bash
npx create-openmotoko-skill my-skill
```

If adding a built-in skill to `packages/skills/src/`:

1. Create a new directory under `packages/skills/src/`
2. Add a `manifest.json` declaring tools and capabilities
3. Add an `index.ts` using `defineSkill` from `@openmotoko/skill-sdk`
4. Register it in `packages/skills/src/index.ts`
5. Add a test

## Adding a New Channel

1. Create a new directory under `packages/channels/` (e.g. `packages/channels/my-channel/`)
2. Add `package.json`, `tsconfig.json`, and `src/adapter.ts`
3. Implement the adapter following the pattern in existing channels
4. Register the channel type in `packages/core/src/channels/types.ts`
5. Add the necessary environment variables to `docker/.env.example`

## Reporting Bugs

Open a GitHub issue with:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Node.js version (`node -v`) and OS
- Relevant logs or error messages

## Security Issues

Do not open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
