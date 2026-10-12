import {
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
  type ReactNode,
  type FormEvent,
} from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Database,
  FlaskConical,
  Lightbulb,
  Link2,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  ThumbsUp,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { configured, useHub, type Hub } from './store';
import {
  COLOR,
  MEMBERS,
  STATUS,
  type Idea,
  type Member,
  type Status,
} from './types';
import { safeUrl } from './data';
import { Avatar, Modal, ErrorLine, SourceLink } from './ui';
const DataLab = lazy(() =>
  import('./DataLab').then((m) => ({ default: m.DataLab })),
);

function MemberPicker({ hub, close }: { hub: Hub; close?: () => void }) {
  return (
    <Modal title="Wer ist heute dabei?" close={close || (() => {})}>
      <p className="muted">
        Wähle deinen Platz im Team. Dein Name bleibt in diesem Browser
        gespeichert.
      </p>
      <div className="picker-grid">
        {MEMBERS.map((member) => (
          <button
            key={member}
            className="person-option"
            onClick={() => {
              hub.chooseMember(member);
              close?.();
            }}
          >
            <Avatar member={member} />
            <span>{member}</span>
            <ArrowRight size={18} />
          </button>
        ))}
      </div>
      <div className="info-note">
        <Users size={18} />
        <p>
          Offener Gruppenraum, kein verifizierter Login. Namen sind frei
          wählbar. Bitte keine vertraulichen oder personenbezogenen Daten
          hochladen.
        </p>
      </div>
      {!configured && (
        <p className="muted">
          Du testest gerade die lokale Demo. Änderungen werden nicht mit anderen
          Geräten geteilt.
        </p>
      )}
    </Modal>
  );
}
function IdeaEditor({
  hub,
  existing,
  close,
}: {
  hub: Hub;
  existing?: Idea;
  close: () => void;
}) {
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const title = String(data.get('title')).trim();
      const question = String(data.get('question')).trim();
      if (!title || !question)
        throw new Error('Titel und Forschungsfrage dürfen nicht leer sein.');
      await hub.saveIdea(
        {
          title,
          question,
          description: String(data.get('description')).trim(),
          source_url: safeUrl(String(data.get('source'))),
          tags: String(data.get('tags'))
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 5),
          status: String(data.get('status')) as Status,
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
      title={existing ? 'Idee bearbeiten' : 'Eine neue Richtung'}
      close={close}
    >
      <form onSubmit={submit} className="form">
        <p className="muted">
          Ein gutes Thema beginnt mit einer klaren Frage — nicht mit einem
          perfekten Plan.
        </p>
        <label>
          Titel
          <input
            name="title"
            required
            maxLength={140}
            defaultValue={existing?.title}
            placeholder="z. B. Was macht eine Stadt fahrradfreundlich?"
            autoFocus
          />
        </label>
        <label>
          Forschungsfrage
          <textarea
            name="question"
            required
            maxLength={1000}
            defaultValue={existing?.question}
            placeholder="Was wollen wir mit Daten herausfinden?"
            rows={3}
          />
        </label>
        <label>
          Ansatz & Machbarkeit
          <textarea
            name="description"
            maxLength={4000}
            defaultValue={existing?.description}
            placeholder="Methode, mögliche Daten und offene Fragen …"
            rows={4}
          />
        </label>
        <label>
          Link zur Datenquelle
          <input
            name="source"
            type="url"
            maxLength={2000}
            defaultValue={existing?.source_url}
            placeholder="https://…"
          />
          <span className="field-hint">
            Optional. Prüft auch Lizenz, Qualität und Verfügbarkeit.
          </span>
        </label>
        <div className="form-two">
          <label>
            Tags
            <input
              name="tags"
              maxLength={200}
              defaultValue={existing?.tags.join(', ')}
              placeholder="Mobilität, Open Data"
            />
          </label>
          <label>
            Status
            <select
              aria-label="Status"
              name="status"
              defaultValue={existing?.status || 'idea'}
            >
              {Object.entries(STATUS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ErrorLine message={error} />
        <footer className="modal-actions">
          <button type="button" className="btn secondary" onClick={close}>
            Abbrechen
          </button>
          <button className="btn primary" disabled={hub.saving || hub.loading}>
            {hub.saving ? 'Speichern …' : 'Idee speichern'}
            <ArrowRight size={16} />
          </button>
        </footer>
      </form>
    </Modal>
  );
}
function IdeaDetails({
  hub,
  id,
  close,
  edit,
}: {
  hub: Hub;
  id: string;
  close: () => void;
  edit: (idea: Idea) => void;
}) {
  const idea = hub.snapshot.ideas.find((i) => i.id === id);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  if (!idea)
    return (
      <Modal title="Idee nicht mehr verfügbar" close={close}>
        <p>Diese Idee wurde inzwischen entfernt.</p>
      </Modal>
    );
  const comments = hub.snapshot.comments
    .filter((c) => c.idea_id === id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const own = idea.owner_id === hub.owner;
  const action = async (fn: () => Promise<void>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal title={idea.title} close={close}>
      <div className="detail-meta">
        <span className={`status ${idea.status}`}>{STATUS[idea.status]}</span>
        <span className="byline">
          <Avatar small member={idea.member} />
          {idea.member}
        </span>
      </div>
      <h3>Forschungsfrage</h3>
      <p className="research-question">{idea.question}</p>
      <h3>Ansatz & Machbarkeit</h3>
      <p className="prewrap">
        {idea.description || 'Noch kein Ansatz ergänzt.'}
      </p>
      <SourceLink url={idea.source_url} />
      <div className="tag-row">
        {idea.tags.map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>
      {own && (
        <div className="detail-tools">
          <button className="btn secondary" onClick={() => edit(idea)}>
            <Pencil size={15} />
            Bearbeiten
          </button>
          <button
            className="btn text danger"
            onClick={() => setConfirm(!confirm)}
          >
            <Trash2 size={15} />
            Löschen
          </button>
        </div>
      )}
      {confirm && (
        <div className="confirm-note">
          <p>
            Idee, Stimmen und Kommentare löschen? Verknüpfte Datensätze bleiben
            erhalten.
          </p>
          <button
            className="btn danger-fill"
            disabled={hub.saving}
            onClick={() =>
              void action(async () => {
                await hub.deleteIdea(idea);
                close();
              })
            }
          >
            Endgültig löschen
          </button>
        </div>
      )}
      <section className="discussion">
        <h3>
          Diskussion <span className="count">{comments.length}</span>
        </h3>
        {comments.length === 0 && (
          <p className="muted">
            Noch keine Kommentare. Was denkst du über die Frage?
          </p>
        )}
        {comments.map((c) => (
          <article className="comment" key={c.id}>
            <Avatar small member={c.member} />
            <div>
              <div className="comment-author">
                {c.member}
                <time>
                  {new Date(c.created_at).toLocaleDateString('de-DE', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </time>
              </div>
              <p className="prewrap">{c.body}</p>
            </div>
            {c.owner_id === hub.owner && (
              <button
                className="icon-btn"
                aria-label="Eigenen Kommentar löschen"
                disabled={hub.saving}
                onClick={() => void action(() => hub.deleteComment(c))}
              >
                <Trash2 size={15} />
              </button>
            )}
          </article>
        ))}
        <form
          className="comment-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim()) return;
            void action(async () => {
              await hub.addComment(id, body.trim());
              setBody('');
            });
          }}
        >
          <label htmlFor="comment-input" className="sr-only">
            Dein Kommentar
          </label>
          <textarea
            id="comment-input"
            placeholder="Gedanken teilen, Fragen stellen …"
            rows={3}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            className="btn primary"
            disabled={hub.saving || !body.trim() || !hub.owner}
          >
            Kommentieren
            <ArrowRight size={16} />
          </button>
        </form>
      </section>
      <ErrorLine message={error} />
    </Modal>
  );
}
function IdeaCard({
  idea,
  hub,
  open,
  notify,
}: {
  idea: Idea;
  hub: Hub;
  open: () => void;
  notify: (message: string) => void;
}) {
  const votes = hub.snapshot.votes.filter((v) => v.idea_id === idea.id);
  const voted = votes.some((v) => v.user_id === hub.owner);
  const comments = hub.snapshot.comments.filter(
    (c) => c.idea_id === idea.id,
  ).length;
  return (
    <article className="idea-card">
      <div className="card-top">
        <span className={`status ${idea.status}`}>{STATUS[idea.status]}</span>
        <span className="byline">
          <Avatar small member={idea.member} />
          {idea.member}
        </span>
      </div>
      <h3>
        <button className="title-btn" onClick={open}>
          {idea.title}
          <ArrowUpRight size={18} />
        </button>
      </h3>
      <p className="card-question">{idea.question}</p>
      <div className="tag-row">
        {idea.tags.map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>
      <div className="card-bottom">
        <button
          className={`vote ${voted ? 'voted' : ''}`}
          aria-pressed={voted}
          aria-label={`${voted ? 'Stimme entfernen' : 'Für Idee stimmen'}: ${idea.title}`}
          title="Eine Stimme pro Browsersitzung"
          disabled={hub.saving || !hub.owner}
          onClick={async () => {
            try {
              await hub.toggleVote(idea);
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          <ThumbsUp size={16} />
          {votes.length}
          <span>{voted ? 'Deine Stimme' : 'Stimmen'}</span>
        </button>
        <button
          className="comments-button"
          onClick={open}
          aria-label={`${comments} Kommentare zu ${idea.title}`}
        >
          <MessageCircle size={16} />
          {comments}
        </button>
        <SourceLink url={idea.source_url} />
      </div>
    </article>
  );
}
function Guide() {
  return (
    <section className="guide">
      <div className="eyebrow">VON DER IDEE ZUR FRAGE</div>
      <h1>
        Gute Forschung fängt
        <br />
        klein an.
      </h1>
      <p className="lead">
        Unser Thema muss nicht alles erklären. Es muss eine Frage stellen, die
        wir mit verfügbaren Daten sauber untersuchen können.
      </p>
      <div className="guide-grid">
        {[
          [
            '01',
            'Frage schärfen',
            'Welche konkrete Frage wollen wir beantworten? Definiert Zielgröße, Vergleich, Zeitraum und die untersuchte Gruppe.',
          ],
          [
            '02',
            'Daten prüfen',
            'Gibt es geeignete Daten? Prüft Lizenz, Herkunft, fehlende Werte, Repräsentativität und mögliche personenbezogene Informationen.',
          ],
          [
            '03',
            'Methode planen',
            'Startet mit Exploration und einer einfachen Baseline. Wählt Visualisierung, Statistik oder ein Modell passend zur Frage.',
          ],
          [
            '04',
            'Befunde erklären',
            'Trennt Beobachtungen von Interpretationen. Dokumentiert Einschränkungen und verwechselt Korrelation nicht mit Kausalität.',
          ],
        ].map(([n, title, body]) => (
          <article className="guide-card" key={n}>
            <span className="step-number">{n}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="info-note">
        <FlaskConical size={20} />
        <p>
          Die konkreten Anforderungen eurer Hochschule haben Vorrang. Dieser
          Leitfaden ist eine Orientierung, kein offizieller Bewertungsmaßstab.
        </p>
      </div>
    </section>
  );
}
export default function App() {
  const hub = useHub();
  const [view, setView] = useState<'board' | 'mine' | 'data' | 'guide'>(
    'board',
  );
  const [filter, setFilter] = useState<Member | 'all'>('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('new');
  const [picker, setPicker] = useState(false);
  const [editor, setEditor] = useState<Idea | 'new' | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const activeMember = view === 'mine' ? hub.member : filter;
  const ideas = hub.snapshot.ideas
    .filter(
      (i) =>
        (activeMember === 'all' || i.member === activeMember) &&
        (status === 'all' || i.status === status) &&
        `${i.title} ${i.question} ${i.tags.join(' ')}`
          .toLocaleLowerCase('de-DE')
          .includes(search.toLocaleLowerCase('de-DE')),
    )
    .sort((a, b) =>
      sort === 'votes'
        ? hub.snapshot.votes.filter((v) => v.idea_id === b.id).length -
            hub.snapshot.votes.filter((v) => v.idea_id === a.id).length ||
          b.created_at.localeCompare(a.created_at)
        : b.created_at.localeCompare(a.created_at),
    );
  const nav = (next: typeof view) => {
    setView(next);
    if (next === 'board') setFilter('all');
  };
  const share = async () => {
    if (!configured) {
      setToast(
        'Das ist eine lokale Demo. Für einen gemeinsamen Link zuerst Supabase einrichten und auf Vercel veröffentlichen.',
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(location.href);
      setToast('Gruppenlink kopiert. Jeder mit dem Link kann beitreten.');
    } catch {
      setToast(
        'Link konnte nicht kopiert werden. Teile die Adresse aus der Browserleiste.',
      );
    }
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            nav('board');
          }}
        >
          <span className="brand-mark">t.</span>thesis
          <span className="brand-dot">collective</span>
        </a>
        <div className="workspace-label">DATA SCIENCE / GRUPPENARBEIT</div>
        <nav aria-label="Hauptnavigation">
          {[
            ['board', Lightbulb, 'Ideenboard'],
            ['mine', Users, 'Mein Bereich'],
            ['data', Database, 'Datenlabor'],
            ['guide', FlaskConical, 'Leitfaden'],
          ].map(([id, Icon, label]) => {
            const ItemIcon = Icon as typeof Lightbulb;
            return (
              <button
                key={String(id)}
                className={`nav-item ${view === id ? 'active' : ''}`}
                onClick={() => nav(id as typeof view)}
              >
                <ItemIcon size={19} />
                <span>{String(label)}</span>
                {id === 'board' && (
                  <span className="nav-count">{hub.snapshot.ideas.length}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="eyebrow">UNSER GEMEINSAMER RAUM</span>
            <p>
              Sechs Perspektiven.
              <br />
              Eine gute Frage.
            </p>
            <div className="avatar-stack">
              {MEMBERS.map((m) => (
                <Avatar key={m} small member={m} />
              ))}
            </div>
          </div>
          <button className="identity" onClick={() => setPicker(true)}>
            {hub.member && <Avatar small member={hub.member} />}
            <span>
              {hub.member || 'Namen wählen'}
              <small>Dein Platz im Team</small>
            </span>
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Forschungsraum<span>/</span>
            {view === 'data'
              ? 'Datenlabor'
              : view === 'guide'
                ? 'Leitfaden'
                : view === 'mine'
                  ? 'Mein Bereich'
                  : 'Ideenboard'}
          </span>
          <div className="topbar-right">
            <span
              className={`connection ${hub.connection === 'Live verbunden' ? 'connected' : ''}`}
            >
              <i />
              {hub.connection}
            </span>
            <button
              className="btn secondary compact"
              onClick={() => void share()}
            >
              <Link2 size={16} />
              <span>Link teilen</span>
            </button>
          </div>
        </header>
        {!configured && (
          <div className="demo-banner">
            <span>
              <b>DEMO</b> Fiktive Beispiele · lokal in diesem Browser · noch
              nicht gemeinsam online
            </span>
            <button
              onClick={() => {
                if (
                  window.confirm('Alle lokalen Demo-Änderungen zurücksetzen?')
                )
                  hub.resetDemo();
              }}
            >
              Zurücksetzen
            </button>
          </div>
        )}
        {hub.error && (
          <div className="sync-error" role="alert">
            {hub.error}
            <button onClick={() => location.reload()}>Erneut verbinden</button>
          </div>
        )}
        <main>
          {(view === 'board' || view === 'mine') && (
            <>
              <section className="intro">
                <div>
                  <div className="eyebrow">UNSER DATA-SCIENCE-PROJEKT</div>
                  <h1>
                    {view === 'mine' ? (
                      `${hub.member || 'Dein'}s Ideenraum.`
                    ) : (
                      <>
                        Aus Gedanken
                        <br />
                        wird Forschung<span className="blue-dot">.</span>
                      </>
                    )}
                  </h1>
                  <p className="lead">
                    {view === 'mine'
                      ? 'Deine Fragen, deine Ansätze. Gemeinsam entwickeln wir sie weiter.'
                      : 'Ein Platz für unsere Fragen, Daten und nächsten Schritte. Lasst uns ein Thema finden, das uns wirklich interessiert.'}
                  </p>
                  <button
                    className="btn primary"
                    onClick={() => setEditor('new')}
                    disabled={hub.loading || !hub.owner}
                  >
                    <Plus size={18} />
                    Themenidee hinzufügen
                  </button>
                </div>
                <div className="phase-card">
                  <div className="phase-top">
                    <span className="eyebrow">WO WIR GERADE STEHEN</span>
                    <span className="phase-badge">PHASE 01</span>
                  </div>
                  <h2>
                    Erst die Frage.
                    <br />
                    Dann die Daten.
                  </h2>
                  <p>
                    Ideen sammeln, Machbarkeit prüfen und eine gemeinsame
                    Richtung finden.
                  </p>
                  <div className="phase-steps">
                    <span className="current">01 Ideen</span>
                    <span>02 Prüfen</span>
                    <span>03 Forschen</span>
                  </div>
                  <span className="phase-caption">
                    Orientierung · keine automatische Fortschrittsmessung
                  </span>
                </div>
              </section>
              <section className="stats" aria-label="Projektübersicht">
                <div>
                  <span className="stat-label">
                    <Lightbulb size={17} />
                    Themenideen
                  </span>
                  <strong>
                    {String(hub.snapshot.ideas.length).padStart(2, '0')}
                  </strong>
                  <small>Perspektiven auf dem Board</small>
                </div>
                <div>
                  <span className="stat-label">
                    <SlidersHorizontal size={17} />
                    Engere Auswahl
                  </span>
                  <strong>
                    {String(
                      hub.snapshot.ideas.filter(
                        (i) =>
                          i.status === 'shortlisted' || i.status === 'chosen',
                      ).length,
                    ).padStart(2, '0')}
                  </strong>
                  <small>Shortlist oder ausgewählt</small>
                </div>
                <div>
                  <span className="stat-label">
                    <Database size={17} />
                    Datensätze
                  </span>
                  <strong>
                    {String(hub.snapshot.datasets.length).padStart(2, '0')}
                  </strong>
                  <button className="stat-link" onClick={() => nav('data')}>
                    Im Datenlabor ansehen
                    <ArrowRight size={14} />
                  </button>
                </div>
              </section>
              <section className="team-section">
                <div className="section-heading">
                  <h2>Sechs Plätze. Alle Ideen.</h2>
                  <button
                    className="btn text"
                    onClick={() => {
                      setFilter('all');
                      setView('board');
                    }}
                  >
                    Alle anzeigen
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="team-grid">
                  {MEMBERS.map((m) => {
                    const count = hub.snapshot.ideas.filter(
                      (i) => i.member === m,
                    ).length;
                    return (
                      <button
                        className={`team-card ${activeMember === m ? 'selected' : ''}`}
                        key={m}
                        onClick={() => {
                          setView('board');
                          setFilter(m);
                        }}
                        aria-pressed={activeMember === m}
                      >
                        <Avatar member={m} />
                        <span>
                          <b>
                            {m}
                            {m === hub.member && <small> Du</small>}
                          </b>
                          <small>
                            {count} {count === 1 ? 'Idee' : 'Ideen'}
                          </small>
                        </span>
                        <ArrowUpRight size={14} />
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="board-section">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">IDEEN, DIE WEITERFÜHREN</div>
                    <h2>
                      {activeMember !== 'all' && activeMember
                        ? `Ideen von ${activeMember}`
                        : 'Das Themenboard'}
                      <span className="count">{ideas.length}</span>
                    </h2>
                  </div>
                  <label className="sort-label">
                    <span className="sr-only">Ideen sortieren</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="new">Neueste</option>
                      <option value="votes">Stimmen</option>
                    </select>
                  </label>
                </div>
                <div className="board-toolbar">
                  <div className="status-tabs" aria-label="Statusfilter">
                    {[
                      ['all', 'Alle Ideen'],
                      ['idea', 'Idee'],
                      ['shortlisted', 'Engere Auswahl'],
                      ['chosen', 'Ausgewählt'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className={status === value ? 'selected' : ''}
                        aria-pressed={status === value}
                        onClick={() => setStatus(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="search-field">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Ideen suchen …"
                      aria-label="Ideen suchen"
                    />
                  </label>
                </div>
                {hub.loading ? (
                  <div className="empty-state">
                    Gemeinsame Ideen werden geladen …
                  </div>
                ) : ideas.length ? (
                  <div className="idea-grid">
                    {ideas.map((idea) => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        hub={hub}
                        open={() => setDetail(idea.id)}
                        notify={setToast}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Lightbulb size={30} />
                    <h3>
                      {search || status !== 'all'
                        ? 'Keine passenden Ideen'
                        : 'Hier beginnt eure Forschung.'}
                    </h3>
                    <p>
                      {search || status !== 'all'
                        ? 'Versuche einen anderen Filter oder Suchbegriff.'
                        : 'Noch ist dieser Platz frei. Welche Frage würdest du gern untersuchen?'}
                    </p>
                    <button
                      className="btn secondary"
                      onClick={() => setEditor('new')}
                      disabled={!hub.owner}
                    >
                      <Plus size={16} />
                      Erste Idee hinzufügen
                    </button>
                  </div>
                )}
                <p className="board-footnote">
                  Stimmen sind pro Browsersitzung, nicht pro verifizierter
                  Person. Ideen und Status bearbeitet die Sitzung, die sie
                  erstellt hat.
                </p>
              </section>
            </>
          )}
          {view === 'data' && (
            <Suspense
              fallback={
                <div className="empty-state">Datenlabor wird geladen …</div>
              }
            >
              <DataLab hub={hub} notify={setToast} />
            </Suspense>
          )}
          {view === 'guide' && <Guide />}
          <footer className="page-footer">
            <span>thesis collective</span>
            <span>Jan · Marcel · Ole · Szymon · Paul · Bolivar</span>
            <span>Fragen. Daten. Erkenntnisse.</span>
          </footer>
        </main>
      </div>
      {(!hub.member || picker) && (
        <MemberPicker
          hub={hub}
          close={hub.member ? () => setPicker(false) : undefined}
        />
      )}{' '}
      {editor && (
        <IdeaEditor
          hub={hub}
          existing={editor === 'new' ? undefined : editor}
          close={() => setEditor(null)}
        />
      )}{' '}
      {detail && (
        <IdeaDetails
          hub={hub}
          id={detail}
          close={() => setDetail(null)}
          edit={(idea) => {
            setDetail(null);
            setEditor(idea);
          }}
        />
      )}{' '}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button
            className="icon-btn"
            onClick={() => setToast('')}
            aria-label="Hinweis schließen"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
