# SchaltungsTrainer

Kleine Webapplikation für Lehrlinge in der Elektrotechnik.

## Inhalt

Die App enthält ein Dashboard mit drei interaktiven Übungen:

1. **Schema-0-Schaltung** (ein Schalter, eine Lampe)
2. **Schema-3-Schaltung** (zwei Schaltstellen)
3. **Schema-6-Schaltung** (drei Schaltstellen)

Jede Übung zeigt den aktuellen Lampenzustand, gibt eine Aufgabe vor und vergibt Punkte beim Lösen.

## Struktur

- `pages/index.html` – Dashboard und Übungsansichten
- `styles/main.css` – Layout, Farben und Komponenten
- `scripts/app.js` – Spiel- und Schaltlogik
- `index.html` – Weiterleitung auf `pages/index.html`

## Starten

```bash
python -m http.server 8080
```

Dann im Browser öffnen:

- `http://localhost:8080`
