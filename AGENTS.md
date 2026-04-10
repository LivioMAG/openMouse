# AGENTS.md

## Zweck
Dieses Repository ist ein kleines bis mittleres Webprojekt mit:
- HTML
- CSS
- JavaScript
- Supabase als Backend

Arbeite immer sauber, modular und mit klarer Trennung der Verantwortlichkeiten.

---

## Grundprinzipien
- Halte Änderungen klein und nachvollziehbar.
- Bevorzuge einfache und wartbare Lösungen.
- Verändere bestehenden Code nur so stark wie nötig.
- Mache keine unnötigen Refactorings.
- Halte dich an die bestehende Struktur dieses Repositories.
- Wenn neue Dateien erstellt werden, ordne sie in die passende Ordnerstruktur ein.

---

## Projektstruktur
Verwende nach Möglichkeit diese Struktur:

- `pages/`  
  Enthält einzelne HTML-Unterseiten und Seitenstrukturen.

- `styles/`  
  Enthält alle CSS-Dateien.

- `scripts/`  
  Enthält alle JavaScript-Dateien.

- `components/`  
  Optionale wiederverwendbare UI-Bausteine, falls das Projekt das benötigt.

- `assets/`  
  Enthält Bilder, Icons, Fonts und sonstige statische Dateien.

- `config/`  
  Enthält Konfigurationsdateien als JSON mit Key-Value-Struktur.

- `sql/`  
  Enthält alle SQL-Dateien für Supabase in fortlaufender Nummerierung.

---

## HTML-Regeln
- HTML-Dateien für Unterseiten klar voneinander trennen.
- Verwende semantische HTML-Tags, wenn sinnvoll.
- Keine unnötig verschachtelten Container.
- Struktur soll lesbar und übersichtlich sein.
- Wiederkehrende Bereiche möglichst konsistent benennen.
- Keine Logik direkt in HTML schreiben, außer wenn technisch unvermeidbar.

---

## CSS-Regeln
- CSS immer getrennt von HTML halten.
- Keine Inline-Styles.
- Styles zentral in `styles/` organisieren.
- Bevorzuge klare, wiederverwendbare Klassennamen.
- Keine unnötigen doppelten oder widersprüchlichen Regeln.
- Keine `!important`, außer wenn es wirklich nicht anders geht.
- Layout, Komponenten und Utility-Regeln sauber trennen, falls das Projekt wächst.

---

## JavaScript-Regeln
- JavaScript immer getrennt von HTML halten.
- Kein unnötiger Inline-JavaScript-Code im HTML.
- Lege Skripte in `scripts/` ab.
- Bevorzuge kleine, klar benannte Funktionen.
- Vermeide globale Variablen, wenn möglich.
- Trenne DOM-Logik, API-Logik und Hilfsfunktionen.
- Bestehende Patterns im Projekt zuerst wiederverwenden.
- Keine neue Library einführen, wenn die Aufgabe auch mit Vanilla JavaScript lösbar ist, außer es wurde ausdrücklich gewünscht.

---

## Supabase-Regeln
- Supabase ist das Backend.
- SQL-Änderungen niemals stillschweigend in bestehende alte SQL-Dateien einarbeiten.
- Jede neue SQL-Anpassung bekommt eine neue Datei in `sql/`.
- Nummerierung immer fortlaufend:
  - `001_...sql`
  - `002_...sql`
  - `003_...sql`
  - usw.
- Bereits ausgeführte SQL-Dateien werden nicht nachträglich umgebaut.
- Wenn sich das Datenmodell ändert, erstelle eine neue SQL-Datei statt eine alte zu überschreiben.
- Jede SQL-Datei soll einen kurzen, klaren Namen bekommen.

### Beispiel
- `001_create_profiles_table.sql`
- `002_add_status_to_profiles.sql`
- `003_create_orders_table.sql`

---

## SQL-Arbeitsweise
Wenn eine Änderung an der Datenbank nötig ist:
1. Prüfe, ob bereits eine passende frühere SQL-Datei existiert.
2. Ändere diese Datei nicht, wenn sie bereits Teil der Historie ist.
3. Erstelle stattdessen eine neue Datei mit der nächsten freien Nummer.
4. Formuliere SQL so, dass die Änderung klar nachvollziehbar bleibt.
5. Beschreibe kurz, wofür die neue SQL-Datei gedacht ist.

---

## Konfiguration und Secrets
Alle Konfigurationen und Schlüssel müssen außerhalb des Anwendungscodes gepflegt werden.

Diese Werte dürfen nicht hart im Code stehen:
- Supabase URL
- Supabase Keys
- Webhook-URLs
- API-Keys
- sonstige Tokens
- projektspezifische Konfigurationswerte

Lege solche Werte in `config/` als JSON-Dateien ab.

### Beispiele
- `config/supabase.json`
- `config/webhooks.json`
- `config/app.json`

### Format
Verwende eine klare Key-Value-Struktur.

Beispiel für `config/supabase.json`:
```json
{
  "url": "YOUR_SUPABASE_URL",
  "anonKey": "YOUR_SUPABASE_ANON_KEY"
}
