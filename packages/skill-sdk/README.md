# @openmotoko/skill-sdk

SDK for building [OpenMotoko](https://openmotoko.ai) skills.

## Install

```bash
pnpm add @openmotoko/skill-sdk
```

## Quick Start

```typescript
import { defineSkill } from '@openmotoko/skill-sdk'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { readFile } from 'node:fs/promises'

const manifest: SkillManifest = JSON.parse(
  await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

export const mySkill = defineSkill(manifest, async (toolName, args, ctx) => {
  ctx.log(`Running tool: ${toolName}`)

  return {
    success: true,
    data: { message: 'Hello from my skill!' },
  }
})
```

## Manifest

Every skill needs a `manifest.json`:

```json
{
  "id": "my-skill",
  "name": "My Skill",
  "version": "0.1.0",
  "description": "What this skill does",
  "author": "your-name",
  "capabilities": {},
  "tools": [
    {
      "name": "my_tool",
      "description": "What this tool does",
      "inputSchema": {
        "type": "object",
        "properties": {
          "input": { "type": "string", "description": "The input value" }
        },
        "required": ["input"]
      }
    }
  ]
}
```

## API

### `defineSkill(manifest, handler)`

Creates a skill from a manifest and a handler function.

- `manifest` - parsed `SkillManifest` object
- `handler(toolName, args, ctx)` - async function called when a tool is invoked
  - `toolName` - name of the tool being called
  - `args` - input arguments as `Record<string, unknown>`
  - `ctx` - `SkillContext` with `log()` and `env` access

Returns a `ToolResult` with `{ success, data?, error? }`.

### Types

- `SkillManifest` - full skill manifest schema
- `ToolDefinition` - single tool definition
- `SkillCapabilities` - capability declarations (filesystem, shell, network, env)
- `SkillHandler` - handler function type
- `SkillContext` - context passed to handlers
- `ToolResult` - return type from handlers

### Helpers

- `parseJsonInput(raw, schema)` - validate input with a Zod schema
- `formatToolResult(data)` - wrap data in a success result
- `formatError(err)` - wrap an error in a failure result
- `validateInput(args, schema)` - validate and return typed input or throw

## Scaffold a New Skill

```bash
npx create-openmotoko-skill my-skill
```

## Docs

[openmotoko.ai/docs](https://openmotoko.ai/docs/guides/writing-a-skill/)
