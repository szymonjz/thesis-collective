import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  type YAxisProps,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  Database,
  FileSpreadsheet,
  Link2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Avatar, ErrorLine, Modal, SourceLink } from './ui';
import {
  chartPoints,
  defaultChart,
  downloadText,
  exportCsv,
  parseCsv,
  safeUrl,
  validateTable,
  MAX_COLS,
  MAX_ROWS,
} from './data';
import type { Hub } from './store';
import { type ChartConfig, type Dataset, type Kind } from './types';

function DatasetEditor({
  hub,
  existing,
  close,
}: {
  hub: Hub;
  existing?: Dataset;
  close: () => void;
}) {
  const [columns, setColumns] = useState(
    existing?.columns || ['Kategorie', 'Wert'],
  );
  const [rows, setRows] = useState(
    existing?.rows || [
      ['', ''],
      ['', ''],
      ['', ''],
    ],
  );
  const [name, setName] = useState(existing?.name || '');
  const [source, setSource] = useState(existing?.source_url || '');
  const [ideaId, setIdeaId] = useState(existing?.idea_id || '');
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const importFile = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      if (file.size > 2_000_000)
        throw new Error('CSV-Dateien dürfen maximal 2 MB groß sein.');
      const parsed = parseCsv(await file.text());
      setColumns(parsed.columns);
      setRows(parsed.rows);
      setPage(0);
      setFileName(file.name);
      if (!name) setName(file.name.replace(/\.csv$/i, ''));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const cleanColumns = columns.map((c) => c.trim());
      const cleanRows = rows.filter((r) => r.some((c) => c.trim()));
      validateTable(cleanColumns, cleanRows);
      if (!name.trim()) throw new Error('Bitte einen Namen eingeben.');
      const chart =
        existing &&
        JSON.stringify(existing.columns) === JSON.stringify(cleanColumns)
          ? existing.chart
          : defaultChart(cleanColumns, cleanRows);
      await hub.saveDataset(
        {
          name: name.trim(),
          source_url: safeUrl(source),
          idea_id: ideaId || null,
          columns: cleanColumns,
          rows: cleanRows,
          chart,
          findings: existing?.findings || '',
        },
        existing,
      );
      close();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal
      title={existing ? 'Datensatz bearbeiten' : 'Daten mitbringen'}
      close={close}
      wide
    >
      <form className="form" onSubmit={submit}>
        <p className="muted">
          CSV hochladen oder Werte direkt eintragen. Alle im Gruppenraum können
          die gespeicherten Daten sehen.
        </p>
        <div className="form-two">
          <label>
            Name des Datensatzes
            <input
              autoFocus
              required
              maxLength={140}
              placeholder="z. B. Verkehrsunfälle nach Bezirk"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Zu einer Themenidee
            <select value={ideaId} onChange={(e) => setIdeaId(e.target.value)}>
              <option value="">Ohne Verknüpfung</option>
              {hub.snapshot.ideas.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Datenquelle / Lizenz-Link
          <input
            type="url"
            maxLength={2000}
            placeholder="https://…"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </label>
        <label className="upload-zone">
          <Upload size={24} />
          <span>
            <b>{fileName || 'CSV-Datei auswählen'}</b>
            <small>
              Erste Zeile = Spaltennamen · Komma, Semikolon oder Tab · UTF-8
            </small>
          </span>
          <input
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            aria-label="CSV-Datei hochladen"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <div className="table-editor-head">
          <h3>Oder direkt eintragen</h3>
          <span className="muted">
            {rows.length} Zeilen · {columns.length} Spalten
          </span>
        </div>
        <div className="table-wrap editor-table">
          <table>
            <thead>
              <tr>
                <th className="row-number">#</th>
                {columns.map((column, i) => (
                  <th key={i}>
                    <div className="column-input">
                      <input
                        aria-label={`Name Spalte ${i + 1}`}
                        value={column}
                        maxLength={100}
                        onChange={(e) =>
                          setColumns(
                            columns.map((c, j) =>
                              j === i ? e.target.value : c,
                            ),
                          )
                        }
                      />
                      {columns.length > 2 && (
                        <button
                          type="button"
                          aria-label={`Spalte ${i + 1} entfernen`}
                          className="icon-btn"
                          onClick={() => {
                            setColumns(columns.filter((_, j) => j !== i));
                            setRows(
                              rows.map((r) => r.filter((_, j) => j !== i)),
                            );
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 20, page * 20 + 20).map((row, ri) => (
                <tr key={ri}>
                  <td className="row-number">{page * 20 + ri + 1}</td>
                  {row.map((value, ci) => (
                    <td key={ci}>
                      <input
                        maxLength={500}
                        aria-label={`Zeile ${page * 20 + ri + 1}, ${columns[ci]}`}
                        value={value}
                        onChange={(e) =>
                          setRows(
                            rows.map((r, j) =>
                              j === page * 20 + ri
                                ? r.map((v, k) =>
                                    k === ci ? e.target.value : v,
                                  )
                                : r,
                            ),
                          )
                        }
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Zeile ${page * 20 + ri + 1} entfernen`}
                      onClick={() => {
                        const next = rows.filter(
                          (_, j) => j !== page * 20 + ri,
                        );
                        setRows(next);
                        setPage(
                          Math.min(
                            page,
                            Math.max(0, Math.ceil(next.length / 20) - 1),
                          ),
                        );
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="editor-tools">
          <button
            type="button"
            className="btn secondary"
            disabled={rows.length >= MAX_ROWS}
            onClick={() => {
              setRows([...rows, columns.map(() => '')]);
              setPage(Math.floor(rows.length / 20));
            }}
          >
            <Plus size={15} />
            Zeile
          </button>
          <button
            type="button"
            className="btn secondary"
            disabled={columns.length >= MAX_COLS}
            onClick={() => {
              setColumns([...columns, `Spalte ${columns.length + 1}`]);
              setRows(rows.map((r) => [...r, '']));
            }}
          >
            <Plus size={15} />
            Spalte
          </button>
          <div className="pagination">
            <button
              type="button"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              Zurück
            </button>
            <span>
              {page + 1} / {Math.max(1, Math.ceil(rows.length / 20))}
            </span>
            <button
              type="button"
              disabled={(page + 1) * 20 >= rows.length}
              onClick={() => setPage(page + 1)}
            >
              Weiter
            </button>
          </div>
        </div>
        <p className="field-hint">
          Max. 2.000 Zeilen, 30 Spalten, 500 Zeichen pro Zelle und 1 MB
          Tabellendaten. Keine automatischen Tausendertrenner: „1.234“ bedeutet
          1,234 im Punkt-Modus. Zahlenformat später im Diagramm auswählen.
        </p>
        <ErrorLine message={error} />
        <footer className="modal-actions">
          <button className="btn secondary" type="button" onClick={close}>
            Abbrechen
          </button>
          <button className="btn primary" disabled={hub.saving || !hub.owner}>
            {hub.saving ? 'Speichern …' : 'Datensatz speichern'}
            <ArrowRight size={16} />
          </button>
        </footer>
      </form>
    </Modal>
  );
}
function DatasetView({
  dataset,
  hub,
  edit,
  notify,
}: {
  dataset: Dataset;
  hub: Hub;
  edit: () => void;
  notify: (message: string) => void;
}) {
  const [config, setConfig] = useState(dataset.chart);
  const [findings, setFindings] = useState(dataset.findings);
  const [dirty, setDirty] = useState(false);
  const [base, setBase] = useState(dataset);
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<'chart' | 'table'>('chart');
  const chartRef = useRef<HTMLDivElement>(null);
  const own = dataset.owner_id === hub.owner;
  useEffect(() => {
    if (!dirty) {
      setConfig(dataset.chart);
      setFindings(dataset.findings);
      setBase(dataset);
    }
  }, [dataset, dirty]);
  const result = chartPoints(dataset.rows, config);
  const configure = (patch: Partial<ChartConfig>) => {
    setConfig({ ...config, ...patch });
    setDirty(true);
  };
  const save = async () => {
    setError('');
    try {
      await hub.saveDataset(
        {
          name: base.name,
          source_url: base.source_url,
          idea_id: base.idea_id,
          columns: base.columns,
          rows: base.rows,
          chart: config,
          findings,
        },
        base,
      );
      setDirty(false);
      notify('Diagramm und Erkenntnisse gespeichert.');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const exportSvg = () => {
    const svg = chartRef.current?.querySelector('svg.recharts-surface');
    if (!svg) {
      notify('Kein Diagramm zum Exportieren vorhanden.');
      return;
    }
    const copy = svg.cloneNode(true) as SVGElement;
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    downloadText(
      new XMLSerializer().serializeToString(copy),
      'diagramm.svg',
      'image/svg+xml',
    );
  };
  const labels = { x: dataset.columns[config.x], y: dataset.columns[config.y] };
  const yLabel = `${labels.y}${config.unit && !labels.y.includes(config.unit) ? ` (${config.unit})` : ''}`;
  const tooltipStyle = {
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
  };
  const chartMargin = { top: 16, right: 24, bottom: 40, left: 14 };
  const tick = { fill: 'var(--muted)', fontSize: 12 };
  const yDomain: YAxisProps['domain'] =
    config.kind === 'bar'
      ? [(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]
      : ['auto', 'auto'];
  const tooltipFormat = (value: unknown) => [
    `${Number(value).toLocaleString('de-DE', { maximumFractionDigits: 6 })}${config.unit ? ` ${config.unit}` : ''}`,
    labels.y,
  ];
  const xAxis = (
    <XAxis
      dataKey="label"
      tick={tick}
      axisLine={false}
      tickLine={false}
      interval="preserveStartEnd"
      minTickGap={24}
      label={{
        value: labels.x,
        position: 'bottom',
        offset: 16,
        fill: 'var(--muted)',
        fontSize: 13,
      }}
    />
  );
  const yAxis = (
    <YAxis
      tick={tick}
      axisLine={false}
      tickLine={false}
      width={68}
      domain={yDomain}
      tickFormatter={(v) =>
        Number(v).toLocaleString(
          'de-DE',
          Math.abs(Number(v)) >= 10000
            ? { notation: 'compact' }
            : { maximumFractionDigits: 6 },
        )
      }
    />
  );
  return (
    <section className="dataset-view">
      <div className="section-heading dataset-heading">
        <div>
          <div className="byline">
            <Avatar small member={dataset.member} />
            {dataset.member}
            <span>·</span>
            {dataset.rows.length.toLocaleString('de-DE')} Zeilen
          </div>
          <h2>{dataset.name}</h2>
          <SourceLink url={dataset.source_url} />
          {dataset.idea_id && (
            <p className="field-hint">
              Themenidee:{' '}
              {hub.snapshot.ideas.find((i) => i.id === dataset.idea_id)
                ?.title || 'Nicht mehr verfügbar'}
            </p>
          )}
        </div>
        <div className="data-actions">
          <button
            className="btn secondary"
            onClick={() =>
              downloadText(
                exportCsv(dataset.columns, dataset.rows),
                'datensatz.csv',
              )
            }
          >
            <ArrowDownToLine size={16} />
            CSV
          </button>
          {own && (
            <button
              className="icon-btn"
              aria-label="Datensatz bearbeiten"
              onClick={edit}
            >
              <Pencil size={17} />
            </button>
          )}
        </div>
      </div>
      <div className="chart-card">
        <div className="chart-heading">
          <div className="status-tabs">
            <button
              aria-pressed={panel === 'chart'}
              className={panel === 'chart' ? 'selected' : ''}
              onClick={() => setPanel('chart')}
            >
              <BarChart3 size={15} />
              Diagramm
            </button>
            <button
              aria-pressed={panel === 'table'}
              className={panel === 'table' ? 'selected' : ''}
              onClick={() => setPanel('table')}
            >
              <FileSpreadsheet size={15} />
              Daten
            </button>
          </div>
          {panel === 'chart' && (
            <button
              className="btn text"
              onClick={exportSvg}
              disabled={!result.points.length}
            >
              <ArrowDownToLine size={15} />
              SVG exportieren
            </button>
          )}
        </div>
        {panel === 'chart' ? (
          <>
            <div className="chart-controls">
              <label>
                Diagramm
                <select
                  aria-label="Diagramm"
                  value={config.kind}
                  onChange={(e) => configure({ kind: e.target.value as Kind })}
                >
                  <option value="bar">Balken / Kategorien</option>
                  <option value="line">Linie / geordnete Werte</option>
                  <option value="scatter">Streuung / Zusammenhang</option>
                </select>
              </label>
              <label>
                X-Achse
                <select
                  aria-label="X-Achse"
                  value={config.x}
                  onChange={(e) => configure({ x: +e.target.value })}
                >
                  {dataset.columns.map((c, i) => (
                    <option value={i} key={i}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Y-Achse
                <select
                  aria-label="Y-Achse"
                  value={config.y}
                  onChange={(e) => configure({ y: +e.target.value })}
                >
                  {dataset.columns.map((c, i) => (
                    <option value={i} key={i}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Zahlenformat
                <select
                  aria-label="Zahlenformat"
                  value={config.decimal}
                  onChange={(e) =>
                    configure({
                      decimal: e.target.value as ChartConfig['decimal'],
                    })
                  }
                >
                  <option value="dot">Dezimalpunkt (12.5)</option>
                  <option value="comma">Dezimalkomma (12,5)</option>
                </select>
              </label>
              <label>
                Y-Einheit
                <input
                  value={config.unit}
                  maxLength={40}
                  placeholder="z. B. kg"
                  onChange={(e) => configure({ unit: e.target.value })}
                />
              </label>
            </div>
            <div className="chart-measure">{yLabel}</div>
            {result.points.length ? (
              <div
                ref={chartRef}
                className="plot"
                role="img"
                aria-label={`${config.kind === 'scatter' ? 'Streudiagramm' : config.kind === 'line' ? 'Liniendiagramm' : 'Balkendiagramm'}: ${yLabel} nach ${labels.x}. ${result.points.length} Werte. Exakte Werte unter Daten und in der Tabelle der dargestellten Werte.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {config.kind === 'bar' ? (
                    <BarChart
                      data={result.points}
                      margin={chartMargin}
                      accessibilityLayer
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="#9aa2ae"
                        strokeOpacity={0.18}
                      />
                      {xAxis}
                      {yAxis}
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={tooltipFormat}
                      />
                      <Bar
                        dataKey="y"
                        fill="#3d61e8"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={44}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  ) : config.kind === 'line' ? (
                    <LineChart
                      data={result.points}
                      margin={chartMargin}
                      accessibilityLayer
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="#9aa2ae"
                        strokeOpacity={0.18}
                      />
                      <XAxis
                        type="number"
                        dataKey="x"
                        domain={['dataMin', 'dataMax']}
                        tick={tick}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(x) =>
                          result.points.find((p) => p.x === x)?.label ||
                          (result.points.some((p) =>
                            /^\d{4}-\d{2}-\d{2}/.test(p.label),
                          )
                            ? new Date(x).toLocaleDateString('de-DE')
                            : String(x))
                        }
                        label={{
                          value: labels.x,
                          position: 'bottom',
                          offset: 16,
                          fill: 'var(--muted)',
                          fontSize: 13,
                        }}
                      />
                      {yAxis}
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={tooltipFormat}
                        labelFormatter={(_, payload) =>
                          payload[0]?.payload?.label || ''
                        }
                      />
                      <Line
                        dataKey="y"
                        type="linear"
                        stroke="#3d61e8"
                        strokeWidth={2.5}
                        dot={{ r: 3, strokeWidth: 0, fill: '#3d61e8' }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  ) : (
                    <ScatterChart margin={chartMargin} accessibilityLayer>
                      <CartesianGrid stroke="#9aa2ae" strokeOpacity={0.18} />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={labels.x}
                        tick={tick}
                        axisLine={false}
                        tickLine={false}
                        label={{
                          value: labels.x,
                          position: 'bottom',
                          offset: 16,
                          fill: 'var(--muted)',
                          fontSize: 13,
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={labels.y}
                        tick={tick}
                        axisLine={false}
                        tickLine={false}
                        width={68}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value, name) => [
                          Number(value).toLocaleString('de-DE'),
                          name,
                        ]}
                      />
                      <Scatter
                        name={dataset.name}
                        data={result.points}
                        fill="#3d61e8"
                        isAnimationActive={false}
                      />
                    </ScatterChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state">
                <BarChart3 size={28} />
                <h3>Keine passenden Zahlen</h3>
                <p>
                  Wähle eine numerische Y-Spalte und das richtige Zahlenformat.
                  Linien benötigen numerische X-Werte oder ISO-Daten;
                  Streudiagramme zwei numerische Spalten.
                </p>
              </div>
            )}
            <div className="chart-notes">
              <span>
                {result.points.length} von {dataset.rows.length} Zeilen
                dargestellt
                {result.rejected > 0
                  ? ` · ${result.rejected} fehlende oder ungültige Werte ausgelassen`
                  : ''}
                {result.omitted > 0
                  ? ` · ${result.omitted} gültige Zeilen wegen Darstellungslimit nicht gezeigt`
                  : ''}
              </span>
              <span>
                {config.kind === 'bar'
                  ? 'Ein Balken pro Zeile, keine Aggregation.'
                  : config.kind === 'line'
                    ? 'Nach X sortiert. Ungültige Zeilen ausgelassen; Verbindung ist keine Interpolation.'
                    : 'Ein Punkt pro vollständigem Wertepaar; kein Kausalitätsnachweis.'}
              </span>
            </div>
            <details className="plotted-values">
              <summary>Dargestellte Werte als Tabelle</summary>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Originalzeile</th>
                      <th>{labels.x}</th>
                      <th>{yLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.points.map((p) => (
                      <tr key={p.row}>
                        <td>{p.row}</td>
                        <td>{p.label}</td>
                        <td>{p.y.toLocaleString('de-DE')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <>
            <div className="table-wrap raw-data">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    {dataset.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataset.rows
                    .slice(page * 25, page * 25 + 25)
                    .map((row, i) => (
                      <tr key={i}>
                        <td>{page * 25 + i + 1}</td>
                        {row.map((v, j) => (
                          <td key={j}>
                            {v || <span className="muted">Fehlend</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button disabled={!page} onClick={() => setPage(page - 1)}>
                Zurück
              </button>
              <span>
                {page + 1} / {Math.max(1, Math.ceil(dataset.rows.length / 25))}
              </span>
              <button
                disabled={(page + 1) * 25 >= dataset.rows.length}
                onClick={() => setPage(page + 1)}
              >
                Weiter
              </button>
            </div>
          </>
        )}
      </div>
      <div className="findings-card">
        <div className="eyebrow">WAS DIE DATEN UNS SAGEN</div>
        <h3>Erkenntnisse & offene Fragen</h3>
        {own ? (
          <label>
            <span className="sr-only">Erkenntnisse zum Datensatz</span>
            <textarea
              rows={4}
              maxLength={8000}
              value={findings}
              onChange={(e) => {
                setFindings(e.target.value);
                setDirty(true);
              }}
              placeholder="Was fällt auf? Welche Annahmen und Grenzen müssen wir prüfen?"
            />
          </label>
        ) : (
          <p className="prewrap">
            {dataset.findings || 'Noch keine Erkenntnisse dokumentiert.'}
          </p>
        )}
        <div className="finding-actions">
          <span className="field-hint">
            {own
              ? 'Diagramm-Einstellungen und Notizen werden gemeinsam gespeichert.'
              : 'Diagrammänderungen sind eine lokale Vorschau. Speichern kann die erstellende Sitzung.'}
          </span>
          {own && (
            <button
              className="btn primary"
              onClick={() => void save()}
              disabled={!dirty || hub.saving}
            >
              Änderungen speichern
              <ArrowRight size={16} />
            </button>
          )}
        </div>
        <ErrorLine message={error} />
        {dirty && dataset.updated_at !== base.updated_at && (
          <p className="form-error">
            Dieser Datensatz wurde während deiner Bearbeitung geändert. Deine
            Eingaben bleiben erhalten; lade den neuen Stand vor dem Speichern.
          </p>
        )}
      </div>
      {own && (
        <div className="dataset-delete">
          <button
            className="btn text danger"
            onClick={() => setConfirm(!confirm)}
          >
            <Trash2 size={15} />
            Datensatz löschen
          </button>
          {confirm && (
            <div className="confirm-note">
              <p>
                Daten, Diagramm-Einstellungen und Notizen endgültig löschen?
              </p>
              <button
                className="btn danger-fill"
                disabled={hub.saving}
                onClick={async () => {
                  try {
                    await hub.deleteDataset(dataset);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Endgültig löschen
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
export function DataLab({
  hub,
  notify,
}: {
  hub: Hub;
  notify: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<Dataset | 'new' | null>(null);
  const datasets = [...hub.snapshot.datasets].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const current = datasets.find((d) => d.id === selected) || datasets[0];
  return (
    <>
      <section className="data-intro">
        <div>
          <div className="eyebrow">UNSER GEMEINSAMES DATENLABOR</div>
          <h1>
            Daten rein.
            <br />
            Erkenntnisse raus<span className="blue-dot">.</span>
          </h1>
          <p className="lead">
            Von der ersten Tabelle zum sichtbaren Muster. Daten sammeln,
            Diagramme erstellen und Befunde festhalten.
          </p>
        </div>
        <button
          className="btn primary"
          onClick={() => setEditor('new')}
          disabled={hub.loading || !hub.owner}
        >
          <Plus size={18} />
          Datensatz hinzufügen
        </button>
      </section>
      <div className="info-note data-warning">
        <Database size={19} />
        <p>
          Nur Daten hochladen, die ihr teilen dürft. Der offene Gruppenraum ist
          nicht für personenbezogene oder vertrauliche Daten geeignet.
        </p>
      </div>
      {datasets.length ? (
        <>
          <div className="dataset-selector">
            {datasets.map((d) => (
              <button
                className={`dataset-chip ${d.id === current?.id ? 'selected' : ''}`}
                key={d.id}
                onClick={() => setSelected(d.id)}
              >
                <FileSpreadsheet size={17} />
                <span>{d.name}</span>
                <small>{d.rows.length} Zeilen</small>
              </button>
            ))}
          </div>
          {current && (
            <DatasetView
              key={current.id}
              dataset={current}
              hub={hub}
              edit={() => setEditor(current)}
              notify={notify}
            />
          )}
        </>
      ) : (
        <div className="empty-state large">
          <Database size={32} />
          <h2>
            {hub.loading
              ? 'Datensätze werden geladen …'
              : 'Ein Labor braucht Daten.'}
          </h2>
          <p>
            Bringt eine CSV-Datei mit oder erstellt eine Tabelle. Danach wählt
            ihr Achsen und Diagrammtyp.
          </p>
          <button
            className="btn secondary"
            disabled={!hub.owner}
            onClick={() => setEditor('new')}
          >
            <Plus size={16} />
            Ersten Datensatz hinzufügen
          </button>
        </div>
      )}
      {editor && (
        <DatasetEditor
          hub={hub}
          existing={editor === 'new' ? undefined : editor}
          close={() => setEditor(null)}
        />
      )}
    </>
  );
}
