# Phase 0 -- Landing Page

**Zeitraum:** 1-2 Tage
**Ziel:** openmotoko.ai Landing Page live -- Name, Vision, Feature-Teaser, GitHub-Link, E-Mail-Waitlist.

---

## Voraussetzungen

- Domain `openmotoko.ai` registriert und DNS konfiguriert
- Logo SVG finalisiert (invertiertes Dreieck mit Bichroma-Glitch an der Spitze)
- Design Tokens aus `STYLEGUIDE.md` verfuegbar
- Hosting-Entscheidung: Vercel, Cloudflare Pages, oder statisches Deployment via Caddy

---

## Scope

Einzelne statische Seite. Kein React, kein Framework. Pures HTML + CSS + minimales JS fuer die Waitlist-Form und Animationen. Wird spaeter durch die eigene Marketing-Seite ersetzt oder bleibt als /landing Route erhalten.

---

## Verzeichnis

```
packages/landing/
  package.json
  vite.config.ts            # Vite als Dev-Server + Build
  index.html
  src/
    styles.css              # Design Tokens, Clip-Paths, Animations
    main.ts                 # Waitlist-Form Handling, Intersection Observer
  public/
    logo.svg                # Static Triangle Mark
    og-image.png            # Open Graph Preview (1200x630)
    favicon.svg             # 16px filled Triangle
```

**Dependencies:**

| Package | Version |
|---|---|
| vite | 6 |

Keine weiteren Dependencies. Fonts via Google Fonts CDN. Kein Tailwind fuer die Landing Page -- pures CSS mit den Design Tokens.

---

## Sektionen

Die Seite besteht aus 7 vertikalen Sektionen. Jede Sektion nutzt volle Viewport-Breite. Alle Sektionen auf einer einzigen scrollbaren Seite.

### 01 -- Hero

Vollbild. Zentriert. Grid-Background (`grid-bg` aus Styleguide).

**Inhalt:**

- Logo SVG (animiert, 80px Mark + Lockup)
- Tagline: `Your Agent. Your Data. Your Rules.`
- Sub-Tagline: `Personal AI Agent -- built for humans, not terminals.`
- Zwei CTAs:
  - Primary: `Join Waitlist` (scrollt zu Waitlist-Sektion) -- `cut-tr` Button, `--ghost`
  - Secondary: `View on GitHub` (externer Link) -- `cut-tr` Outline Button
- Subtiler Scanline-Overlay auf dem gesamten Hero

**Clip-Path:**

Der untere Rand des Hero ist nicht gerade sondern hat einen angularen Cut:

```css
.hero {
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 60px),
    50% 100%,
    0 calc(100% - 60px)
  );
  padding-bottom: 80px;
}
```

### 02 -- Problem Statement

Kurzer Block der das Problem beschreibt. Dunklerer Hintergrund (`--shell`).

**Inhalt:**

- Ueberschrift: `The problem with AI agents today`
- Drei Punkte als Karten (`cut-tr`, nebeneinander auf Desktop, gestapelt auf Mobile):
  1. **Blackbox** -- `You can't see what your agent does, why it decides, or what it costs.`
  2. **Terminal-only** -- `Setup requires CLI knowledge. Config lives in YAML files.`
  3. **Unsafe Skills** -- `Community plugins run with full system access. No sandboxing.`
- Jede Karte hat ein Icon (Lucide: `EyeOff`, `Terminal`, `ShieldAlert`) in `--pulse`

### 03 -- Solution / Features

Heller als Problem-Sektion (`--panel` Hintergrund). Feature-Grid.

**Inhalt:**

- Ueberschrift: `OpenMotoko changes that`
- 6 Feature-Karten (3x2 Grid auf Desktop, 2x3 auf Tablet, 1x6 auf Mobile):

| Feature | Icon | Beschreibung |
|---|---|---|
| Live Activity Feed | `Activity` | See every action in real-time. No more guessing. |
| Visual Permissions | `Shield` | iOS-style approval for every skill capability. |
| Zero-Terminal Setup | `Wand2` | Running in under 5 minutes. No CLI required. |
| All Your Channels | `MessageSquare` | WhatsApp, Telegram, Discord, Signal, Slack, iMessage. |
| Cost Transparency | `DollarSign` | Budget limits, per-request tracking, no surprises. |
| Local-First | `HardDrive` | Your data stays on your machine. Always. |

- Jede Karte: `cut-corners` Clip-Path, `--shell` Background, Icon in `--ghost`, Text in `--chrome`
- Hover: `cut-glow-ghost`, Border wird sichtbar via pseudo-element

### 04 -- Comparison

Direkter Vergleich. Tabelle oder Side-by-Side.

**Inhalt:**

- Ueberschrift: `OpenMotoko vs. the status quo`
- Vergleichstabelle (3 Spalten: Feature | Others | OpenMotoko):

| Feature | Others | OpenMotoko |
|---|---|---|
| Primary UI | Messaging apps | Dedicated web UI + Desktop app |
| Setup | CLI + YAML | 5-step visual onboarding |
| Agent transparency | None | Live activity feed + thought process |
| Skill permissions | Full system access | Declarative manifest + IPC isolation |
| Cost tracking | Hidden | Dashboard with budget limits |
| Desktop app | Electron (~150MB) | Tauri (~8MB) |

- "Others" Spalte in `--static`, "OpenMotoko" Spalte in `--ghost`
- Tabelle hat `cut-tr` auf dem aeusseren Container

### 05 -- Tech Stack Teaser

Schneller visueller Block der zeigt dass das Projekt technisch solide ist.

**Inhalt:**

- Ueberschrift: `Built with`
- Horizontale Logo-Reihe (monochrom, `--static`, hover: `--chrome`):
  TypeScript, React, Fastify, SQLite, Tauri, Docker
- Darunter: `Open Source. MIT Licensed. Community-driven.`

### 06 -- Waitlist / CTA

Primaere Conversion-Sektion. `--void` Hintergrund mit `--ghost` Akzenten.

**Inhalt:**

- Ueberschrift: `Get early access`
- Sub: `OpenMotoko launches [Q2 2026]. Join the waitlist for updates and early access.`
- E-Mail Input + Submit Button:
  - Input: `cut-tr` (small), `--void` Background, `--ghost` Border on Focus
  - Button: `cut-tr` (small), `--ghost` filled, Text `Join` in `--void`
  - Nebeneinander auf einer Zeile (Input breit, Button schmal)
- Erfolgsmeldung nach Submit: `--alive` Badge mit `cut-chevron`: `YOU'RE IN`
- Privacy-Hinweis: `No spam. Unsubscribe anytime. Data stored in [ConvertKit/Buttondown].`

**Waitlist-Backend:**

Optionen (Entscheidung offen):

| Service | Aufwand | Kosten |
|---|---|---|
| Buttondown | API-Call, kein Backend | Free bis 100 Subscriber |
| ConvertKit | API-Call, kein Backend | Free bis 10k Subscriber |
| Eigener Endpoint | Fastify Route + SQLite | Kein externer Service |

Fuer den Launch reicht ein externer Service. API-Call direkt aus dem Frontend (`fetch` POST).

### 07 -- Footer

Minimaler Footer. `--shell` Hintergrund.

**Inhalt:**

- Logo (kleine Variante, 32px Mark + Wordmark)
- Links: GitHub | Docs (kommt spaeter) | Twitter/X
- Copyright: `2026 OpenMotoko. MIT License.`
- `Built for humans, not terminals.` als Closer

---

## Responsive Breakpoints

| Breakpoint | Layout-Aenderungen |
|---|---|
| < 640px | Single Column. Hero-CTAs gestapelt. Feature-Cards 1 Spalte. Vergleichstabelle scrollbar horizontal. |
| 640-1024px | Feature-Cards 2 Spalten. Vergleichstabelle vollstaendig sichtbar. |
| > 1024px | Feature-Cards 3 Spalten. Maximale Content-Breite 1100px. |

---

## Animationen

| Element | Animation | Trigger |
|---|---|---|
| Logo | Bichroma-Glitch (aus Logo SVG) | Permanent, 9s Zyklus |
| Hero Text | Fade-in + translate-y | On load, staggered 100ms |
| Feature Cards | Fade-in + translate-y | Intersection Observer, threshold 0.2 |
| Problem Cards | Slide-in from left | Intersection Observer |
| Comparison Rows | Stagger fade-in | Intersection Observer |
| Waitlist Input | Focus: ghost-border + glow | On focus |
| Success Badge | Scale-in + ghost-pulse | After submit |

Alle Animationen respektieren `prefers-reduced-motion: reduce` -- bei aktivierter Einstellung nur Opacity-Transitions, kein Translate, kein Glitch.

---

## SEO / Meta

```html
<title>OpenMotoko -- Personal AI Agent for Humans</title>
<meta name="description" content="Open source AI agent with a real UI. See what your agent does. Control what it can access. Set up in 5 minutes, no terminal needed.">
<meta property="og:title" content="OpenMotoko -- Your Agent. Your Data. Your Rules.">
<meta property="og:description" content="Personal AI Agent with live activity feed, visual permissions, and zero-terminal setup. Open source, local-first.">
<meta property="og:image" content="https://openmotoko.ai/og-image.png">
<meta property="og:url" content="https://openmotoko.ai">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
```

---

## Performance

| Metrik | Ziel |
|---|---|
| First Contentful Paint | < 1.0s |
| Largest Contentful Paint | < 1.5s |
| Total Page Weight | < 150KB (ohne Fonts) |
| Lighthouse Performance | >= 95 |
| Lighthouse Accessibility | >= 95 |

- Fonts: `display=swap`, nur noetige Weights (JetBrains Mono 300+700, Space Mono 400)
- Kein JS-Framework, nur ~2KB fuer Waitlist + Intersection Observer
- SVG Logo inline (kein externer Request)
- CSS inline im `<head>` oder als einzige Datei
- og-image.png komprimiert auf < 100KB

---

## Logo Integration

Das Logo aus `logousage.html` (finale v3) wird als Inline-SVG eingebettet.

**Mark (Triangle):**

- Invertiertes Dreieck, Outline, `stroke: var(--ghost)`, `stroke-width: 1.6`
- Cut bei y=72, Spitze als separater Path
- Bichroma-Glitch: 2 Magenta-Ghosts (`--pulse`) bei -2px und +2px Offset
- Animation: `steps(1)`, 9s Zyklus, Burst A (mild) + Burst B (hard)

**Lockup (Mark + Wordmark):**

- Mark links (58px), Text rechts
- `OPEN` klein, `font-weight: 300`, `letter-spacing: 7px`, `color: var(--static)`
- `MOTOKO` gross, `font-weight: 700`, `letter-spacing: -1px`, `color: var(--ghost)`
- Sub: `YOUR AGENT . YOUR DATA . YOUR RULES` in `--static`, `font-size: 7px`, `letter-spacing: 3.5px`

**Favicon:**

- 16px: gefuelltes Dreieck, kein Glitch (zu klein), `fill: var(--ghost)`

---

## Deployment

**Option A -- Vercel (empfohlen fuer schnellen Start):**

```bash
cd packages/landing
npx vercel --prod
```

DNS: CNAME `openmotoko.ai` -> `cname.vercel-dns.com`

**Option B -- Cloudflare Pages:**

```bash
cd packages/landing
pnpm build
npx wrangler pages deploy dist
```

**Option C -- Eigener VPS (spaeter, wenn Backend laeuft):**

Caddy served die statischen Dateien aus `/var/www/openmotoko-landing/`.

---

## Akzeptanzkriterien

- [ ] Seite laedt in unter 1.5s (LCP)
- [ ] Logo rendert korrekt mit Glitch-Animation
- [ ] Alle Sektionen sichtbar und korrekt gelayoutet auf Mobile, Tablet, Desktop
- [ ] Waitlist-Form submitted erfolgreich und zeigt Erfolgsmeldung
- [ ] Clip-Path Shapes rendern auf Chrome, Firefox, Safari
- [ ] `prefers-reduced-motion` deaktiviert alle Bewegungs-Animationen
- [ ] Open Graph Preview zeigt korrektes Bild und Text (testbar via opengraph.xyz)
- [ ] Lighthouse Score >= 95 in Performance und Accessibility
- [ ] Kein horizontaler Overflow auf keiner Breakpoint-Stufe
- [ ] GitHub-Link fuehrt zum korrekten Repository
- [ ] Favicon (Triangle) erscheint im Browser-Tab
