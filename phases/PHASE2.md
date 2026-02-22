# Phase 2 -- Full Feature Parity

**Zeitraum:** Woche 9-14
**Ziel:** Vollstaendige OpenClaw-Parity bei Channels und Features, vollstaendige UI.

---

## Voraussetzungen

- Phase 1 komplett abgeschlossen
- Agent Core funktioniert mit mindestens einem LLM Provider
- Web-UI Chat + Activity Feed funktionieren
- Telegram Channel laeuft
- Core Skills sind implementiert und getestet

---

## Woche 9-10 -- Skills & Permissions UI + Neue Channels

### 9.1 Skills & Permissions Screen

**Package:** `packages/web`

**Neue Dateien:**

```
packages/web/src/
  pages/
    skills.tsx                    # Ueberarbeiten: vollstaendige Skills-Seite
  components/
    skills/
      skill-library.tsx           # Browseable Skill-Bibliothek mit Kategorien
      skill-card.tsx              # Einzelner Skill: Name, Beschreibung, Risk-Badge, Install/Toggle
      skill-detail.tsx            # Detail-Ansicht: Manifest, Capabilities, Changelog
      permission-matrix.tsx       # Tabelle: Skill x Capability mit Toggles
      approval-dialog.tsx         # HUD-Overlay bei Skill-Installation
      capability-badge.tsx        # Visueller Badge pro Capability (shell, fs, network, ...)
      risk-indicator.tsx          # LOW/MEDIUM/HIGH Anzeige mit Farbkodierung
```

**Neue API Endpoints:**

| Method | Path | Beschreibung |
|---|---|---|
| GET | `/api/skills/library` | Verfuegbare Skills (Core + Community) |
| GET | `/api/skills/:id/manifest` | Vollstaendiges Manifest |
| POST | `/api/skills/:id/install` | Skill installieren (triggert Approval-Flow) |
| DELETE | `/api/skills/:id` | Skill deinstallieren |
| PUT | `/api/skills/:id/permissions` | Einzelne Capabilities togglen |
| GET | `/api/skills/permissions` | Permission-Matrix (alle Skills x alle Capabilities) |

**Permission-Matrix Datenstruktur:**

```typescript
interface PermissionMatrix {
  skills: {
    id: string
    name: string
    capabilities: {
      shell: { allowed: boolean; config: ShellConfig | null }
      filesystem: { read: string[]; write: string[] }
      network: { allowed: boolean; domains: string[] }
      browser: { allowed: boolean }
      messaging: { allowed: boolean; channels: string[] }
    }
  }[]
}
```

**Approval-Flow:**

1. User klickt "Install" auf einem Skill
2. HUD-Overlay (glassmorphism) zeigt:
   - Skill-Name, Author, Version
   - Alle angeforderten Capabilities mit Erklaerung
   - Risk-Level Badge
   - "Approve" (--ghost) und "Deny" (--pulse) Buttons
3. Bei Approve: Skill wird installiert, Capabilities werden in DB gespeichert
4. User kann jederzeit einzelne Capabilities in der Permission-Matrix togglen

**Akzeptanzkriterien:**

- [ ] Skill-Bibliothek zeigt alle verfuegbaren Skills mit Kategorien
- [ ] Installation triggert Approval-Dialog mit Capability-Uebersicht
- [ ] Permission-Matrix zeigt alle Skills mit allen Capabilities als Toggles
- [ ] Einzelne Capabilities koennen unabhaengig vom Skill de-/aktiviert werden
- [ ] Risk-Level wird visuell klar kommuniziert (Farbe + Label)

### 9.2 WhatsApp Channel

**Package:** `packages/channels/whatsapp`

**Dateien:**

```
packages/channels/whatsapp/src/
  index.ts
  adapter.ts              # Baileys Multi-Device Setup
  qr-handler.ts           # QR-Code-Generierung fuer Web-UI Pairing
  types.ts
```

**Dependencies:**

| Package | Version |
|---|---|
| @whiskeysockets/baileys | latest |
| qrcode | latest |

**Besonderheiten:**

- QR-Code wird via WebSocket an die Web-UI gestreamt
- Session-Daten werden lokal gespeichert (kein Cloud-Relay)
- Multi-Device-Protokoll, kein Telefon muss online bleiben nach Pairing

**Akzeptanzkriterien:**

- [ ] QR-Code erscheint in der Web-UI Settings
- [ ] Nach Scan: WhatsApp-Nachrichten werden empfangen
- [ ] Agent-Antworten gehen zurueck an WhatsApp
- [ ] Session ueberlebt Server-Restart

### 9.3 Discord Channel

**Package:** `packages/channels/discord`

**Dateien:**

```
packages/channels/discord/src/
  index.ts
  adapter.ts              # discord.js Client, Message Handler
  types.ts
```

**Dependencies:**

| Package | Version |
|---|---|
| discord.js | 14 |

**Akzeptanzkriterien:**

- [ ] Bot reagiert auf Mentions und DMs
- [ ] Antworten werden im gleichen Channel gepostet
- [ ] Lange Antworten werden korrekt gesplittet (Discord 2000 char limit)

---

## Woche 10 -- Signal + Slack Channels

### 10.1 Signal Channel

**Package:** `packages/channels/signal`

**Dateien:**

```
packages/channels/signal/src/
  index.ts
  adapter.ts              # signal-cli Subprocess Management
  types.ts
```

**Besonderheiten:**

- signal-cli laeuft als Daemon-Subprocess
- Kommunikation ueber JSON-RPC via stdin/stdout
- Registrierung erfordert Telefonnummer (dokumentiert in Onboarding)

**Akzeptanzkriterien:**

- [ ] Signal-Nachrichten werden empfangen und beantwortet
- [ ] signal-cli Prozess wird sauber gestartet/gestoppt

### 10.2 Slack Channel

**Package:** `packages/channels/slack`

**Dateien:**

```
packages/channels/slack/src/
  index.ts
  adapter.ts              # Bolt SDK App, Socket Mode
  types.ts
```

**Dependencies:**

| Package | Version |
|---|---|
| @slack/bolt | 4 |

**Besonderheiten:**

- Socket Mode (kein oeffentlicher Endpoint noetig)
- Reagiert auf App-Mentions und DMs
- Thread-Support: Antworten im gleichen Thread

**Akzeptanzkriterien:**

- [ ] Bot reagiert auf Mentions in Channels und DMs
- [ ] Antworten erscheinen im korrekten Thread
- [ ] Activity Feed zeigt Slack-Events

### 10.3 In-App Skill Library

**Package:** `packages/api` + `packages/web`

**Neue Dateien (API):**

```
packages/api/src/
  routes/
    skill-library.ts      # Skill-Discovery, Search, Kategorien
  services/
    skill-registry.ts     # GitHub-basierte Registry abfragen
```

**Funktionalitaet:**

- Skills werden aus einem GitHub-Repository gelesen (JSON-Index)
- Kategorien: Productivity, Development, Communication, System, Data
- Suche nach Name und Beschreibung
- Version-Check gegen installierte Skills

**Akzeptanzkriterien:**

- [ ] Bibliothek zeigt verfuegbare Skills mit Kategorien
- [ ] Suche filtert in Echtzeit
- [ ] "Install" oeffnet Approval-Dialog
- [ ] Installierte Skills sind als solche markiert

---

## Woche 11 -- iMessage + Onboarding

### 11.1 iMessage Channel

**Package:** `packages/channels/imessage`

**Dateien:**

```
packages/channels/imessage/src/
  index.ts
  adapter.ts              # BlueBubbles HTTP API Client
  types.ts
```

**Besonderheiten:**

- Benoetigt BlueBubbles Server auf einem Mac
- REST API Kommunikation, kein CLI-Subprocess
- Optional: nur wenn User BlueBubbles konfiguriert hat

**Akzeptanzkriterien:**

- [ ] Nachrichten via BlueBubbles API empfangen und senden
- [ ] Graceful Degradation wenn BlueBubbles nicht erreichbar

### 11.2 Onboarding Flow

**Package:** `packages/web`

**Neue Dateien:**

```
packages/web/src/
  pages/
    onboarding.tsx
  components/
    onboarding/
      step-indicator.tsx          # Fortschrittsanzeige (5 Steps)
      provider-select.tsx         # LLM Provider Auswahl mit Logos
      api-key-input.tsx           # Sichere Eingabe mit Validation
      channel-connect.tsx         # Ersten Channel verbinden
      skill-install.tsx           # Ersten Skill auswaehlen
      first-chat.tsx              # Erste Conversation starten
```

**5 Schritte:**

1. **LLM Provider waehlen** -- Karten mit Provider-Logos, Kosten-Vergleich, Link zu API-Key-Docs
2. **API Key eingeben** -- Password-Input, Live-Validation (Test-Request an Provider), Fehler-Feedback
3. **Channel verbinden** -- Optional, kann uebersprungen werden. Telegram als Empfehlung (einfachstes Setup)
4. **Skill installieren** -- Vorauswahl der wichtigsten Skills (Shell, Filesystem, Web-Search)
5. **Erste Conversation** -- Direkt in den Chat, mit einem Vorschlags-Prompt

**Akzeptanzkriterien:**

- [ ] Onboarding startet automatisch bei erstem App-Besuch
- [ ] Jeder Schritt hat klare Erklaerung und Aktion
- [ ] API Key wird validiert bevor man weiterkommt
- [ ] Channel-Schritt ist ueberspringbar
- [ ] Nach Abschluss landet man direkt im Chat

---

## Woche 12 -- Kosten-Tracking + Conversation Context

### 12.1 Kosten-Tracking + Budget-Limits

**Package:** `packages/core` + `packages/api` + `packages/web`

**Neue Dateien (Core):**

```
packages/core/src/
  cost/
    tracker.ts            # Pro-Request Kosten berechnen
    budget.ts             # Limits definieren, Warnings triggern
    models.ts             # Kosten-Tabelle pro Provider/Modell
```

**Neue Dateien (Web):**

```
packages/web/src/
  components/
    settings/
      budget-config.tsx           # Budget-Limit setzen
      cost-dashboard.tsx          # Tages-/Wochen-/Monats-Uebersicht
      cost-chart.tsx              # Einfaches Balkendiagramm
      notification-config.tsx     # Warnung bei X% des Limits
```

**Neue API Endpoints:**

| Method | Path | Beschreibung |
|---|---|---|
| GET | `/api/costs/today` | Kosten des aktuellen Tages |
| GET | `/api/costs/history` | Kosten-Historie (Tage/Wochen) |
| PUT | `/api/settings/budget` | Budget-Limit setzen |
| GET | `/api/settings/budget` | Aktuelles Budget + Verbrauch |

**Budget-Logik:**

- Konfigurierbare Limits: taeglich, woechentlich, monatlich
- Notifications bei 50%, 80%, 95% des Limits
- Bei 100%: Agent stoppt, User muss Budget erhoehen oder Limit deaktivieren
- Notifications via WebSocket Event + optional via konfiguriertem Channel

**Akzeptanzkriterien:**

- [ ] Kosten werden pro Request korrekt berechnet und gespeichert
- [ ] Dashboard zeigt aktuelle Kosten mit Verlauf
- [ ] Budget-Limit laesst sich konfigurieren
- [ ] Warnings erscheinen rechtzeitig
- [ ] Agent stoppt bei erreichtem Limit

### 12.2 Conversation Context Panel

**Package:** `packages/web`

**Neue Dateien:**

```
packages/web/src/
  components/
    chat/
      context-panel.tsx           # Rechts ausklappbares Panel
      system-prompt-editor.tsx    # Editierbarer System-Prompt
      model-switcher.tsx          # Modell pro Conversation wechseln
      skill-toggles.tsx           # Skills pro Conversation aktivieren
      conversation-meta.tsx       # Stats: Messages, Tokens, Kosten
```

**Funktionalitaet:**

- Panel klappt rechts aus (Radix Sheet oder custom Slide-In)
- System-Prompt ist inline editierbar (Auto-Save mit Debounce)
- Modell-Switcher zeigt alle verfuegbaren Modelle mit Kosten-Info
- Skill-Toggles erlauben Aktivierung/Deaktivierung pro Conversation
- Meta-Info: Anzahl Messages, gesamte Tokens, gesamte Kosten dieser Conversation

**Akzeptanzkriterien:**

- [ ] Panel oeffnet/schliesst smooth (Framer Motion)
- [ ] System-Prompt-Aenderungen werden sofort wirksam
- [ ] Modell kann mid-Conversation gewechselt werden
- [ ] Skills koennen pro Conversation getoggelt werden
- [ ] Meta-Stats sind live aktuell

---

## Woche 13 -- Heartbeat Scheduler

### 13.1 Autonome proaktive Tasks

**Package:** `packages/core`

**Neue Dateien:**

```
packages/core/src/
  scheduler/
    heartbeat.ts          # Cron-basierter Scheduler
    task-queue.ts         # Warteschlange fuer geplante Tasks
    types.ts              # ScheduledTask, CronExpression
```

**Dependencies (zusaetzlich in packages/core):**

| Package | Version |
|---|---|
| node-cron | latest |

**Funktionalitaet:**

- User kann wiederkehrende Tasks definieren (Cron-Syntax oder natuerliche Sprache)
- Scheduler triggert den Agent mit einem vordefinierten Prompt
- Ergebnisse werden in einer dedizierten Conversation oder via Channel geliefert
- Activity Feed zeigt alle Heartbeat-Ausfuehrungen

**Beispiele:**

- "Jeden Morgen um 8: Fasse meine ungelesenen E-Mails zusammen"
- "Alle 2 Stunden: Pruefe GitHub Issues auf neue Kommentare"
- "Freitag 17 Uhr: Erstelle einen Wochenbericht"

**Akzeptanzkriterien:**

- [ ] Cron-basierte Tasks laufen zuverlaessig
- [ ] Tasks koennen via UI erstellt, bearbeitet, deaktiviert werden
- [ ] Activity Feed zeigt Heartbeat-Events
- [ ] Tasks ueberleben Server-Restart (persistiert in DB)

---

## Woche 14 -- Skill Registry CI

### 14.1 GitHub-basierte Skill Registry

**Repository:** `github.com/openmotoko/skill-registry` (separates Repo)

**Struktur:**

```
skill-registry/
  registry.json           # Index aller Skills
  skills/
    community-skill-name/
      manifest.json
      README.md
  .github/
    workflows/
      lint-manifest.yml   # CI: Manifest-Schema validieren
      review-checklist.yml # PR-Template mit Security-Checklist
  scripts/
    validate-manifest.ts  # Zod-basierte Manifest-Validation
    build-registry.ts     # registry.json aus skills/ generieren
```

**CI Pipeline (lint-manifest.yml):**

1. PR wird geoeffnet mit neuem Skill unter `skills/`
2. CI validiert `manifest.json` gegen Zod-Schema
3. CI prueft: keine `"shell": true` + `"network": true` Kombination ohne Begruendung
4. CI generiert Security-Report als PR-Kommentar
5. Maintainer reviewed manuell

**Akzeptanzkriterien:**

- [ ] `registry.json` wird automatisch aus `skills/` generiert
- [ ] CI blockiert PRs mit invalidem Manifest
- [ ] Security-Report wird als PR-Kommentar gepostet
- [ ] OpenMotoko App kann `registry.json` als Skill-Bibliothek laden

---

## Technische Entscheidungen Phase 2

| Entscheidung | Wahl | Begruendung |
|---|---|---|
| WhatsApp Library | Baileys (@whiskeysockets/baileys) | Multi-Device, kein Business API noetig, Community-Standard |
| Slack Mode | Socket Mode via Bolt SDK | Kein oeffentlicher Endpoint noetig, ideal fuer Self-Hosted |
| Signal Bridge | signal-cli als Subprocess | Einzige stabile Option fuer Signal ohne offizielle API |
| iMessage | BlueBubbles REST API | Einzige legale Methode fuer iMessage-Integration |
| Skill Registry | GitHub Repository + CI | Kein eigener Server-Overhead, PR-basierter Review-Prozess |
| Budget Storage | SQLite cost_log Tabelle | Bereits vorhanden, keine externe Dependency |
