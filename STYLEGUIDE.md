# OpenMotoko Styleguide

Dark-only interface. Ghost in the Shell / Cyberpunk aesthetic.
Monospace typography. Terminal-native. No light mode.

---

## Color Tokens

### CSS Custom Properties

```css
:root {
  --void: #0A0E1A;
  --shell: #0D1526;
  --panel: #111827;
  --ghost: #00F0FF;
  --edge: #FF6B35;
  --pulse: #FF2D78;
  --alive: #39FF14;
  --chrome: #E8F4F8;
  --static: #4A6070;

  --void-rgb: 10 14 26;
  --shell-rgb: 13 21 38;
  --panel-rgb: 17 24 39;
  --ghost-rgb: 0 240 255;
  --edge-rgb: 255 107 53;
  --pulse-rgb: 255 45 120;
  --alive-rgb: 57 255 20;
  --chrome-rgb: 232 244 248;
  --static-rgb: 74 96 112;

  --ghost-hover: #33F3FF;
  --ghost-muted: rgba(0, 240, 255, 0.15);
  --ghost-border: rgba(0, 240, 255, 0.25);
  --ghost-glow: 0 0 20px rgba(0, 240, 255, 0.3);

  --edge-hover: #FF8A5C;
  --edge-muted: rgba(255, 107, 53, 0.15);
  --edge-border: rgba(255, 107, 53, 0.25);

  --pulse-hover: #FF5A93;
  --pulse-muted: rgba(255, 45, 120, 0.15);
  --pulse-border: rgba(255, 45, 120, 0.25);

  --alive-hover: #5FFF42;
  --alive-muted: rgba(57, 255, 20, 0.15);
  --alive-border: rgba(57, 255, 20, 0.25);

  --border-default: rgba(74, 96, 112, 0.2);
  --border-hover: rgba(74, 96, 112, 0.4);

  --overlay: rgba(10, 14, 26, 0.8);
  --glass: rgba(13, 21, 38, 0.6);
  --glass-border: rgba(0, 240, 255, 0.1);
}
```

### Usage

| Token | Verwendung |
|---|---|
| `--void` | Page background, deepest layer |
| `--shell` | Surface layer: sidebar, panels, cards |
| `--panel` | Elevated surfaces: modals, dropdowns, popovers |
| `--ghost` | Primary accent: links, active states, CTAs, focus rings |
| `--edge` | Warning accent: destructive hints, attention-grabbing actions |
| `--pulse` | Error/critical: error messages, flatline states, delete confirmations |
| `--alive` | Success/active: online indicators, completion states, confirmations |
| `--chrome` | Primary text: headings, body text, labels |
| `--static` | Secondary text: timestamps, metadata, placeholders, disabled states |

### Surface Layering

```
z-0  --void    Page background
z-1  --shell   Sidebars, main content panels
z-2  --panel   Cards, elevated sections
z-3  --glass   Modals, dialogs, overlays (with backdrop-filter)
```

---

## Typography

### Font Stack

```css
:root {
  --font-display: 'JetBrains Mono', monospace;
  --font-ui: 'Space Mono', monospace;
  --font-body: 'IBM Plex Mono', monospace;
  --font-code: 'Fira Code', monospace;
}
```

| Font | Verwendung |
|---|---|
| JetBrains Mono | Headlines (h1-h3), page titles, hero text |
| Space Mono | UI labels, navigation, status badges, metadata, timestamps |
| IBM Plex Mono | Body text, descriptions, chat messages, longer content |
| Fira Code | Code blocks, inline code, terminal output, JSON display |

### Font Loading

Google Fonts URL:

```
https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap
```

### Size Scale

```css
:root {
  --text-xs: 0.6875rem;    /* 11px - timestamps, micro labels */
  --text-sm: 0.8125rem;    /* 13px - metadata, badges */
  --text-base: 0.9375rem;  /* 15px - body text, messages */
  --text-lg: 1.125rem;     /* 18px - section headers */
  --text-xl: 1.5rem;       /* 24px - page titles */
  --text-2xl: 2rem;        /* 32px - hero/display */
  --text-3xl: 2.5rem;      /* 40px - landing hero */
}
```

### Weight Scale

| Weight | Value | Verwendung |
|---|---|---|
| Regular | 400 | Body text, descriptions |
| Medium | 500 | UI labels, navigation items |
| SemiBold | 600 | Section headers, active states |
| Bold | 700 | Page titles, important labels |
| ExtraBold | 800 | Hero text, display (JetBrains Mono only) |

---

## Spacing

### Scale

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

### Border Radius

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

---

## Layout

### Breakpoints

```css
/* Mobile first */
--bp-sm: 640px;
--bp-md: 768px;
--bp-lg: 1024px;
--bp-xl: 1280px;
--bp-2xl: 1536px;
```

### App Layout

```
+------------------+------------------------------------------+
|                  |                                          |
|    Sidebar       |           Main Content                   |
|    (260px)       |           (flex-1)                       |
|                  |                                          |
|  - Logo          |  +------------------------------------+  |
|  - Nav           |  |  Page Header                       |  |
|  - Conversations |  +------------------------------------+  |
|                  |  |                                    |  |
|                  |  |  Page Content                      |  |
|                  |  |                                    |  |
|                  |  +------------------------------------+  |
|                  |                                          |
+------------------+------------------------------------------+
```

- Sidebar: fixed width 260px, collapsible to 60px on mobile
- Main content: flex-1, max-width 1200px for readability on wide screens
- Chat page: no max-width, uses full height with sticky input

### Grid Background

Subtle grid pattern on `--void` background:

```css
.grid-bg {
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

---

## Component Patterns

### Glass Panel

Used for modals, overlays, elevated containers.

```css
.glass-panel {
  background: var(--glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}
```

### Card

Standard elevated container. Uses `cut-tr` clip-path instead of border-radius.

```css
.card {
  background: var(--shell);
  padding: var(--space-4);
  clip-path: polygon(
    0 0,
    calc(100% - var(--cut-md)) 0,
    100% var(--cut-md),
    100% 100%,
    0 100%
  );
  position: relative;
  transition: filter 150ms ease;
}

.card::before {
  content: '';
  position: absolute;
  inset: -1px;
  background: var(--border-default);
  clip-path: inherit;
  z-index: -1;
  transition: background 150ms ease;
}

.card:hover::before {
  background: var(--border-hover);
}

.card:hover {
  filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.08));
}
```

For featured/important cards, use double-cut:

```css
.card-featured {
  clip-path: polygon(
    0 0,
    calc(100% - var(--cut-md)) 0,
    100% var(--cut-md),
    100% 100%,
    var(--cut-md) 100%,
    0 calc(100% - var(--cut-md))
  );
}

.card-featured::before {
  background: var(--ghost-border);
}
```

### Button Variants

All buttons use `cut-tr` (small) for the angular tech look. No border-radius.

**Primary (Ghost):**

```css
.btn-primary {
  background: var(--ghost);
  color: var(--void);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  padding: var(--space-2) var(--space-4);
  border: none;
  cursor: pointer;
  clip-path: polygon(
    0 0,
    calc(100% - var(--cut-sm)) 0,
    100% var(--cut-sm),
    100% 100%,
    0 100%
  );
  transition: background 150ms ease, filter 150ms ease;
}

.btn-primary:hover {
  background: var(--ghost-hover);
  filter: drop-shadow(0 0 10px rgba(0, 240, 255, 0.4));
}

.btn-primary:focus-visible {
  filter: drop-shadow(0 0 4px rgba(0, 240, 255, 0.6));
}
```

**Secondary (Outline):**

Uses the border pseudo-element technique since clip-path removes CSS borders.

```css
.btn-secondary {
  background: transparent;
  color: var(--ghost);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 500;
  padding: var(--space-2) var(--space-4);
  border: none;
  cursor: pointer;
  position: relative;
  clip-path: polygon(
    0 0,
    calc(100% - var(--cut-sm)) 0,
    100% var(--cut-sm),
    100% 100%,
    0 100%
  );
  transition: background 150ms ease;
}

.btn-secondary::before {
  content: '';
  position: absolute;
  inset: -1px;
  background: var(--ghost-border);
  clip-path: inherit;
  z-index: -1;
}

.btn-secondary:hover {
  background: var(--ghost-muted);
}

.btn-secondary:hover::before {
  background: var(--ghost);
  opacity: 0.4;
}
```

**Danger:**

Uses `cut-bl` (mirrored cut) to visually distinguish destructive actions.

```css
.btn-danger {
  background: var(--pulse);
  color: var(--chrome);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  padding: var(--space-2) var(--space-4);
  border: none;
  cursor: pointer;
  clip-path: polygon(
    0 0,
    100% 0,
    100% 100%,
    var(--cut-sm) 100%,
    0 calc(100% - var(--cut-sm))
  );
  transition: background 150ms ease, filter 150ms ease;
}

.btn-danger:hover {
  background: var(--pulse-hover);
  filter: drop-shadow(0 0 10px rgba(255, 45, 120, 0.4));
}
```

### Input

```css
.input {
  background: var(--void);
  color: var(--chrome);
  font-family: var(--font-body);
  font-size: var(--text-base);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color 150ms ease;
}

.input:focus {
  border-color: var(--ghost);
  box-shadow: 0 0 0 1px var(--ghost-border);
}

.input::placeholder {
  color: var(--static);
}
```

### Status Badge

Badges use the `cut-chevron` shape for an angular, pointed look instead of pill shapes.

```css
.badge {
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px var(--space-3);
  clip-path: polygon(
    var(--cut-sm) 0,
    calc(100% - var(--cut-sm)) 0,
    100% 50%,
    calc(100% - var(--cut-sm)) 100%,
    var(--cut-sm) 100%,
    0 50%
  );
}

.badge-success {
  background: var(--alive-muted);
  color: var(--alive);
}

.badge-warning {
  background: var(--edge-muted);
  color: var(--edge);
}

.badge-error {
  background: var(--pulse-muted);
  color: var(--pulse);
}

.badge-info {
  background: var(--ghost-muted);
  color: var(--ghost);
}
```

For high-risk or critical badges, add the glow:

```css
.badge-error.badge-glow {
  filter: drop-shadow(0 0 4px rgba(255, 45, 120, 0.4));
}
```

### HUD Overlay

Full-screen overlay for permission requests and critical actions.
The content panel uses `cut-corners` (large) with the notched header variant.

```css
.hud-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.hud-overlay-content {
  --cut-md: var(--cut-lg);
  background: var(--panel);
  padding: var(--space-8);
  max-width: 480px;
  width: 90%;
  position: relative;
  clip-path: polygon(
    0 0,
    calc(100% - var(--cut-lg)) 0,
    100% var(--cut-lg),
    100% 100%,
    var(--cut-lg) 100%,
    0 calc(100% - var(--cut-lg))
  );
  filter: drop-shadow(0 0 40px rgba(0, 240, 255, 0.15));
}

.hud-overlay-content::before {
  content: '';
  position: absolute;
  inset: -1px;
  background: var(--ghost);
  opacity: 0.2;
  clip-path: inherit;
  z-index: -1;
}

.hud-overlay-header {
  clip-path: polygon(
    0 0,
    35% 0,
    37% var(--cut-sm),
    63% var(--cut-sm),
    65% 0,
    100% 0,
    100% 100%,
    0 100%
  );
  background: var(--shell);
  padding: var(--space-3) var(--space-4);
  margin: calc(-1 * var(--space-8));
  margin-bottom: var(--space-6);
  position: relative;
}
```

---

## Clip-Path Shapes

Clip-paths replace border-radius on key elements to create the angular, militaristic HUD aesthetic.
Since clip-path removes the element's box for hit-testing and borders, use the pseudo-element
border technique (see below) whenever a visible edge is needed.

### CSS Custom Properties

```css
:root {
  --cut-sm: 8px;
  --cut-md: 14px;
  --cut-lg: 20px;
  --cut-xl: 32px;
}
```

### Shape Library

**Corner Cut (top-right)** -- the signature shape. Used on cards, panels, buttons.

```css
.cut-tr {
  clip-path: polygon(
    0 0,
    calc(100% - var(--cut-md)) 0,
    100% var(--cut-md),
    100% 100%,
    0 100%
  );
}
```

```
+------------------\
|                   \
|                    |
|                    |
+--------------------+
```

**Corner Cut (bottom-left)** -- mirrored variant for visual tension.

```css
.cut-bl {
  clip-path: polygon(
    0 0,
    100% 0,
    100% 100%,
    var(--cut-md) 100%,
    0 calc(100% - var(--cut-md))
  );
}
```

**Double Cut (top-right + bottom-left)** -- primary card shape.

```css
.cut-corners {
  clip-path: polygon(
    0 0,
    calc(100% - var(--cut-md)) 0,
    100% var(--cut-md),
    100% 100%,
    var(--cut-md) 100%,
    0 calc(100% - var(--cut-md))
  );
}
```

```
+------------------\
|                   \
|                    |
|                    |
/                    |
\--------------------+
```

**Notched Header** -- tech readout panel with a top-center notch.

```css
.cut-notch {
  clip-path: polygon(
    0 0,
    35% 0,
    37% var(--cut-sm),
    63% var(--cut-sm),
    65% 0,
    100% 0,
    100% 100%,
    0 100%
  );
}
```

```
+-----------/    \-----------+
|                             |
|                             |
+-----------------------------+
```

**Slant Right** -- angled trailing edge for nav items and tabs.

```css
.cut-slant-r {
  clip-path: polygon(
    0 0,
    100% 0,
    calc(100% - var(--cut-sm)) 100%,
    0 100%
  );
}
```

**Slant Left** -- angled leading edge.

```css
.cut-slant-l {
  clip-path: polygon(
    var(--cut-sm) 0,
    100% 0,
    100% 100%,
    0 100%
  );
}
```

**Hexagon** -- avatars, status indicators, skill icons.

```css
.cut-hex {
  clip-path: polygon(
    50% 0%,
    100% 25%,
    100% 75%,
    50% 100%,
    0% 75%,
    0% 25%
  );
}
```

**Diamond** -- small decorative markers, list bullets.

```css
.cut-diamond {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
}
```

**Chevron Badge** -- status badges, risk level indicators.

```css
.cut-chevron {
  clip-path: polygon(
    var(--cut-sm) 0,
    calc(100% - var(--cut-sm)) 0,
    100% 50%,
    calc(100% - var(--cut-sm)) 100%,
    var(--cut-sm) 100%,
    0 50%
  );
}
```

```
  /------------------\
<                      >
  \------------------/
```

**Angular Divider** -- section separators, header bottoms.

```css
.cut-divider {
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - var(--cut-md)),
    50% 100%,
    0 calc(100% - var(--cut-md))
  );
}
```

### Clip-Path Border Technique

Clip-path removes the element's box model border. To get visible edges on clipped shapes,
use a wrapper pseudo-element that's 1-2px larger with the same clip-path, colored as the border.

```css
.cut-border {
  position: relative;
}

.cut-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  background: var(--ghost-border);
  clip-path: inherit;
  z-index: -1;
}

.cut-border-ghost::before { background: var(--ghost); opacity: 0.25; }
.cut-border-edge::before { background: var(--edge); opacity: 0.25; }
.cut-border-pulse::before { background: var(--pulse); opacity: 0.25; }
.cut-border-alive::before { background: var(--alive); opacity: 0.25; }
```

For glowing edges, combine with drop-shadow (works through clip-path unlike box-shadow):

```css
.cut-glow-ghost {
  filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.3));
}

.cut-glow-edge {
  filter: drop-shadow(0 0 6px rgba(255, 107, 53, 0.3));
}

.cut-glow-pulse {
  filter: drop-shadow(0 0 6px rgba(255, 45, 120, 0.3));
}

.cut-glow-alive {
  filter: drop-shadow(0 0 6px rgba(57, 255, 20, 0.3));
}
```

### Size Variants

Each shape comes in four sizes by overriding the `--cut-*` property locally:

```css
.cut-sm { --cut-md: var(--cut-sm); }  /* 8px - buttons, badges, small cards */
.cut-lg { --cut-md: var(--cut-lg); }  /* 20px - panels, modals, HUD overlays */
.cut-xl { --cut-md: var(--cut-xl); }  /* 32px - hero sections, splash panels */
```

### Component Integration

Which shapes to use where:

| Component | Shape | Size | Notes |
|---|---|---|---|
| Card (default) | `cut-tr` | md | Single top-right cut, subtle |
| Card (featured) | `cut-corners` | md | Double cut for important cards |
| Button Primary | `cut-tr` | sm | Sharp tech feel |
| Button Danger | `cut-bl` | sm | Mirrored, signals tension |
| HUD Overlay | `cut-corners` + `cut-border` | lg | Full HUD panel |
| Permission Dialog | `cut-notch` + `cut-border-ghost` | lg | Notch signals data readout |
| Status Badge | `cut-chevron` | sm | Angular instead of pill shape |
| Risk Badge | `cut-chevron` | sm | High risk: `cut-glow-pulse` |
| Avatar | `cut-hex` | -- | Hexagonal avatar frame |
| Skill Icon | `cut-hex` | -- | Consistent with avatar shape |
| Nav Item (active) | `cut-slant-r` | sm | Trailing angle on active tab |
| Section Separator | `cut-divider` | md | Angular separation between sections |
| Page Header | `cut-notch` + scanlines | md | Header with tech-panel notch |
| Activity Item | none | -- | Keep flat for scanability |
| Chat Input | `cut-tr` | sm | Subtle tech feel on input bar |
| Sidebar | none | -- | Stays rectangular, contrast with cut content |

### Composing Shapes

Shapes stack by applying multiple classes. The inner element gets the visual clip,
the border wrapper inherits it:

```html
<div class="cut-corners cut-lg cut-border cut-border-ghost cut-glow-ghost glass-panel">
  <div class="cut-notch" style="--cut-sm: 6px;">
    <h3>PERMISSION REQUEST</h3>
  </div>
  <div class="p-8">
    Content here
  </div>
</div>
```

### Decorative Corner Marks

Small SVG corner decorations placed at cut vertices for a targeting-reticle look:

```css
.corner-marks {
  position: relative;
}

.corner-marks::after {
  content: '';
  position: absolute;
  top: -1px;
  right: calc(var(--cut-md) - 4px);
  width: 8px;
  height: 8px;
  border-top: 2px solid var(--ghost);
  border-right: 2px solid var(--ghost);
  transform: rotate(45deg) translate(-2px, 2px);
  opacity: 0.6;
}
```

---

## Animations

### Scanlines

Subtle CRT scanline effect on header areas.

```css
.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.08) 2px,
    rgba(0, 0, 0, 0.08) 4px
  );
  z-index: 1;
}
```

### Glitch Effect

Triggered on error states. Brief horizontal shift.

```css
@keyframes glitch {
  0% { transform: translate(0); }
  20% { transform: translate(-3px, 1px); filter: hue-rotate(90deg); }
  40% { transform: translate(3px, -1px); }
  60% { transform: translate(-1px, 2px); filter: hue-rotate(0deg); }
  80% { transform: translate(2px, -1px); }
  100% { transform: translate(0); }
}

.glitch {
  animation: glitch 0.3s ease-in-out;
}

.glitch-text {
  position: relative;
}

.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.glitch-text::before {
  color: var(--pulse);
  animation: glitch-clip-1 2s infinite linear alternate-reverse;
  clip-path: inset(20% 0 60% 0);
  transform: translate(-2px);
}

.glitch-text::after {
  color: var(--ghost);
  animation: glitch-clip-2 2s infinite linear alternate-reverse;
  clip-path: inset(60% 0 10% 0);
  transform: translate(2px);
}

@keyframes glitch-clip-1 {
  0% { clip-path: inset(20% 0 60% 0); }
  25% { clip-path: inset(50% 0 20% 0); }
  50% { clip-path: inset(10% 0 70% 0); }
  75% { clip-path: inset(40% 0 30% 0); }
  100% { clip-path: inset(20% 0 60% 0); }
}

@keyframes glitch-clip-2 {
  0% { clip-path: inset(60% 0 10% 0); }
  25% { clip-path: inset(30% 0 40% 0); }
  50% { clip-path: inset(70% 0 5% 0); }
  75% { clip-path: inset(15% 0 55% 0); }
  100% { clip-path: inset(60% 0 10% 0); }
}
```

### Terminal Cursor Blink

Used as loading indicator instead of spinners.

```css
@keyframes cursor-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.terminal-cursor {
  display: inline-block;
  width: 0.6em;
  height: 1.1em;
  background: var(--ghost);
  vertical-align: text-bottom;
  animation: cursor-blink 1s step-end infinite;
}
```

### Ghost Pulse

Subtle breathing glow for active/connected states.

```css
@keyframes ghost-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(0, 240, 255, 0.2); }
  50% { box-shadow: 0 0 16px rgba(0, 240, 255, 0.4); }
}

.ghost-pulse {
  animation: ghost-pulse 2s ease-in-out infinite;
}
```

### Framer Motion Presets

```typescript
const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
}

const slideInRight = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
  transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }
}

const expandHeight = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
}

const staggerChildren = {
  animate: { transition: { staggerChildren: 0.05 } }
}

const listItem = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.15 }
}
```

### Reduced Motion

All animations must respect the user's OS preference:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .scanlines::after {
    display: none;
  }
}
```

Framer Motion: wrap all animated components with `useReducedMotion()` check.

---

## Tailwind Config Mapping

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: 'var(--void)',
        shell: 'var(--shell)',
        panel: 'var(--panel)',
        ghost: 'var(--ghost)',
        edge: 'var(--edge)',
        pulse: 'var(--pulse)',
        alive: 'var(--alive)',
        chrome: 'var(--chrome)',
        static: 'var(--static)',
        'ghost-hover': 'var(--ghost-hover)',
        'ghost-muted': 'var(--ghost-muted)',
        'edge-muted': 'var(--edge-muted)',
        'pulse-muted': 'var(--pulse-muted)',
        'alive-muted': 'var(--alive-muted)',
      },
      fontFamily: {
        display: ['JetBrains Mono', 'monospace'],
        ui: ['Space Mono', 'monospace'],
        body: ['IBM Plex Mono', 'monospace'],
        code: ['Fira Code', 'monospace'],
      },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      borderColor: {
        DEFAULT: 'var(--border-default)',
        hover: 'var(--border-hover)',
        ghost: 'var(--ghost-border)',
        edge: 'var(--edge-border)',
        pulse: 'var(--pulse-border)',
        alive: 'var(--alive-border)',
        glass: 'var(--glass-border)',
      },
      boxShadow: {
        ghost: 'var(--ghost-glow)',
      },
      backdropBlur: {
        glass: '16px',
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        'ghost-pulse': 'ghost-pulse 2s ease-in-out infinite',
        glitch: 'glitch 0.3s ease-in-out',
      },
      keyframes: {
        'cursor-blink': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        'ghost-pulse': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(0, 240, 255, 0.2)' },
          '50%': { boxShadow: '0 0 16px rgba(0, 240, 255, 0.4)' },
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-3px, 1px)' },
          '40%': { transform: 'translate(3px, -1px)' },
          '60%': { transform: 'translate(-1px, 2px)' },
          '80%': { transform: 'translate(2px, -1px)' },
          '100%': { transform: 'translate(0)' },
        },
      },
    },
  },
  plugins: [
    function({ addUtilities, theme }: { addUtilities: Function; theme: Function }) {
      addUtilities({
        '.cut-tr': {
          clipPath: 'polygon(0 0, calc(100% - var(--cut-md)) 0, 100% var(--cut-md), 100% 100%, 0 100%)',
        },
        '.cut-bl': {
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, var(--cut-md) 100%, 0 calc(100% - var(--cut-md)))',
        },
        '.cut-corners': {
          clipPath: 'polygon(0 0, calc(100% - var(--cut-md)) 0, 100% var(--cut-md), 100% 100%, var(--cut-md) 100%, 0 calc(100% - var(--cut-md)))',
        },
        '.cut-notch': {
          clipPath: 'polygon(0 0, 35% 0, 37% var(--cut-sm), 63% var(--cut-sm), 65% 0, 100% 0, 100% 100%, 0 100%)',
        },
        '.cut-slant-r': {
          clipPath: 'polygon(0 0, 100% 0, calc(100% - var(--cut-sm)) 100%, 0 100%)',
        },
        '.cut-slant-l': {
          clipPath: 'polygon(var(--cut-sm) 0, 100% 0, 100% 100%, 0 100%)',
        },
        '.cut-hex': {
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        },
        '.cut-diamond': {
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        },
        '.cut-chevron': {
          clipPath: 'polygon(var(--cut-sm) 0, calc(100% - var(--cut-sm)) 0, 100% 50%, calc(100% - var(--cut-sm)) 100%, var(--cut-sm) 100%, 0 50%)',
        },
        '.cut-divider': {
          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - var(--cut-md)), 50% 100%, 0 calc(100% - var(--cut-md)))',
        },
        '.cut-size-sm': { '--cut-md': 'var(--cut-sm)' },
        '.cut-size-lg': { '--cut-md': 'var(--cut-lg)' },
        '.cut-size-xl': { '--cut-md': 'var(--cut-xl)' },
        '.cut-glow-ghost': { filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.3))' },
        '.cut-glow-edge': { filter: 'drop-shadow(0 0 6px rgba(255, 107, 53, 0.3))' },
        '.cut-glow-pulse': { filter: 'drop-shadow(0 0 6px rgba(255, 45, 120, 0.3))' },
        '.cut-glow-alive': { filter: 'drop-shadow(0 0 6px rgba(57, 255, 20, 0.3))' },
      })
    },
  ],
} satisfies Config
```

---

## Iconography

No icon library. Use inline SVG or Lucide React (monoline, consistent with monospace aesthetic).

```
pnpm add lucide-react
```

Preferred icons per context:

| Context | Icon |
|---|---|
| Chat | `MessageSquare` |
| Activity | `Activity` |
| Skills | `Puzzle` |
| Settings | `Settings` |
| Telegram | `Send` |
| WhatsApp | `MessageCircle` |
| Discord | `Hash` |
| Shell | `Terminal` |
| Filesystem | `FolderOpen` |
| Network | `Globe` |
| Browser | `Chrome` |
| Success | `CheckCircle` |
| Error | `XCircle` |
| Warning | `AlertTriangle` |
| Cost | `DollarSign` |
| Time | `Clock` |
| Expand | `ChevronDown` |
| Collapse | `ChevronUp` |

---

## Accessibility

### Focus Styles

```css
*:focus-visible {
  outline: 2px solid var(--ghost);
  outline-offset: 2px;
}
```

### Contrast Ratios

All text/background combinations must meet WCAG 2.1 AA:

| Foreground | Background | Ratio | Pass |
|---|---|---|---|
| `--chrome` (#E8F4F8) | `--void` (#0A0E1A) | 15.2:1 | AAA |
| `--chrome` (#E8F4F8) | `--shell` (#0D1526) | 13.8:1 | AAA |
| `--chrome` (#E8F4F8) | `--panel` (#111827) | 12.1:1 | AAA |
| `--static` (#4A6070) | `--void` (#0A0E1A) | 3.2:1 | AA Large |
| `--ghost` (#00F0FF) | `--void` (#0A0E1A) | 10.8:1 | AAA |
| `--alive` (#39FF14) | `--void` (#0A0E1A) | 11.4:1 | AAA |
| `--edge` (#FF6B35) | `--void` (#0A0E1A) | 5.1:1 | AA |
| `--pulse` (#FF2D78) | `--void` (#0A0E1A) | 4.6:1 | AA |

Note: `--static` on `--void` only passes for large text (18px+). For small secondary text, consider using a lighter variant or increasing font weight.

### Semantic HTML

- `<header>` for app header
- `<nav>` for sidebar navigation
- `<main>` for primary content area
- `<aside>` for context panel
- `<section>` for page sections
- Correct heading hierarchy (h1 -> h2 -> h3, no skipping)
- `aria-live="polite"` on activity feed and chat message container
- `role="status"` on cost display and system status
