import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    execFileSync('which', ['chromium'], { encoding: 'utf8' }).trim(),
  headless: true,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const folder = process.env.QA_DIR || '/data/thesis-qa';
fs.mkdirSync(folder, { recursive: true });
const url = process.env.TEST_URL || 'http://localhost:4173';
const snap = async (name) => {
  await page.screenshot({ path: `${folder}/${name}.png`, fullPage: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth + 1,
  );
  assert.equal(overflow, false, `Overflow in ${name}`);
};
try {
  await page.goto(url);
  await page.getByRole('dialog').waitFor();
  await snap('01-picker-desktop');
  await page.getByRole('button', { name: 'Szymon', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await snap('02-board-desktop');
  await page
    .getByRole('button', { name: 'Themenidee hinzufügen', exact: true })
    .click();
  await page
    .getByLabel('Titel', { exact: true })
    .fill('Test der Zusammenarbeit');
  await page
    .getByLabel('Forschungsfrage', { exact: true })
    .fill('Wie unterscheiden sich unsere Daten?');
  await page
    .getByLabel('Ansatz & Machbarkeit', { exact: true })
    .fill('Ein einfacher Vergleich.');
  await page
    .getByLabel('Link zur Datenquelle')
    .fill('https://example.com/data');
  await page.getByLabel('Tags', { exact: true }).fill('Open Data, Test');
  await snap('03-idea-editor-desktop');
  await page
    .getByRole('button', { name: 'Idee speichern', exact: true })
    .click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const card = page
    .locator('.idea-card')
    .filter({ hasText: 'Test der Zusammenarbeit' });
  assert.equal(await card.count(), 1);
  await card.getByRole('button', { name: /Für Idee stimmen/ }).click();
  assert.equal(
    await card
      .getByRole('button', { name: /Stimme entfernen/ })
      .getAttribute('aria-pressed'),
    'true',
  );
  // Demo storage synchronization, not a Supabase realtime test.
  const second = await context.newPage();
  await second.goto(url);
  await second.getByText('Test der Zusammenarbeit', { exact: true }).waitFor();
  await card
    .getByRole('button', { name: /Test der Zusammenarbeit/ })
    .first()
    .click();
  await page.getByLabel('Dein Kommentar').fill('Das funktioniert im Browser.');
  await page.getByRole('button', { name: 'Kommentieren', exact: true }).click();
  await page
    .getByText('Das funktioniert im Browser.', { exact: true })
    .waitFor();
  await snap('04-detail-desktop');
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await page.getByLabel('Status', { exact: true }).selectOption('shortlisted');
  await page
    .getByRole('button', { name: 'Idee speichern', exact: true })
    .click();
  await second.reload();
  await second
    .locator('.idea-card')
    .filter({ hasText: 'Test der Zusammenarbeit' })
    .getByText('Engere Auswahl', { exact: true })
    .waitFor();
  await second.close();
  await page.getByRole('button', { name: 'Datenlabor', exact: true }).click();
  await page
    .getByText('Luftqualität · Beispieldaten', { exact: true })
    .first()
    .waitFor();
  await snap('05-lab-desktop');
  await page
    .getByRole('button', { name: 'Datensatz hinzufügen', exact: true })
    .click();
  await page.getByLabel('Name des Datensatzes').fill('Manuelle Testdaten');
  await page.getByLabel('Zeile 1, Kategorie', { exact: true }).fill('Berlin');
  await page.getByLabel('Zeile 1, Wert', { exact: true }).fill('12');
  await page.getByLabel('Zeile 2, Kategorie', { exact: true }).fill('Potsdam');
  await page.getByLabel('Zeile 2, Wert', { exact: true }).fill('8');
  await snap('06-manual-editor-desktop');
  await page
    .getByRole('button', { name: 'Datensatz speichern', exact: true })
    .click();
  await page.getByRole('button', { name: /Manuelle Testdaten/ }).click();
  await page.locator('.recharts-bar-rectangle').first().waitFor();
  await page
    .getByLabel('Erkenntnisse zum Datensatz')
    .fill('Berlin hat in diesen Testdaten einen höheren Wert.');
  await page
    .getByRole('button', { name: 'Änderungen speichern', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Datensatz hinzufügen', exact: true })
    .click();
  await page.getByLabel('CSV-Datei hochladen').setInputFiles({
    name: 'zeitreihe.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Jahr;Wert\n2022;12,5\n2023;15,5\n2024;17,0'),
  });
  await page
    .getByRole('button', { name: 'Datensatz speichern', exact: true })
    .click();
  await page.getByRole('button', { name: /zeitreihe/ }).click();
  await page.getByLabel('Zahlenformat', { exact: true }).selectOption('comma');
  await page.getByLabel('Diagramm', { exact: true }).selectOption('line');
  await page.locator('.recharts-line-curve').waitFor();
  await snap('07-line-desktop');
  await page.getByLabel('Diagramm', { exact: true }).selectOption('scatter');
  await page.locator('.recharts-scatter-symbol').first().waitFor();
  await snap('08-scatter-desktop');
  await page
    .getByRole('button', { name: 'Änderungen speichern', exact: true })
    .click();
  await page.getByRole('button', { name: 'Daten', exact: true }).click();
  await page.getByRole('cell', { name: '12,5', exact: true }).waitFor();
  await snap('09-table-desktop');
  await page.getByRole('button', { name: 'Leitfaden', exact: true }).click();
  await snap('10-guide-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Ideenboard', exact: false })
    .first()
    .click();
  await snap('11-board-mobile');
  await page
    .getByRole('button', { name: 'Themenidee hinzufügen', exact: true })
    .click();
  await snap('12-idea-editor-mobile');
  await page.getByRole('button', { name: 'Dialog schließen' }).click();
  await page.getByRole('button', { name: 'Datenlabor', exact: true }).click();
  await page
    .getByRole('button', { name: /Luftqualität · Beispieldaten/ })
    .click();
  await snap('13-lab-mobile');
  await page
    .getByRole('button', { name: 'Datensatz hinzufügen', exact: true })
    .click();
  await snap('14-data-editor-mobile');
  await page.getByRole('button', { name: 'Dialog schließen' }).click();
  await page.getByRole('button', { name: 'Leitfaden', exact: true }).click();
  await snap('15-guide-mobile');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.getByRole('button', { name: 'Datenlabor', exact: true }).click();
  await snap('16-lab-dark-mobile');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page
    .getByRole('button', { name: 'Ideenboard', exact: false })
    .first()
    .click();
  await page.getByLabel('Ideen suchen').fill('no such topic');
  await snap('17-empty-desktop');
  await page.getByLabel('Ideen suchen').fill('');
  // Delete own entries and verify persistence after reload.
  await page
    .locator('.idea-card')
    .filter({ hasText: 'Test der Zusammenarbeit' })
    .getByRole('button', { name: /Test der Zusammenarbeit/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Löschen', exact: true }).click();
  await page
    .getByRole('button', { name: 'Endgültig löschen', exact: true })
    .click();
  await page.reload();
  assert.equal(
    await page.getByText('Test der Zusammenarbeit', { exact: true }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    'Browser checks passed: create/edit/delete, vote, comment, cross-tab demo sync, CSV and manual import, charts, saved findings, responsive overflow, dark mode.',
  );
  fs.writeFileSync(
    `${folder}/results.json`,
    JSON.stringify(
      {
        status: 'passed',
        errors,
        scope: 'local demo only; Supabase cloud realtime not tested',
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
