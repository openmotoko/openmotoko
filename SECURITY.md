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

The following are out of scope:

- Vulnerabilities in third-party dependencies (report those upstream, but let us know so we can update)
- Attacks requiring physical access to the host machine
- Social engineering
- Denial of service via rate limiting (already mitigated)

## Security Architecture

OpenMotoko includes the following hardening measures:

- **Session expiry** with configurable TTL
- **Environment sandboxing** so skills only see explicitly granted env vars
- **Path validation** preventing directory traversal
- **Command blocking** for dangerous shell commands
- **Rate limiting** on login and API endpoints
- **CSP headers** via @fastify/helmet
- **XSS sanitization** on user-generated content
- **Sensitive data redaction** filtering API keys, tokens, and passwords from logs
- **HMAC-SHA256 tamper detection** on the immutable action log
- **Docker sandbox** for running untrusted code in isolated containers
- **Timing-safe comparisons** for authentication checks
- **Security scanning** on all skill registry submissions (rejects grade F packages)
