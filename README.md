# openMouse – Frontend für Arbeitsumgebungen (Supabase)

Dieses Repository enthält ein webbasiertes Frontend mit **HTML, CSS und JavaScript** für:

- Authentifizierung mit Supabase (Anmelden, Registrieren, OTP-Code per E-Mail)
- Übersicht von **Arbeitsumgebungen**
- Erstellen neuer Arbeitsumgebungen (nur mit aktivem Abo)
- Detailansicht einzelner Arbeitsumgebungen

## Projektstruktur

- `pages/` – HTML-Seiten
  - `pages/index.html` – App-Seite
- `styles/` – CSS-Dateien
  - `styles/main.css` – zentrales Styling
- `scripts/` – JavaScript-Dateien
  - `scripts/app.js` – UI- und App-Logik
  - `scripts/supabaseClient.js` – Supabase-Client Initialisierung
  - `scripts/configLoader.js` – Laden von JSON-Konfigurationen
- `config/` – Konfigurationsdateien als JSON
  - `config/supabase.json`
  - `config/webhooks.json`
  - `config/app.json`
- `sql/` – SQL-Dateien für Supabase
  - `sql/001_create_profiles_and_arbeitsumgebungen.sql`
- `index.html` – Weiterleitung auf `pages/index.html`

## Setup

1. Trage deine Supabase-Credentials in `config/supabase.json` ein:

```json
{
  "url": "https://YOUR_PROJECT_REF.supabase.co",
  "anonKey": "YOUR_SUPABASE_ANON_KEY"
}
```

2. Optional: Pflege Webhooks in `config/webhooks.json`.

3. App lokal starten (ein statischer Server reicht), z. B.:

```bash
python -m http.server 8080
```

Dann im Browser öffnen: `http://localhost:8080`

## Hinweis zu Konfiguration

Alle projektspezifischen Einstellungen (Supabase, Webhooks, App-Werte) liegen jetzt in `config/*.json` als Key-Value-Struktur.

## Erwartete Supabase-Tabellen

Die initiale SQL liegt in:

- `sql/001_create_profiles_and_arbeitsumgebungen.sql`

Führe diese Datei in Supabase SQL Editor aus.
