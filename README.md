# openMouse – Frontend für Arbeitsumgebungen (Supabase)

Dieses Repository enthält ein vollständiges webbasiertes Frontend mit **HTML, CSS und JavaScript** für:

- Authentifizierung mit Supabase (Anmelden, Registrieren, OTP-Code per E-Mail)
- Übersicht von **Arbeitsumgebungen**
- Erstellen neuer Arbeitsumgebungen (nur mit aktivem Abo)
- Detailansicht einzelner Arbeitsumgebungen

## Projektstruktur

- `index.html` – Einstiegspunkt
- `styles.css` – UI-Styling (responsive, minimalistisch)
- `app.js` – App-Logik, Auth-State, Routen/Screens, Supabase-CRUD
- `supabaseClient.js` – Supabase Client-Initialisierung
- `config.example.js` – Beispiel für lokale Konfiguration

## Setup

1. Lokale Konfiguration anlegen:

```bash
cp config.example.js config.js
```

2. `config.js` mit deinen Supabase-Werten befüllen:

```js
window.__SUPABASE_URL__ = 'https://YOUR_PROJECT_REF.supabase.co';
window.__SUPABASE_ANON_KEY__ = 'YOUR_SUPABASE_ANON_KEY';
```

3. App lokal starten (ein einfacher statischer Server reicht), z. B.:

```bash
python -m http.server 8080
```

Dann im Browser öffnen: `http://localhost:8080`

---

## Benötigte „ENV“-Werte

Da das Projekt als statisches Frontend aufgebaut ist, werden die Werte über `config.js` bereitgestellt:

- `SUPABASE_URL` → `window.__SUPABASE_URL__`
- `SUPABASE_ANON_KEY` → `window.__SUPABASE_ANON_KEY__`

> Empfehlung: `config.js` nicht ins VCS committen und stattdessen je Deployment-Umgebung erzeugen.

---

## Erwartete Supabase-Tabellen

### 1) `profiles`

- `id uuid primary key` (gleich `auth.users.id`)
- `has_subscription boolean not null default false`

### 2) `arbeitsumgebungen`

- `id uuid primary key`
- `user_id uuid not null` (FK auf `auth.users.id`)
- `projektname text not null`
- `kommissionsnummer text not null`
- `created_at timestamptz not null default now()`

---

## SQL-Vorschlag (Tabellen + RLS Policies)

```sql
-- Optional: gen_random_uuid() benötigt meist pgcrypto
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  has_subscription boolean not null default false
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create table if not exists public.arbeitsumgebungen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  projektname text not null,
  kommissionsnummer text not null,
  created_at timestamptz not null default now()
);

alter table public.arbeitsumgebungen enable row level security;

create policy "arbeitsumgebungen_select_own"
  on public.arbeitsumgebungen
  for select
  using (auth.uid() = user_id);

create policy "arbeitsumgebungen_insert_own"
  on public.arbeitsumgebungen
  for insert
  with check (auth.uid() = user_id);
```

---

## OTP-Mail-Code-Flow in Supabase korrekt konfigurieren

Damit der Flow „Passwort vergessen / Code-Login per E-Mail-Code“ funktioniert:

1. In Supabase Auth die E-Mail-OTP-Variante verwenden (kein reiner Magic-Link-Flow).
2. E-Mail-Template so konfigurieren, dass der Einmalcode (Token/OTP) versendet wird.
3. Frontend nutzt:
   - `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`
   - `supabase.auth.verifyOtp({ email, token, type: 'email' })`

---

## Erfüllte Anforderungen

- Registrieren mit E-Mail + Passwort
- Anmelden mit E-Mail + Passwort
- Passwort-vergessen / Code-Login per E-Mail-OTP
- Nur eingeloggte Nutzer sehen geschützten Bereich
- Nutzer sieht nur eigene Arbeitsumgebungen
- Erstellen nur erlaubt, wenn `profiles.has_subscription === true`
- Pflichtfelder beim Erstellen: `Projektname`, `Kommissionsnummer`
- Detailansicht pro Arbeitsumgebung
