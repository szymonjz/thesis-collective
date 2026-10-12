import Papa from 'papaparse';
import type { ChartConfig } from './types';
export const MAX_ROWS = 2000;
export const MAX_COLS = 30;
export function safeUrl(value: string): string {
  if (!value.trim()) return '';
  const url = new URL(value.trim());
  if (!['https:', 'http:'].includes(url.protocol))
    throw new Error('Nur HTTP- oder HTTPS-Links sind erlaubt.');
  if (url.href.length > 2000) throw new Error('Der Link ist zu lang.');
  return url.href;
}
export function validateTable(columns: string[], rows: string[][]) {
  if (columns.length < 2 || columns.length > MAX_COLS)
    throw new Error('Bitte 2 bis 30 Spalten verwenden.');
  if (
    columns.some((c) => !c.trim() || c.length > 100) ||
    new Set(columns.map((c) => c.trim())).size !== columns.length
  )
    throw new Error(
      'Spaltennamen müssen eindeutig sein, dürfen nicht leer sein und höchstens 100 Zeichen haben.',
    );
  if (!rows.length || rows.length > MAX_ROWS)
    throw new Error('Bitte 1 bis 2.000 Datenzeilen verwenden.');
  if (
    rows.some(
      (r) => r.length !== columns.length || r.some((c) => c.length > 500),
    )
  )
    throw new Error(
      'Zeilen müssen zur Spaltenzahl passen; Zellen dürfen maximal 500 Zeichen enthalten.',
    );
  if (new Blob([JSON.stringify(rows)]).size > 1_000_000)
    throw new Error('Die Daten sind zu groß (maximal 1 MB als Tabelle).');
}
export function parseCsv(text: string) {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length)
    throw new Error(
      'CSV konnte nicht gelesen werden: ' + parsed.errors[0].message,
    );
  const [header, ...rows] = parsed.data;
  const columns = (header || []).map((c) => c.trim());
  validateTable(columns, rows);
  return { columns, rows };
}
export function numeric(
  value: string,
  decimal: 'dot' | 'comma',
): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const normalized = decimal === 'comma' ? raw.replace(',', '.') : raw;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized))
    return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
export function defaultChart(columns: string[], rows: string[][]): ChartConfig {
  const candidates = columns
    .map((_, i) => i)
    .filter((i) =>
      rows.some(
        (r) => numeric(r[i], 'dot') !== null || numeric(r[i], 'comma') !== null,
      ),
    );
  const y = candidates.find((i) => i !== 0) ?? candidates[0] ?? 1;
  return { kind: 'bar', x: 0, y: y < 0 ? 1 : y, decimal: 'dot', unit: '' };
}
export function chartPoints(rows: string[][], config: ChartConfig) {
  let rejected = 0;
  const points = rows.flatMap((row, i) => {
    const y = numeric(row[config.y] || '', config.decimal);
    const rawX = row[config.x] || '';
    const x = numeric(rawX, config.decimal);
    const isoDate = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(rawX)
      ? Date.parse(rawX)
      : NaN;
    const orderedX = x ?? (Number.isFinite(isoDate) ? isoDate : null);
    if (
      y === null ||
      !rawX.trim() ||
      (config.kind === 'scatter' && x === null) ||
      (config.kind === 'line' && orderedX === null)
    ) {
      rejected++;
      return [];
    }
    return [
      {
        label: rawX,
        x: config.kind === 'scatter' ? x! : (orderedX ?? i),
        y,
        row: i + 1,
      },
    ];
  });
  if (config.kind === 'line') points.sort((a, b) => a.x - b.x);
  const limit = config.kind === 'bar' ? 40 : 500;
  return {
    points: points.slice(0, limit),
    rejected,
    omitted: Math.max(0, points.length - limit),
    valid: points.length,
  };
}
export function exportCsv(columns: string[], rows: string[][]) {
  return Papa.unparse([columns, ...rows], { escapeFormulae: true });
}
export function downloadText(
  text: string,
  filename: string,
  mime = 'text/csv;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
