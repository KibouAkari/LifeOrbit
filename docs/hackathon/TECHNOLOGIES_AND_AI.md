# Technologien und Hilfsmittel

## Technischer Stack

Die technische Grundlage von LifeOrbit wurde während der Planung festgelegt und anschliessend umgesetzt.

| Technologie | Verwendung |
| --- | --- |
| React | Aufbau der Benutzeroberfläche |
| TypeScript | Programmierung und Typprüfung im Frontend |
| Vite | Entwicklungsumgebung und Frontend-Build |
| CSS | Gestaltung, Layout und Responsive Design |
| Lucide | Icons in der Anwendung |
| Python | Backend-Programmierung |
| FastAPI | API-Schnittstellen für Benutzer und Anwendungsdaten |
| Pydantic | Validierung von API-Daten |
| MongoDB Atlas | Speicherung von Konten und Inhalten |
| Vercel | Bereitstellung von Frontend und Backend |
| Google Identity Services | Anmeldung mit einem Google-Konto |
| Miro | Ideensammlung, Funktionsplanung und Strukturierung |

Weitere eingesetzte Python-Bibliotheken sind in [requirements.txt](../../requirements.txt) und [backend/requirements.txt](../../backend/requirements.txt) aufgeführt. Die direkten Frontend-Abhängigkeiten stehen in [package.json](../../package.json).

## Open-Source-Komponenten

LifeOrbit verwendet mehrere Open-Source-Frameworks und Bibliotheken. Der eigene Projektcode steht unter der [MIT-Lizenz](../../LICENSE). Die Rechte und Lizenzbedingungen der einzelnen Abhängigkeiten und externen Dienste gelten unabhängig davon und sind bei einer Veröffentlichung zu beachten.

Zu den wichtigsten Bibliotheken gehören React, TypeScript, Vite, FastAPI, Pydantic, PyMongo und Lucide. Die Liste der installierten Pakete sowie deren tatsächliche Versionen muss für eine vollständige Lizenzübersicht anhand der jeweiligen Entwicklungsumgebung überprüft werden.

## Unterstützung durch KI

Während der Entwicklung wurde **ChatGPT** als Hilfsmittel verwendet, unter anderem für Ideen zur Benutzeroberfläche, Codevorschläge, das Untersuchen von Fehlern und die Überarbeitung der Dokumentation.

Die Wahl des Projektthemas, die gemeinsame Planung und die Verantwortung für die Umsetzung liegen beim Team. Generierte Vorschläge und Code müssen auf ihre Funktion, Sicherheit und Eignung geprüft werden.

LifeOrbit enthält dadurch nicht automatisch eine KI-Funktion für Endbenutzer. Weitere KI-Werkzeuge werden hier nur genannt, wenn ihre tatsächliche Verwendung durch das Team bestätigt ist.

## Datenschutz und verantwortungsvolle Nutzung

Bei der Entwicklung von Anmeldungen, persönlichen Daten und geteilten Inhalten müssen Zugriffsrechte eingehalten werden. Vertrauliche Daten und Zugangsschlüssel gehören weder in den Quellcode noch in die Projektdokumentation.

Für technische Risiken und bekannte Einschränkungen verweisen wir auf die [Security-Dokumentation](../SECURITY_AUDIT.md).
