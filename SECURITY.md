# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in OpenMotoko, please report it responsibly. Do not open a public GitHub issue.

**Email:** security@openmotoko.ai

Include the following in your report:

- Description of the vulnerability
- Steps to reproduce
- Affected component (e.g. `packages/core`, `packages/api`, `packages/registry-server`)
- Impact assessment (what an attacker could do)
- Suggested fix if you have one

## Response Timeline

- **Acknowledgment** within 48 hours
- **Initial assessment** within 5 business days
- **Fix or mitigation** depending on severity:
  - Critical: patch within 72 hours
  - High: patch within 7 days
  - Medium/Low: included in the next release

## Disclosure

We follow coordinated disclosure. Once a fix is released, we will credit you in the release notes (unless you prefer to remain anonymous).

## Scope

The following are in scope:

- Authentication and session management (`packages/api`)
- Skill sandboxing and IPC isolation (`packages/core/src/skills`, `packages/core/src/sandbox`)
- Channel message routing and policy enforcement (`packages/core/src/channels`)
- Registry server upload and security scanning (`packages/registry-server`)
- Environment variable handling and secret redaction (`packages/core/src/security`)
- Action log tamper detection (`packages/core/src/actionlog`)
- Docker container escape in sandbox mode (`docker/Dockerfile.sandbox`)
- MCP client/server transport security (`packages/core/src/mcp`)
- Prompt injection detection engine (`packages/core/src/security/injection-detector`)
- Zero-trust permission framework (`packages/core/src/security/permissions`)
- Encrypted secrets vault (`packages/core/src/security/vault`)
- Network firewall for skills (`packages/core/src/security/network-firewall`)
- Cryptographic audit chain (`packages/core/src/security/audit-chain`)
- E2E message encryption (`packages/core/src/security/e2e-encryption`)
- Skill code signing (`packages/core/src/security/skill-signing`)
- System prompt integrity protection (`packages/core/src/security/prompt-integrity`)

The following are out of scope:

- Vulnerabilities in third-party dependencies (report those upstream, but let us know so we can update)
- Attacks requiring physical access to the host machine
- Social engineering
- Denial of service via rate limiting (already mitigated)

## Security Architecture

OpenMotoko is built with a **"secure by architecture, not by prompt"** philosophy. Every security boundary is enforced in code, not through LLM instructions.

### Defense-in-Depth Layers

#### Layer 1: Input Protection
- **Prompt injection detection** — ML-based pattern analysis engine (`packages/core/src/security/injection-detector.ts`) that scans all inbound messages for role impersonation, encoding attacks (base64, zero-width Unicode, homoglyphs), delimiter injection, and obfuscated payloads. Scoring system (0-1 confidence) with configurable threshold. Blocks threats before they reach the LLM.
- **Sensitive data redaction** — Regex-based filtering of API keys, tokens, passwords, connection strings, JWTs, and vendor-specific secrets from all logs and outputs.

#### Layer 2: Execution Isolation
- **Zero-trust permission framework** — Capability-based access control (`packages/core/src/security/permissions.ts`). Every skill action requires an explicit grant: filesystem (with path globs), network (with domain allowlists), shell (with command allowlists), environment variables, browser, database. No ambient authority. Permission escalation requires user approval.
- **Network firewall** — Per-skill network policies (`packages/core/src/security/network-firewall.ts`). Skills declare allowed domains; all other traffic is blocked. Private IP ranges blocked by default (SSRF prevention). DNS rebinding protection. Sliding-window rate limiting per skill.
- **Environment sandboxing** — Skills only see explicitly granted env vars. Safe env prefix allowlist.
- **Docker sandbox** — Untrusted code runs in isolated containers with resource limits.
- **IPC isolation** — Skills run as isolated child processes communicating via typed IPC messages.

#### Layer 3: Data Protection
- **Encrypted secrets vault** — AES-256-GCM encryption at rest (`packages/core/src/security/vault.ts`). Key derivation via PBKDF2 (100K iterations, SHA-512). Skills access secrets through the vault API, never through raw env vars. Auto-rotation reminders for stale secrets (>90 days).
- **E2E message encryption** — X25519 key exchange + AES-256-GCM (`packages/core/src/security/e2e-encryption.ts`). Messages encrypted at rest in SQLite. Key rotation per conversation.
- **System prompt integrity** — SHA-256 hashes of system prompts verified before every LLM call (`packages/core/src/security/prompt-integrity.ts`). Agent actions cannot modify system prompts. Drift detection alerts on hash mismatch.

#### Layer 4: Supply Chain Security
- **Skill code signing** — Ed25519 signatures on skill packages (`packages/core/src/security/skill-signing.ts`). Registry stores author public keys. Trust levels: `verified` (registry-reviewed), `signed` (author-signed), `unsigned` (warning displayed). Tampered skills are rejected on install.
- **Security scanning** — All registry submissions scanned for eval(), new Function(), undeclared capabilities, and known vulnerabilities. Grade F packages rejected.
- **Self-improving skills gate** — Agent-generated skills must pass injection scan + capability audit + signing before activation.

#### Layer 5: Audit & Monitoring
- **Cryptographic audit chain** — SHA-256 hash chain (`packages/core/src/security/audit-chain.ts`) on all security events: permission grants/denials, injection detections, skill installs, auth attempts, config changes, tool executions, vault accesses, firewall blocks. Tamper-evident and exportable for compliance.
- **HMAC-SHA256 tamper detection** on the immutable action log.
- **Security dashboard** — Real-time threat monitoring, audit trail viewer, permission management, secrets vault management, and security score.

#### Layer 6: Standard Hardening
- **Session expiry** with configurable TTL
- **Path validation** preventing directory traversal
- **Command blocking** for dangerous shell commands
- **Rate limiting** on login and API endpoints
- **CSP headers** via @fastify/helmet
- **XSS sanitization** on user-generated content
- **Timing-safe comparisons** for authentication checks

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Prompt injection via user messages | Injection detection engine blocks before LLM |
| Persistent prompt injection via config files | Immutable system prompt with SHA-256 integrity checks |
| Malicious skills (supply chain) | Ed25519 code signing + security scanning + capability audit |
| Data exfiltration via skills | Network firewall with domain allowlists + SSRF blocking |
| Credential theft | AES-256-GCM encrypted vault, never plaintext env vars |
| Sandbox escape | IPC isolation + Docker containers + path validation |
| Audit log tampering | SHA-256 hash chain with integrity verification |
| Eavesdropping on messages | X25519 + AES-256-GCM E2E encryption |
| Unauthorized skill actions | Zero-trust capability-based permission framework |
