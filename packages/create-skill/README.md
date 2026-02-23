# create-openmotoko-skill

Scaffold a new [OpenMotoko](https://openmotoko.ai) skill project.

## Usage

```bash
npx create-openmotoko-skill my-skill
```

Or with a specific package manager:

```bash
pnpm create openmotoko-skill my-skill
```

## What It Does

The CLI walks you through creating a skill:

1. Skill name and description
2. Author
3. Capabilities (filesystem, shell, network, environment variables)
4. Tool definitions

Then generates a ready-to-develop project with:

- `manifest.json` with your tool definitions and capabilities
- `src/index.ts` with a typed handler using `@openmotoko/skill-sdk`
- `tsconfig.json` configured for ESM
- `package.json` with build scripts

## After Scaffolding

```bash
cd my-skill
pnpm install
pnpm build
```

## Docs

[openmotoko.ai/docs](https://openmotoko.ai/docs/guides/writing-a-skill/)
