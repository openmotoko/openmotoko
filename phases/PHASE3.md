# Phase 3 -- Desktop + Polish

**Zeitraum:** Woche 15-19
**Ziel:** Tauri Desktop-App, PWA, Production-Readiness, Public Launch.

---

## Voraussetzungen

- Phase 1 + Phase 2 komplett abgeschlossen
- Alle Channels funktionieren
- Skills & Permissions UI ist stabil
- Onboarding Flow getestet
- Kosten-Tracking laeuft korrekt

---

## Woche 15-16 -- Tauri Desktop App

### 15.1 Tauri 2.0 Setup

**Package:** `packages/desktop`

**Dateien:**

```
packages/desktop/
  package.json
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/
      main.rs             # Tauri Entry Point
      commands.rs         # Custom Tauri Commands (Backend starten/stoppen)
      tray.rs             # System Tray / Menubar Icon
      updater.rs          # Auto-Update Konfiguration
    icons/
      icon.icns           # macOS
      icon.ico            # Windows
      icon.png            # Linux
    capabilities/
      default.json        # Tauri Permission Capabilities
  src/
    preload.ts            # Window-spezifische Logik
```

**tauri.conf.json Kern-Config:**

```json
{
  "productName": "OpenMotoko",
  "identifier": "ai.openmotoko.app",
  "build": {
    "frontendDist": "../web/dist"
  },
  "app": {
    "withGlobalTauri": true,
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "tooltip": "OpenMotoko"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "nsis", "appimage"],
    "icon": ["icons/icon.icns", "icons/icon.ico", "icons/icon.png"]
  }
}
```

**Backend-Management:**

- Tauri startet den Node.js Backend-Prozess als Sidecar
- Backend laeuft auf `localhost:3457`
- Web-UI wird als Tauri WebView geladen (zeigt auf localhost)
- Bei App-Quit: Backend-Prozess wird sauber beendet
- Health-Check: Tauri pollt `/api/health` und zeigt Status im Tray

**System Tray:**

- Menubar-Icon (monochromes Template-Icon fuer macOS)
- Rechtsklick-Menue: Status, Open UI, Settings, Quit
- Badge/Indicator wenn Agent aktiv arbeitet

**Native Notifications:**

- Tauri Notification API fuer:
  - Agent hat Task abgeschlossen
  - Budget-Warning
  - Channel-Nachricht empfangen (wenn App nicht im Fokus)

**Akzeptanzkriterien:**

- [ ] `pnpm tauri build` erzeugt funktionierendes .dmg (macOS)
- [ ] App startet Backend automatisch beim Oeffnen
- [ ] System Tray Icon zeigt Agent-Status
- [ ] Native Notifications funktionieren
- [ ] App-Groesse unter 15MB (Tauri-Vorteil gegenueber Electron)
- [ ] Backend wird bei Quit sauber beendet (kein Zombie-Prozess)

### 15.2 Tauri Auto-Launch

- Optional: App beim System-Start automatisch starten
- Konfigurierbar in Settings
- macOS: Login Items API
- Windows: Registry / Startup Folder
- Linux: .desktop Autostart

---

## Woche 16 -- PWA

### 16.1 PWA Manifest + Service Worker

**Package:** `packages/web`

**Neue/Geaenderte Dateien:**

```
packages/web/
  public/
    manifest.json         # PWA Manifest
    icons/
      icon-192.png
      icon-512.png
      icon-maskable.png
  src/
    sw.ts                 # Service Worker
    lib/
      pwa.ts              # Registration, Update-Prompt
```

**manifest.json:**

```json
{
  "name": "OpenMotoko",
  "short_name": "Motoko",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0E1A",
  "theme_color": "#00F0FF",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Service Worker Strategie:**

- Cache-First fuer statische Assets (JS, CSS, Fonts, Images)
- Network-First fuer API Calls
- Offline: Chat-History aus Cache lesbar, neue Nachrichten gequeued
- Background Sync: Gequeued Messages werden gesendet wenn wieder online

**Akzeptanzkriterien:**

- [ ] "Install App" Prompt erscheint in Chrome/Safari
- [ ] PWA laeuft als Standalone-Fenster
- [ ] Offline: Chat-History ist lesbar
- [ ] Online-Recovery: Gequeued Messages werden gesendet
- [ ] App-Icon und Theme-Color korrekt

---

## Woche 17 -- Auto-Update + Accessibility

### 17.1 Auto-Update System

**Desktop (Tauri Updater):**

- Tauri's eingebauter Updater
- Update-Endpoint: GitHub Releases oder eigener Server
- User wird ueber verfuegbares Update informiert
- Ein-Klick-Update, kein manueller Download

**VPS/Docker (Watchtower):**

- Watchtower als optionaler Docker-Service in `docker-compose.yml`
- Pollt Docker Hub / GHCR fuer neue Image-Versionen
- Automatischer Container-Restart bei neuem Image
- Konfigurierbar: automatisch oder nur Notification

**In-App Changelog:**

```
packages/web/src/
  components/
    settings/
      changelog.tsx               # Zeigt letzte Updates
      update-banner.tsx           # Banner wenn Update verfuegbar
```

- Changelog wird von GitHub Releases API geladen
- Banner in der UI wenn neue Version verfuegbar
- "Jetzt updaten" oder "Spaeter" Optionen

**Akzeptanzkriterien:**

- [ ] Tauri zeigt Update-Dialog bei neuer Version
- [ ] Update installiert sich ohne Datenverlust
- [ ] Watchtower aktualisiert Docker-Container automatisch
- [ ] Changelog ist in-app lesbar
- [ ] Update-Banner erscheint bei neuer Version

### 17.2 Accessibility Audit

**Scope:** Gesamte Web-UI

**Checkliste (WCAG 2.1 AA):**

| Bereich | Anforderung | Implementierung |
|---|---|---|
| Kontrast | 4.5:1 fuer normalen Text, 3:1 fuer grossen Text | Alle Farbkombinationen pruefen, insbesondere --static auf --void |
| Tastatur | Alle interaktiven Elemente per Tab erreichbar | Focus-Styles definieren (--ghost outline) |
| Screen Reader | Alle UI-Elemente haben ARIA Labels | Radix UI liefert Basis, custom Components pruefen |
| Motion | `prefers-reduced-motion` respektieren | Alle Framer Motion Animationen deaktivierbar |
| Focus Trap | Modale Dialoge fangen Focus | Radix Dialog hat das eingebaut |
| Semantik | Korrekte Heading-Hierarchie, Landmarks | Header, Main, Nav, Aside korrekt setzen |
| Live Regions | Activity Feed Updates werden announced | `aria-live="polite"` auf Feed-Container |
| Schriftgroesse | Relative Einheiten (rem), kein px fuer Text | Alle Font-Sizes in rem |

**Dateien:**

```
packages/web/src/
  styles/
    accessibility.css     # Focus-Styles, Reduced-Motion, High-Contrast
  hooks/
    use-reduced-motion.ts # prefers-reduced-motion Hook
```

**Akzeptanzkriterien:**

- [ ] Lighthouse Accessibility Score >= 95
- [ ] Alle interaktiven Elemente per Tastatur bedienbar
- [ ] Screen Reader kann alle wesentlichen Inhalte vorlesen
- [ ] Animationen deaktivierbar via OS-Setting
- [ ] Kontrast-Verhaeltnis eingehalten fuer alle Farbkombinationen

---

## Woche 18 -- Windows Support + Docs

### 18.1 Windows Support

**Tauri Windows Build:**

- NSIS Installer (Standard Windows-Installer)
- Tray-Icon Kompatibilitaet (Windows System Tray)
- Pfad-Handling: Forward Slashes normalisieren
- Node.js Sidecar: Windows-kompatibles Binary

**Testing:**

| Test | Windows-spezifisch |
|---|---|
| Installation | NSIS Installer laeuft durch |
| Tray | Icon erscheint in Windows Tray |
| Backend | Node.js Sidecar startet korrekt |
| Pfade | Workspace-Pfade mit Backslashes funktionieren |
| Notifications | Windows Toast Notifications |

**Akzeptanzkriterien:**

- [ ] `pnpm tauri build` erzeugt .exe / .msi
- [ ] Installer laeuft auf Windows 10/11
- [ ] Alle Features funktionieren identisch zu macOS
- [ ] Pfade werden korrekt behandelt

### 18.2 Dokumentation

**Repository:** `docs/` Verzeichnis + `docs.openmotoko.ai`

```
docs/
  architecture/
    overview.md           # System-Architektur Diagramme
    api-reference.md      # REST + WebSocket API Docs
    data-model.md         # SQLite Schema Dokumentation
  deployment/
    local.md              # Desktop-App Installation
    vps.md                # Docker Compose auf VPS
    ec2.md                # AWS EC2 Setup
    tailscale.md          # Sicherer Remote-Zugriff
  skill-development/
    getting-started.md    # Ersten Skill erstellen
    manifest-spec.md      # Manifest Format Referenz
    capabilities.md       # Alle verfuegbaren Capabilities
    ipc-bridge.md         # IPC Kommunikation Details
    publishing.md         # Skill in Registry submitten
```

**Akzeptanzkriterien:**

- [ ] Jedes Deployment-Szenario hat eine vollstaendige Anleitung
- [ ] Skill SDK Dokumentation reicht aus um einen Skill zu bauen
- [ ] API Reference deckt alle Endpoints ab
- [ ] Docs sind in EN und DE verfuegbar

---

## Woche 19 -- Public Launch

### 19.1 Launch-Vorbereitung

**GitHub Repository:**

- README.md mit Hero-Image, Features, Quick Start
- CONTRIBUTING.md mit Contribution Guidelines
- LICENSE (MIT)
- GitHub Actions CI: Build, Test, Lint
- Release Workflow: Automatische Tauri Builds fuer macOS/Windows/Linux
- Issue Templates: Bug Report, Feature Request, Skill Submission

**Landing Page (openmotoko.ai):**

- Single-Page: Hero, Features, Screenshots, GitHub-Link, E-Mail-Liste
- Dark Theme konsistent mit App-Design
- Mobile-Responsive

**ProductHunt:**

- Vorbereitung: Screenshots, Video, Beschreibung
- Launch-Tag koordinieren

**Akzeptanzkriterien:**

- [ ] GitHub Repo ist public mit vollstaendiger README
- [ ] CI/CD Pipeline baut und testet automatisch
- [ ] Release-Artefakte (DMG, EXE, AppImage, Docker Image) werden automatisch erstellt
- [ ] Landing Page ist live
- [ ] ProductHunt Listing ist vorbereitet

---

## Technische Entscheidungen Phase 3

| Entscheidung | Wahl | Begruendung |
|---|---|---|
| Desktop Framework | Tauri 2.0 | ~8MB Binary vs ~150MB Electron, native Performance |
| Installer macOS | DMG | Standard fuer macOS Distribution |
| Installer Windows | NSIS | Leichtgewichtig, weit verbreitet |
| Installer Linux | AppImage | Distributions-unabhaengig |
| Auto-Update Desktop | Tauri Updater | Eingebaut, signierte Updates |
| Auto-Update Docker | Watchtower | Zero-Config, Community-Standard |
| PWA Caching | Workbox (via vite-plugin-pwa) | Bewiesene Strategien, einfache Config |
| Docs Platform | Markdown in Repo | Kein externer Service, versioniert mit Code |
