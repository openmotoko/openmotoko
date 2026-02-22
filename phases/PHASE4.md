# Phase 4 -- Community

**Zeitraum:** Ongoing nach Public Launch
**Ziel:** Wachsende Community, Third-Party Skills, erweiterbare Plattform.

---

## Voraussetzungen

- Phase 1-3 komplett abgeschlossen
- Public Launch erfolgt
- Skill Registry auf GitHub aktiv
- Mindestens 10 Community-Contributions (Issues, PRs, Skills)

---

## Community Skill Registry

### Ausbau der GitHub-basierten Registry

**Aktueller Stand (aus Phase 2):**

- `github.com/openmotoko/skill-registry`
- PR-basierter Submission-Prozess
- CI Manifest-Linting
- Manueller Review

**Erweiterungen:**

| Feature | Beschreibung | Trigger |
|---|---|---|
| Skill-Ratings | Sterne-Bewertung in der App, gespeichert als GitHub Discussions | Ab 20 Skills in der Registry |
| Download-Counter | Badge im Skill-Card, Daten aus API-Logs aggregiert | Ab 50 aktive User |
| Auto-Security-Scan | Statische Code-Analyse im CI (npm audit, eslint-plugin-security) | Sofort |
| Verified Badge | Gruener Badge fuer Skills die vom Core-Team reviewed wurden | Sofort |
| Dependency Check | CI prueft ob Skill-Dependencies bekannte Vulnerabilities haben | Sofort |

**Eigener Registry-Server:**

Erst wenn die Community das rechtfertigt (100+ Skills, signifikante Load auf GitHub API). Dann:

```
packages/registry-server/
  src/
    server.ts             # Fastify API
    routes/
      skills.ts           # Search, List, Detail
      publish.ts          # Skill Upload (authentifiziert)
      ratings.ts          # Bewertungen
    services/
      github-sync.ts      # Sync mit GitHub Repo
      security-scan.ts    # Automated Security Analysis
```

**Akzeptanzkriterien:**

- [ ] Community kann Skills via PR submitten
- [ ] CI blockt unsichere Skills automatisch
- [ ] Verified Badge unterscheidet reviewed von unreviewed Skills
- [ ] Wenn Registry-Server noetig: nahtloser Uebergang ohne Breaking Changes

---

## Skill SDK Dokumentation

### Developer Experience

**Ziel:** Ein Entwickler kann in unter 30 Minuten einen funktionierenden Skill erstellen.

**SDK Package:** `packages/skill-sdk`

**Erweiterungen:**

```
packages/skill-sdk/
  src/
    index.ts              # Re-exports
    types.ts              # Alle Typen fuer Skill-Entwicklung
    helpers.ts            # Utility-Funktionen (Input-Parsing, Output-Formatting)
    testing.ts            # Test-Harness: Skill lokal testen ohne laufenden Agent
  templates/
    basic/                # Minimaler Skill: manifest.json + index.ts
    with-network/         # Skill mit Network-Capability
    with-browser/         # Skill mit Browser-Capability
```

**CLI Tool (optional, spaeter):**

```bash
npx create-openmotoko-skill my-skill
```

Generiert Skill-Template mit korrektem Manifest, Types, und Test-Setup.

**Akzeptanzkriterien:**

- [ ] `packages/skill-sdk` exportiert alle noetige Typen
- [ ] Templates decken die haeufigsten Skill-Typen ab
- [ ] Test-Harness ermoeglicht lokales Testen ohne Agent
- [ ] Dokumentation ist vollstaendig und mit Beispielen

---

## Channel Adapter Plugin Interface

### Ziel: Third-Party Channels

**Aktueller Stand:** Channels sind hardcoded in `packages/channels/`.

**Erweiterung:** Plugin-Interface damit die Community eigene Channel-Adapter schreiben kann.

**Interface:**

```typescript
interface ChannelPlugin {
  id: string
  name: string
  version: string
  configSchema: ZodSchema

  create(config: unknown): ChannelAdapter
}

interface ChannelAdapter {
  start(): Promise<void>
  stop(): Promise<void>
  sendMessage(target: string, content: MessageContent): Promise<void>
  onMessage(handler: (msg: IncomingMessage) => void): void
  onError(handler: (err: Error) => void): void
  getStatus(): ChannelStatus
}

interface MessageContent {
  text: string
  attachments?: Attachment[]
  replyTo?: string
}
```

**Registrierung:**

- Channel-Plugins werden als npm-Packages installiert
- Registration via `openmotoko.config.ts` oder ueber die UI
- Config-Schema wird fuer das Settings-UI verwendet (automatische Form-Generierung)

**Beispiel-Kandidaten fuer Community-Channels:**

- Matrix
- Mastodon DMs
- Line
- WeChat
- Teams

**Akzeptanzkriterien:**

- [ ] Plugin-Interface ist stabil und dokumentiert
- [ ] Mindestens ein Core-Channel ist auf das Plugin-Interface migriert
- [ ] Community kann Channel-Plugins als npm-Packages publishen
- [ ] Config wird automatisch aus ZodSchema generiert

---

## Multi-Agent Support

### Agents die Agents spawnen

**Konzept:**

- Ein Primary Agent kann Sub-Agents fuer spezialisierte Tasks spawnen
- Sub-Agents haben eigene Conversations, Skills, und Budgets
- Primary Agent koordiniert und aggregiert Ergebnisse
- Jeder Sub-Agent ist in der Activity Feed separat sichtbar

**Architektur:**

```
packages/core/src/
  agents/
    manager.ts            # Agent-Pool, Lifecycle
    primary.ts            # Haupt-Agent mit Spawn-Capability
    sub-agent.ts          # Spezialisierter Sub-Agent
    types.ts              # AgentConfig, AgentRole, AgentStatus
```

**Use Cases:**

| Szenario | Primary Agent | Sub-Agent(s) |
|---|---|---|
| Research | Koordiniert Suche | Web-Search Agent, GitHub Agent |
| Code Review | Aggregiert Findings | Security Agent, Style Agent, Test Agent |
| Monitoring | Sammelt Reports | E-Mail Agent, GitHub Agent, Calendar Agent |

**UI-Erweiterungen:**

- Activity Feed zeigt Agent-Hierarchie (Primary -> Sub)
- Conversation kann mehrere Agents zeigen
- Budget wird pro Agent getrackt

**Akzeptanzkriterien:**

- [ ] Primary Agent kann Sub-Agents spawnen
- [ ] Sub-Agents laufen parallel
- [ ] Ergebnisse werden korrekt aggregiert
- [ ] Activity Feed zeigt Agent-Hierarchie
- [ ] Budget wird pro Agent separat getrackt

---

## Mobile Native App

### Bewertung: PWA vs React Native

**PWA-Vorteile:**

- Bereits vorhanden (Phase 3)
- Kein App-Store-Review
- Sofortige Updates
- Gleicher Code wie Web

**React Native Trigger:**

PWA reicht nicht mehr wenn:

- Push Notifications unzuverlaessig sind (Safari/iOS Limitierungen)
- Background-Sync nicht funktioniert
- User erwarten native Navigation (Gestures, Haptics)
- App-Store-Praesenz noetig fuer Vertrauen

**Falls React Native:**

```
packages/mobile/
  package.json
  app.json                # Expo Config
  src/
    app/                  # Expo Router
    components/           # Shared + Mobile-spezifische
    lib/                  # API Client, WebSocket, Store (shared mit web)
```

**Tech Stack:**

| Package | Version |
|---|---|
| expo | latest |
| expo-router | latest |
| react-native | latest |
| nativewind | latest |

**Shared Code Strategie:**

- `packages/core` Types werden geteilt
- API Client und WebSocket Logic in shared Package
- UI Components sind mobile-spezifisch (NativeWind statt Tailwind)
- Zustand Store-Logic kann geteilt werden

**Akzeptanzkriterien:**

- [ ] Entscheidung PWA vs Native basiert auf User-Feedback (nicht Annahmen)
- [ ] Falls Native: MVP mit Chat + Activity Feed
- [ ] Falls Native: Identische Funktionalitaet wie PWA
- [ ] Falls Native: TestFlight/Play Store Beta innerhalb 4 Wochen

---

## Laufende Community-Tasks

| Task | Frequenz | Verantwortlich |
|---|---|---|
| Skill Registry PRs reviewen | Taeglich | Core Team |
| Security Advisories pruefen | Woechentlich | Core Team |
| Community Issues triagen | Taeglich | Core Team |
| Release Notes schreiben | Pro Release | Core Team |
| Contributor Onboarding | Bei Bedarf | Core Team |
| Design System Updates | Quartal | Core Team |
| Dependency Updates | Monatlich | Automatisiert (Renovate) |
