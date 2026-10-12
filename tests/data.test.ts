import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  numeric,
  chartPoints,
  safeUrl,
  exportCsv,
  validateTable,
} from '../src/data';
const config = {
  kind: 'bar' as const,
  x: 0,
  y: 1,
  decimal: 'dot' as const,
  unit: '',
};
describe('CSV and manual data', () => {
  it('parses comma-separated CSV and quoted fields', () =>
    expect(parseCsv('Ort,Wert\n"Berlin, Mitte",12\nPotsdam,8').rows[0]).toEqual(
      ['Berlin, Mitte', '12'],
    ));
  it('detects semicolon-separated German decimal values', () =>
    expect(parseCsv('Monat;Wert\nJan;12,5\nFeb;13,2').rows).toEqual([
      ['Jan', '12,5'],
      ['Feb', '13,2'],
    ]));
  it('supports UTF-8 BOM, CRLF and umlauts', () =>
    expect(parseCsv('\uFEFFStadt;Wert\r\nMünchen;4\r\n').columns).toEqual([
      'Stadt',
      'Wert',
    ]));
  it('rejects empty and duplicate headers', () => {
    expect(() => parseCsv('a,a\n1,2')).toThrow();
    expect(() => parseCsv('a,\n1,2')).toThrow();
  });
  it('rejects uneven rows', () =>
    expect(() => parseCsv('a,b\n1,2,3')).toThrow());
  it('rejects data beyond limits', () => {
    expect(() =>
      validateTable(
        ['a', 'b'],
        Array.from({ length: 2001 }, () => ['a', 'b']),
      ),
    ).toThrow();
    expect(() => validateTable(['a', 'b'], [['x'.repeat(501), '1']])).toThrow();
  });
  it('does not reinterpret missing values as zero', () => {
    expect(numeric('', 'dot')).toBeNull();
    expect(numeric('NA', 'dot')).toBeNull();
    expect(numeric('Infinity', 'dot')).toBeNull();
    expect(numeric('0', 'dot')).toBe(0);
  });
  it('uses an explicit decimal format; no thousand-separator guesses', () => {
    expect(numeric('12,5', 'comma')).toBe(12.5);
    expect(numeric('12,5', 'dot')).toBeNull();
    expect(numeric('1.234,5', 'comma')).toBeNull();
    expect(numeric(' 1e2 ', 'dot')).toBe(100);
  });
  it('escapes CSV formula injection on export', () =>
    expect(
      exportCsv(['x', 'y'], [['=HYPERLINK("https://example.com")', '4']]),
    ).toContain("'=HYPERLINK"));
});
describe('chart semantics', () => {
  it('counts missing rows and preserves zeros', () => {
    const result = chartPoints(
      [
        ['a', '0'],
        ['b', ''],
        ['c', '2'],
      ],
      config,
    );
    expect(result.points.map((p) => p.y)).toEqual([0, 2]);
    expect(result.rejected).toBe(1);
  });
  it('does not silently aggregate duplicate categories', () =>
    expect(
      chartPoints(
        [
          ['a', '1'],
          ['a', '2'],
        ],
        config,
      ).points,
    ).toHaveLength(2));
  it('sorts a numeric line by x', () =>
    expect(
      chartPoints(
        [
          ['2', '4'],
          ['1', '3'],
        ],
        { ...config, kind: 'line' },
      ).points.map((p) => p.x),
    ).toEqual([1, 2]));
  it('supports ISO dates on a line', () =>
    expect(
      chartPoints(
        [
          ['2026-02-01', '4'],
          ['2026-01-01', '3'],
        ],
        { ...config, kind: 'line' },
      ).points[0].label,
    ).toBe('2026-01-01'));
  it('rejects categorical x for a line or scatter', () => {
    expect(
      chartPoints([['Jan', '3']], { ...config, kind: 'line' }).points,
    ).toHaveLength(0);
    expect(
      chartPoints([['Jan', '3']], { ...config, kind: 'scatter' }).points,
    ).toHaveLength(0);
  });
  it('discloses display limits', () => {
    const result = chartPoints(
      Array.from({ length: 50 }, (_, i) => [String(i), String(i)]),
      config,
    );
    expect(result.points).toHaveLength(40);
    expect(result.omitted).toBe(10);
  });
});
describe('external links', () => {
  it('allows only web URLs', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com/');
    expect(safeUrl('')).toBe('');
    expect(() => safeUrl('javascript:alert(1)')).toThrow();
    expect(() => safeUrl('data:text/html,bad')).toThrow();
  });
});
