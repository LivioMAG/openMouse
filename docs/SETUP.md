# Wishlist App Setup

## 1) Supabase-Konfiguration (automatisch aus JSON)
Die App lädt URL und anon key automatisch aus:
- `config/supabase.json`

Es ist kein Eingabeformular im Frontend mehr nötig.

Wichtig:
- Nur `anon`/`publishable` Key verwenden (nie `service_role`).
- Bei statischem Hosting muss `config/supabase.json` mit ausgeliefert werden.

## 2) Direktes Login nach Registrierung
Die App registriert neue Nutzer:innen mit E-Mail + Passwort und versucht danach direkt einzuloggen.

Damit **keine E-Mail-Bestätigung** nötig ist, in Supabase Dashboard deaktivieren:
- Authentication → Providers → Email → „Confirm email“ = OFF

## 3) SQL Migration ausführen
Führe die Datei aus:
- `supabase/migrations/001_init_wishlist.sql`

Beispiel mit Supabase CLI:
```bash
supabase db push
```

## 4) Lokal starten
Ein einfacher statischer Server genügt:
```bash
python3 -m http.server 4173
```
Dann öffnen:
- `http://localhost:4173`

## Enthaltene Seiten
- Login/Register
- Dashboard
- Owner Wishlist Detail
- Öffentliche Share-Seite via `#/public/<slug>`
