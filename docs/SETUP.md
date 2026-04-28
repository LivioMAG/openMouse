# Wishlist App Setup

## 1) Supabase Environment
Nutze den anon public key (nicht service_role).

Option A (empfohlen für statisches Hosting):
- Setze im `index.html` vor `main.js`:
```html
<script>
  window.__SUPABASE_URL__ = 'https://<project>.supabase.co';
  window.__SUPABASE_ANON_KEY__ = '<anon-key>';
</script>
```

Option B:
- Starte die App einmal und hinterlege URL/Key im Konfigurationsformular.

## 2) SQL Migration ausführen
Führe die Datei aus:
- `supabase/migrations/001_init_wishlist.sql`

Beispiel mit Supabase CLI:
```bash
supabase db push
```

## 3) Lokal starten
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
