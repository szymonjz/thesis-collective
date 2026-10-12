# thesis collective

Ein deutschsprachiger, gemeinsamer Forschungsraum für **Jan, Marcel, Ole, Szymon, Paul und Bolivar**.

## Was enthalten ist

- Sechs persönliche Ideenbereiche und ein gemeinsames Themenboard.
- Forschungsfrage, Ansatz, Datenquellen-Link, Tags und Status je Idee.
- Abstimmungen, Kommentare, Suche und Sortierung.
- CSV-/TSV-Import sowie manuelle Tabelleneingabe mit bearbeitbaren Spalten und Zeilen.
- Balken-, Linien- und Streudiagramme mit frei wählbaren Achsen und explizitem Zahlenformat.
- Gespeicherte Diagramm-Einstellungen und Erkenntnisse; CSV- und SVG-Export.
- Supabase Realtime für Ideen, Stimmen, Kommentare und Daten; zusätzlich Abgleich alle 15 Sekunden und beim Wechsel zurück zum Tab.
- Responsive Oberfläche, Tastaturbedienung, native Dialoge, Dark Mode und reduzierte Animationen.

## Wichtig: Status & Zugriff

**Das Projekt ist fertig zum Konfigurieren und Bereitstellen, aber noch nicht öffentlich gehostet.** Ohne Umgebungsvariablen startet eine deutlich markierte lokale Demo. Die Demo-Beispiele sind fiktiv und werden NICHT ins Live-Projekt kopiert. Demo-Änderungen bleiben in diesem Browser; Tabs desselben Browsers gleichen sich über Browser-Speicher ab. Sie sind kein Live-Test der Supabase-Anbindung.

Der gewünschte offene Link ist **kein privater oder verifizierter Teamraum**. Supabase erstellt eine anonyme Identität je Browsersitzung; anschließend wählt die Person einen der sechs Anzeigenamen. Jeder mit dem Link kann beitreten und einen beliebigen Namen wählen. Stimmen sind pro anonymer Sitzung, nicht pro tatsächlich verifiziertem Gruppenmitglied.

Bearbeiten, Statuswechsel und Löschen dürfen nur die Sitzungen, die den Eintrag erstellt haben. Einträge einer Sitzung bleiben ihr zugeordnet, auch wenn der Anzeigename für neue Einträge gewechselt wird. Ein anderes Gerät, Inkognito-Modus oder gelöschte Browserdaten erzeugen eine neue Identität. Die Bearbeitungsrechte alter Einträge sind dann nicht automatisch wiederherstellbar. Ein Projektadmin kann im Supabase-Dashboard Daten verwalten. Die Oberfläche enthält keine Admin-Schlüssel.

**Keine vertraulichen, personenbezogenen oder nicht zur Weitergabe lizenzierten Daten hochladen.** Für stärkeren Schutz wäre eine spätere Umstellung auf verifizierte E-Mail-Anmeldung und Einladungen sinnvoll. Der offene Link kann kopiert oder weitergegeben werden; nur die URL schwer zu erraten ist kein Zugriffsschutz.

## 1. Lokal starten

Voraussetzung: **Node.js 22.12+** (Node 24 wurde getestet) und npm.

```sh
npm ci
npm run dev
```

Die in der Konsole angezeigte lokale Adresse öffnen. Ohne Supabase-Konfiguration kannst du alle Oberflächen mit Demo-Daten ausprobieren. Ein echter gemeinsamer Raum benötigt die folgenden Schritte.

## 2. Supabase konfigurieren

1. Ein **neues, eigenes Supabase-Projekt nur für diese App** erstellen. Das SQL verwendet die Tabellen `ideas`, `votes`, `comments` und `datasets`; nicht in einer fremden Datenbank mit gleichnamigen Tabellen ausführen.
2. Im Supabase **SQL Editor** den vollständigen Inhalt von `supabase/schema.sql` ausführen. Das legt Tabellen, Prüfregeln, Row Level Security, eingeschränkte Schreibrechte und die Realtime-Publikation an. Gegen dieses App-Schema ist das Skript wiederholbar.
3. Unter **Authentication** die **Anonymous Sign-Ins** aktivieren. Die App nutzt kein E-Mail- oder Passwortformular.
4. Aus den Projekt-/API-Einstellungen die **Project URL** und den **öffentlichen Publishable Key** (`sb_publishable_…`) oder den alten öffentlichen **anon key** kopieren. **Niemals** `service_role`, einen Secret Key oder ein Datenbankpasswort in den Browser oder eine `VITE_`-Variable setzen.
5. `.env.example` zu `.env` kopieren und die zwei Werte eintragen:

```dotenv
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN-OEFFENTLICHER-KEY
```

6. Entwicklungsserver neu starten. Der Demo-Hinweis verschwindet; der reale Raum startet **leer**. Oben sollte nach der Anmeldung „Live verbunden“ stehen.

Das SQL erlaubt angemeldeten anonymen Sitzungen das Lesen aller Gruppeninhalte. Nicht angemeldete API-Anfragen haben keine Tabellenrechte. Schreibzugriffe prüfen die Sitzungs-ID, nicht den frei gewählten Namen. IDs, Erstellungsdatum und Urheberschaft können durch Clients nicht verändert werden. Die Datenbank begrenzt Datenformate und Größen ebenfalls; sie vertraut nicht ausschließlich der Oberfläche.

### Missbrauch / Kosten

Supabase empfiehlt für anonyme Anmeldung CAPTCHA/Turnstile und setzt Anmelderatenlimits. Diese Version hat **keine CAPTCHA-Oberfläche**. Nicht breit öffentlich bewerben. Provider-Ratenlimits und Verbrauch regelmäßig kontrollieren. Wenn CAPTCHA aktiviert wird, muss zuerst eine Token-Eingabe/Turnstile-Integration in der App ergänzt werden, sonst schlägt die Anmeldung fehl. Die sechs Namen sind keine Begrenzung auf sechs tatsächliche Besucher. Kostenloses Hosting ist nicht garantiert: Angebote, Pausierung inaktiver Projekte, Quoten und Abrechnung liegen bei den Anbietern.

## 3. Auf Vercel veröffentlichen

1. Den **Inhalt dieses Projektordners** in ein neues GitHub-Repository hochladen. Nicht `node_modules`, `dist` oder eine ausgefüllte `.env` hochladen. `.gitignore` ist enthalten.
2. In Vercel **Add New → Project** wählen und das Repository importieren.
3. Framework **Vite**, Build Command **`npm run build`**, Output Directory **`dist`**, Node.js **24.x**. Falls das Repository diesen Ordner als Unterordner enthält, ihn als Root Directory wählen.
4. Die zwei oben genannten `VITE_`-Variablen in Vercel unter **Environment Variables** für Production eintragen; für Preview/Development bei Bedarf ebenfalls. Es sind öffentliche Browserwerte. Das Backend wird über RLS geschützt, nicht durch das Verstecken des öffentlichen Keys.
5. **Deploy**. Bei späteren Änderungen an Umgebungsvariablen **neu deployen**, da Vite die Werte beim Build einsetzt.
6. Die `https://….vercel.app`-Adresse öffnen, den Live-Status prüfen und den Link über „Link teilen“ weitergeben.

`vercel.json` enthält Sicherheitsheader und eine Content Security Policy für die Standard-Supabase-Domain. Wer eine eigene Supabase-Domain verwendet, muss sie unter `connect-src` ergänzen. Es gibt keine clientseitigen Pfadrouten, deshalb wird keine SPA-Rewrite-Regel benötigt.

## 4. Live-Abnahme mit zwei Geräten

Vor der gemeinsamen Nutzung bitte mit zwei unabhängigen Browsern oder Geräten testen:

- A wählt Jan, B wählt Ole.
- A erstellt eine Idee → B sieht sie ohne Neuladen.
- B stimmt ab und kommentiert → A sieht die Änderungen.
- A ändert den Status → B sieht den neuen Status.
- A lädt eine CSV oder manuelle Tabelle hoch → B sieht Datensatz und Diagramm.
- A speichert Diagramm-Einstellungen und Erkenntnisse → B sieht sie.
- B kann A's Einträge lesen, aber nicht bearbeiten/löschen.
- Zwei Tabs derselben Sitzung bearbeiten denselben Eintrag: eine veraltete Speicherung wird mit Hinweis abgelehnt, statt neue Daten zu überschreiben.
- WLAN kurz unterbrechen: Verbindungsanzeige wechselt, Daten bleiben sichtbar; nach Wiederverbindung wird der aktuelle Stand geladen. Offline-Schreiben wird **nicht** in einer versteckten Queue gesammelt; bei Fehlschlag bleiben Formularwerte zum erneuten Speichern erhalten.

Die Cloud-Verbindung wurde mangels eigener Supabase-/Vercel-Zugangsdaten **nicht** in einem tatsächlichen Nutzerprojekt getestet. Lokale Daten- und PostgreSQL-Zugriffsprüfungen sind kein Ersatz für diese Live-Abnahme.

## CSV & Diagramme

- UTF-8, erste Zeile mit eindeutigen, nicht leeren Spaltennamen. Komma, Semikolon und Tab werden erkannt; Anführungszeichen werden berücksichtigt.
- Maximal **2 MB Datei**, **2.000 Datenzeilen**, **30 Spalten**, **500 Zeichen pro Zelle**, **1 MB gespeicherte Tabellenzeilen**. Geeignet für kleine explorative Datensätze, nicht für große Data-Science-Rohdaten oder Streaming.
- Dezimalpunkt und Dezimalkomma sind ausdrücklich wählbar. Keine automatische Interpretation von Tausendertrennzeichen: `1.234` im Punkt-Modus bedeutet 1,234, nicht 1234. `1.234,5` wird abgelehnt. Prozentzeichen und Einheiten nicht in Zahlenzellen schreiben; Einheiten separat angeben. Fehlende oder ungültige Werte werden nie als null interpretiert.
- Balken: ein Balken je Zeile; gleiche Kategorien werden **nicht** automatisch addiert. Höchstens erste 40 gültige Zeilen. Auslassungen werden angezeigt.
- Linien: numerische X-Werte oder ISO-Datumswerte (`YYYY-MM-DD`), nach X sortiert; höchstens 500 gültige Zeilen. Vor dem Verbinden zeitliche Ordnung und Datenlücken prüfen.
- Streuung: zwei numerische Spalten; höchstens 500 vollständige Wertepaare. Keine automatische Trendlinie oder Kausalitätsbehauptung.
- Einstellungen anderer Personen kann man lokal ausprobieren; gemeinsam speichern darf nur die erstellende Sitzung.
- Exakte dargestellte Werte sind in der ausklappbaren Wertetabelle verfügbar. Die vollständigen Daten liegen im Daten-Tab und im CSV-Export vor.
- CSV-Export schützt vor Tabellenkalkulations-Formeln durch Präfixe bei Zellen, die mit `=`, `+`, `-`, `@`, Tab oder CR beginnen. Der rohe gespeicherte Datensatz bleibt unverändert. Negative Zahlen können deshalb nach Export in einer Tabellenkalkulation als Text erscheinen.
- SVG-Export enthält das aktuelle Diagramm, nicht die darunterstehenden Forschungsnotizen. Notizen und Chart-Einstellungen werden als Text/JSON mitgespeichert.

## Gleichzeitige Arbeit

Supabase sendet Änderungsereignisse für alle vier Tabellen. Die App bündelt Ereignisse kurz und lädt danach einen aktuellen Stand; bei Wiederverbindung, Fokuswechsel und zusätzlich alle 15 Sekunden ebenfalls. Das ist gemeinsame Datenaktualisierung, **kein** Live-Cursor-/Zeichen-für-Zeichen-Editor. Formularentwürfe werden erst nach Speichern geteilt. Bei zwei gleichzeitigen Bearbeitungen desselben Eintrags wird über `updated_at` die ältere Version erkannt und abgelehnt. Entwürfe bleiben im geöffneten Dialog, werden aber nicht als separate Entwürfe nach einem Seiten-Reload gespeichert.

Einzelne Stimmen und Kommentare sind getrennte Datensätze. Der Client liest paginiert, statt Supabases Standardgrenze von 1.000 Zeilen still zu übersehen. Alle Datensätze werden für diesen kleinen Gruppenraum geladen; für größere Datenmengen wäre selektives Laden/Dateispeicherung sinnvoll.

## Tests

```sh
npm test
npm run build
npm audit
```

Die automatisierten Tests prüfen CSV, Zahlenformate, fehlende Werte, Diagramm-Limits, URL-Sicherheit sowie RLS, Schreibrechte, Konflikte und Löschverhalten in einem lokalen PostgreSQL-WASM (PGlite). Die PGlite-Prüfung lässt Supabases Realtime-Publikation aus, weil dort keine logische Replikation verfügbar ist.

Optionaler Browser-Test (Playwright und Chromium erforderlich):

```sh
npm install --no-save playwright
npm run build
npm run preview -- --port 4173
# In einem zweiten Terminal; verwendet eigene Test-Demo-Daten:
CHROMIUM_PATH=/pfad/zu/chromium node tests/browser.mjs
```

`TEST_URL` und `QA_DIR` können gesetzt werden. Dieser Test prüft die **lokale Demo**, nicht Supabase Cloud. QA-Dateien landen standardmäßig unter `/data/thesis-qa`; mit `QA_DIR=./qa` lässt sich ein anderer Ordner wählen.

## Projektstruktur

```text
src/App.tsx         Navigation, persönliche Bereiche, Ideen, Kommentare
src/DataLab.tsx     CSV-/Tabelleneditor, Diagramme und Erkenntnisse
src/store.ts        Supabase, anonyme Sitzung, Realtime, Speicherung
src/data.ts         CSV, Validierung, Zahlen und Export
src/types.ts        Datenmodell, Teamnamen und Status
src/demo.ts         Klar markierte, fiktive lokale Beispieldaten
src/ui.tsx          Gemeinsame Dialoge, Avatar und Links
src/theme.css       Design-Tokens, responsive Layouts und Dark Mode
supabase/schema.sql Tabellen, RLS, Prüfregeln und Realtime
vercel.json         Deployment und Sicherheitsheader
tests/              Daten-, Datenbank- und Browserprüfungen
```

Version 1.0 · 12. Oktober 2026. Die vollständigen Quellen werden außerdem im privaten Notion Project Hub gespeichert. Keine geheimen Zugangsdaten sind im Projekt enthalten.
