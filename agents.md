# Projektstruktur & Prozess (JavaScript + HTML + CSS + Supabase)

Diese Datei beschreibt eine **klare Trennung von UI, Logik, Konfiguration und Backend (Supabase)**.

## Ziele
- Frontend mit **HTML, CSS, JavaScript**.
- Saubere Trennung:
  - `src/ui` = Darstellung/Design
  - `src/logic` = Geschäftslogik
  - `config` = Konfigurationen (JSON)
  - `supabase` = SQL-Migrationen + Edge Functions (TypeScript)
- Minimalistisches, cartoon-artiges UI im Stil „freundlich wie Duolingo“.

---

## Empfohlene Ordnerstruktur

```txt
openMouse/
├─ docs/
│  └─ PROJEKT_STRUKTUR.md
├─ public/
│  └─ assets/
├─ src/
│  ├─ ui/
│  │  ├─ components/
│  │  ├─ pages/
│  │  └─ styles/
│  └─ logic/
│     ├─ services/
│     ├─ state/
│     └─ utils/
├─ config/
│  ├─ webhooks.json
│  ├─ supabase.json
│  └─ services.json
└─ supabase/
   ├─ migrations/
   │  └─ 001_init.sql
   └─ functions/
      ├─ health-check/
      │  └─ index.ts
      └─ process-webhook/
         └─ index.ts
```

---

## Verantwortungen je Bereich

### 1) UI (`src/ui`)
- **components/**: Wiederverwendbare UI-Bausteine (z. B. Card, Button, Progress).
- **pages/**: Seitenaufbau (z. B. Dashboard, Login).
- **styles/**: Globale Styles, Tokens (Farben, Radius, Abstände), Animationen.

**Design-Richtung (Duolingo-ähnlich):**
- Große, runde Elemente (z. B. Border-Radius 12–18px).
- Freundliche Primärfarben (Grün/Blau-Akzente).
- Viel Whitespace, klare Typografie, deutliche Hierarchie.
- Mikroanimationen (Hover/Press), aber minimalistisch.

### 2) Logik (`src/logic`)
- **services/**: API-Aufrufe, Supabase-Client-Nutzung, Webhook-Verarbeitung.
- **state/**: Zustandslogik (z. B. Session, UI-State, Datenstatus).
- **utils/**: Helper-Funktionen (Validierung, Formatierung, Mapper).

### 3) Konfiguration (`config`)
- **webhooks.json**: Webhook-URLs, Events, Aktivierung.
- **supabase.json**: Supabase URL/Projekt-Einstellungen (ohne echte Secrets im Repo).
- **services.json**: Andere externe Services (Feature-Flags, Endpunkte, Timeouts).

> Hinweis: Reale Credentials immer über Umgebungsvariablen/Secret-Store, nicht im Klartext commiten.

### 4) Supabase (`supabase`)
- **migrations/**: SQL-Migrationsdateien (Versionierung der DB-Struktur).
- **functions/**: Supabase Edge Functions in TypeScript.

---

## Prozessstruktur (End-to-End)

1. **Planung**
   - Feature definieren (User Story, Input/Output, API-Felder).
   - Betroffenen Bereich markieren: UI / Logik / DB / Function.

2. **Konfiguration prüfen**
   - `config/webhooks.json`, `config/supabase.json`, `config/services.json` aktualisieren.
   - Sicherstellen, dass keine Secrets hardcoded sind.

3. **Datenmodell & Migration**
   - SQL in `supabase/migrations/*.sql` erstellen.
   - Lokal/Stage testen, dann migrieren.

4. **Supabase Function entwickeln**
   - Neue Function in `supabase/functions/<name>/index.ts`.
   - Input validieren, Fehler sauber behandeln, strukturierte JSON-Response.

5. **Business-Logik im Frontend**
   - Service-Funktionen in `src/logic/services`.
   - State-Management in `src/logic/state`.

6. **UI umsetzen**
   - Komponenten + Seiten in `src/ui`.
   - Minimalistische Styles mit konsistenten Tokens.

7. **Test & QA**
   - Funktionale Tests (Happy Path + Error Path).
   - Webhook-Flow, DB-Schreib-/Lesezugriffe, UI-Feedback.

8. **Release**
   - Migration zuerst, danach Functions, danach Frontend.
   - Monitoring auf Webhook-Fehler und DB-Errors.

---

## Nächste sinnvolle Schritte
- Eine gemeinsame `env`-Strategie definieren (`.env.example`).
- Basis-Design-Tokens in `src/ui/styles` anlegen.
- Erste echte Migration + erste echte Function mit Domain-Logik umsetzen.
