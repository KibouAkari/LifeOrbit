# Planung und Entwicklung

## 1. Ideensammlung in Miro

Unsere Arbeit begann mit dem gemeinsamen Miro-Board. Dort hielten wir erste Ideen für LifeOrbit fest und sammelten Funktionen, die für einen persönlichen Life Manager sinnvoll sein könnten.

In dieser Phase stand noch nicht die Umsetzung im Vordergrund. Zuerst wollten wir ein gemeinsames Verständnis davon entwickeln, was die Anwendung können soll.

## 2. Funktionen genauer beschreiben

Aus der anfänglichen Sammlung machten wir anschliessend eine strukturiertere Übersicht. Wir fassten verwandte Ideen zusammen, beschrieben die geplanten Funktionen genauer und besprachen, welche Bereiche zusammengehören.

Die Gliederung in Dashboard, Tasks, Calendar, Notes, Subscriptions und Challenges bildete später auch die Grundlage für die Navigation der Webanwendung.

## 3. Aufgaben im Team verteilen

Nach der Strukturierung besprachen wir die Aufteilung der Arbeiten. Dabei mussten Frontend, Backend, Datenhaltung, Gestaltung und die Verknüpfung der Funktionen berücksichtigt werden.

Die genaue Zuordnung einzelner Funktionen zu Teammitgliedern lässt sich anhand der ursprünglichen Miro-Planung und der Git-Commits nachvollziehen. In dieser Dokumentation werden keine Zuständigkeiten behauptet, die nicht durch diese Unterlagen bestätigt sind.

## 4. Technische Grundlagen festlegen

Vor dem eigentlichen Programmieren beschäftigten wir uns mit dem Aufbau der Anwendung. Wir mussten entscheiden, wie wir die Oberfläche entwickeln, wie die API aufgebaut wird, wie Benutzerdaten gespeichert werden und wie die Anwendung bereitgestellt werden soll.

Der umgesetzte technische Aufbau sieht so aus:

| Bereich | Eingesetzte Lösung |
| --- | --- |
| Benutzeroberfläche | React, TypeScript und Vite |
| Gestaltung | CSS und Lucide-Icons |
| Backend | Python und FastAPI |
| Datenbank | MongoDB Atlas |
| Hosting | Vercel |
| Anmeldung | E-Mail/Passwort sowie Google-Anmeldung |
| Gemeinsame Planung | Eigene API-Endpunkte und Datenbankzugriffe |

Diese Tabelle beschreibt die tatsächlich verwendeten Technologien. Einzelheiten zu diskutierten Alternativen oder ursprünglichen Entscheidungsgründen lassen sich nur mit den damaligen Planungsnotizen ergänzen.

## 5. Aufbau des Prototyps

Nachdem die Grundentscheidungen getroffen waren, begannen wir mit der Implementierung. Zuerst musste eine funktionierende Grundlage entstehen, auf der sich die einzelnen Bereiche aufbauen und verbinden liessen.

Die fertige Codebasis umfasst eine React-Oberfläche mit wiederverwendbaren Komponenten, ein Python-Backend mit mehreren API-Routen sowie eine MongoDB-Datenhaltung für Benutzerkonten und persönliche Inhalte.

Im weiteren Verlauf wurden Funktionen erweitert, miteinander verbunden und an verschiedenen Stellen überarbeitet. Dazu gehören insbesondere die Kalenderbedienung, die Freigabe von Inhalten, die Accountverwaltung und die Anpassung für kleinere Bildschirme.

Die vollständige technische Änderungshistorie befindet sich in der [CHANGELOG.md](../../CHANGELOG.md). Die Commits und Pull Requests im Repository zeigen die einzelnen Entwicklungsschritte.

## 6. Integration und Fehlerbehebung

Beim Verbinden von Frontend, Backend und Datenbank mussten wir berücksichtigen, dass Änderungen dauerhaft gespeichert werden und Benutzer nur auf berechtigte Inhalte zugreifen dürfen. Auch die Bedienung des Kalenders, das Aktualisieren gemeinsamer Inhalte und das responsive Design erforderten mehrere Anpassungen.

Dabei zeigte sich, wie wichtig eine klare Trennung zwischen Benutzeroberfläche, API und Datenhaltung ist. Ebenso wurde deutlich, dass eine Funktion nicht nur optisch fertig sein darf, sondern auch nach einem Neuladen, auf verschiedenen Geräten und bei mehreren Benutzern korrekt funktionieren muss.

## 7. Ergebnis der Entwicklung

Aus einer Ideensammlung entstand eine zusammenhängende Webanwendung mit mehreren nutzbaren Bereichen. Besonders wesentlich war für uns der Weg von der gemeinsamen Planung über die Architekturentscheidungen bis zur konkreten Umsetzung.

Die für eine abschliessende Auswertung relevanten Testresultate, Screenshots und Zuordnungen der Teamarbeit ergeben sich aus den tatsächlichen Projektmaterialien. Wir verzichten hier bewusst auf unbestätigte Zeitangaben, erfundene Kennzahlen oder nachträglich zugeschriebene Aufgaben.
