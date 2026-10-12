import type { Snapshot, Member } from './types';
const date = '2026-10-12T09:30:00Z';
export const demoOwner = (member: Member) => `demo-${member}`;
export function demoSnapshot(): Snapshot {
  const entries = [
    [
      'Jan',
      'Was macht eine Stadt fahrradfreundlich?',
      'Wie hängen Radinfrastruktur und Verkehrsunfälle in Berlin zusammen?',
      'Offene Mobilitätsdaten verbinden und Bezirke vergleichbar machen.',
      'https://daten.berlin.de/',
      ['Mobilität', 'Open Data'],
    ],
    [
      'Marcel',
      'Der Preis des Wohnens',
      'Welche Merkmale erklären die Unterschiede bei Berliner Mietpreisen?',
      'Ein Regressionsmodell für Lage, Fläche und Ausstattung entwickeln.',
      'https://www.destatis.de/',
      ['Wohnen', 'Regression'],
    ],
    [
      'Ole',
      'Strom verstehen. Verbrauch vorhersagen.',
      'Wie gut lässt sich der Stromverbrauch aus Wetterdaten vorhersagen?',
      'Zeitreihen untersuchen und eine einfache Baseline mit ML vergleichen.',
      'https://www.smard.de/',
      ['Energie', 'Zeitreihen'],
    ],
    [
      'Szymon',
      'Luftqualität im Rhythmus der Stadt',
      'Wie unterscheiden sich Feinstaubwerte nach Tageszeit und Standort?',
      'Messwerte explorieren; Zusammenhänge sind keine Kausalität.',
      'https://www.umweltbundesamt.de/daten/luft',
      ['Umwelt', 'Visualisierung'],
    ],
  ] as const;
  return {
    ideas: entries.map(
      ([member, title, question, description, source_url, tags], i) => ({
        id: `demo-idea-${i}`,
        owner_id: demoOwner(member),
        member,
        title,
        question,
        description,
        source_url,
        tags: [...tags],
        status: i === 0 ? 'shortlisted' : 'idea',
        created_at: date,
        updated_at: date,
      }),
    ),
    votes: ['Jan', 'Ole', 'Szymon'].map((member) => ({
      idea_id: 'demo-idea-0',
      user_id: demoOwner(member as Member),
      member: member as Member,
      created_at: date,
    })),
    comments: [
      {
        id: 'demo-comment-1',
        idea_id: 'demo-idea-0',
        owner_id: demoOwner('Ole'),
        member: 'Ole',
        body: 'Spannende Frage. Wir sollten die Datenverfügbarkeit je Bezirk zuerst prüfen.',
        created_at: date,
      },
    ],
    datasets: [
      {
        id: 'demo-data-1',
        owner_id: demoOwner('Szymon'),
        member: 'Szymon',
        idea_id: 'demo-idea-3',
        name: 'Luftqualität · Beispieldaten',
        source_url: '',
        columns: ['Monat', 'PM10 (µg/m³)', 'Temperatur (°C)'],
        rows: [
          ['Jan', '28', '2'],
          ['Feb', '25', '4'],
          ['Mär', '22', '8'],
          ['Apr', '19', '12'],
          ['Mai', '16', '17'],
          ['Jun', '14', '21'],
        ],
        chart: { kind: 'bar', x: 0, y: 1, decimal: 'dot', unit: 'µg/m³' },
        findings:
          'Fiktive Beispieldaten zur Vorschau. Keine echten Messwerte oder Forschungsergebnisse.',
        created_at: date,
        updated_at: date,
      },
    ],
  };
}
