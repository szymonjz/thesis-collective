import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { demoOwner, demoSnapshot } from './demo';
import {
  emptySnapshot,
  type Comment,
  type Dataset,
  type Idea,
  type Member,
  type Snapshot,
  type Vote,
} from './types';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const configured = Boolean(
  url && key && !url.includes('YOUR-PROJECT') && !key.includes('YOUR-PUBLIC'),
);
const db = configured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
const DEMO_KEY = 'thesis-demo-v1';
const MEMBER_KEY = 'thesis-member-v1';
function initialDemo(): Snapshot {
  try {
    const stored = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null');
    if (
      stored &&
      ['ideas', 'votes', 'comments', 'datasets'].every((k) =>
        Array.isArray(stored[k]),
      )
    )
      return stored;
  } catch {
    /* Corrupt demo state can be reset safely. */
  }
  return demoSnapshot();
}
function readMember(): Member | null {
  const value = localStorage.getItem(MEMBER_KEY);
  return ['Jan', 'Marcel', 'Ole', 'Szymon', 'Paul', 'Bolivar'].includes(
    value || '',
  )
    ? (value as Member)
    : null;
}
async function readAll(table: string) {
  const rows: unknown[] = [];
  // Paginate instead of relying on Supabase's default 1,000-row response cap.
  for (let offset = 0; ; offset += 250) {
    const orderKey = table === 'votes' ? 'idea_id' : 'id';
    let request = db!.from(table).select('*').order(orderKey);
    if (table === 'votes') request = request.order('user_id');
    const { data, error } = await request.range(offset, offset + 249);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 250) break;
  }
  return rows;
}
export function useHub() {
  const [member, setMember] = useState<Member | null>(readMember);
  const [uid, setUid] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot>(() =>
    db ? emptySnapshot : initialDemo(),
  );
  const current = useRef(snapshot);
  current.current = snapshot;
  const [connection, setConnection] = useState(
    db ? 'Verbinden …' : 'Lokale Demo',
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(db));
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const owner = db ? uid : member ? demoOwner(member) : '';
  const fetchRef = useRef<(() => Promise<void>) | null>(null);
  const chooseMember = (value: Member) => {
    localStorage.setItem(MEMBER_KEY, value);
    setMember(value);
  };
  const persistDemo = (next: Snapshot) => {
    localStorage.setItem(DEMO_KEY, JSON.stringify(next));
    current.current = next;
    setSnapshot(next);
  };
  useEffect(() => {
    if (!db) {
      const sync = (event: StorageEvent) => {
        if (event.key === DEMO_KEY) setSnapshot(initialDemo());
      };
      addEventListener('storage', sync);
      return () => removeEventListener('storage', sync);
    }
    let alive = true;
    let fetching = false;
    let again = false;
    let channel: ReturnType<typeof db.channel> | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      if (fetching) {
        again = true;
        return;
      }
      fetching = true;
      try {
        const [ideas, votes, comments, datasets] = await Promise.all(
          ['ideas', 'votes', 'comments', 'datasets'].map(readAll),
        );
        if (alive) {
          setSnapshot({ ideas, votes, comments, datasets } as Snapshot);
          setError('');
        }
      } catch (e) {
        if (alive)
          setError(
            'Synchronisation fehlgeschlagen. Prüfe Netzwerk, SQL-Schema und Zugriffsregeln. ' +
              (e as Error).message,
          );
      } finally {
        fetching = false;
        if (alive) setLoading(false);
        if (again && alive) {
          again = false;
          void refresh();
        }
      }
    };
    const scheduled = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => void refresh(), 150);
    };
    const reconnect = () => {
      void refresh();
      if (!navigator.onLine) setConnection('Offline');
    };
    const init = async () => {
      try {
        const { data: session, error: sessionError } =
          await db!.auth.getSession();
        if (sessionError) throw sessionError;
        let id = session.session?.user.id;
        if (!id) {
          const { data, error: authError } = await db!.auth.signInAnonymously();
          if (authError) throw authError;
          id = data.user?.id;
        }
        if (!alive || !id) return;
        setUid(id);
        fetchRef.current = refresh;
        channel = db!.channel('thesis-shared');
        for (const table of ['ideas', 'votes', 'comments', 'datasets'])
          channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            scheduled,
          );
        channel.subscribe((status) => {
          if (!alive) return;
          if (status === 'SUBSCRIBED') {
            setConnection('Live verbunden');
            void refresh();
          } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status))
            setConnection(
              navigator.onLine ? 'Live unterbrochen · 15s-Abgleich' : 'Offline',
            );
        });
        await refresh();
        timer = setInterval(() => void refresh(), 15_000);
      } catch (e) {
        if (alive) {
          setLoading(false);
          setConnection('Nicht verbunden');
          setError(
            'Verbindung fehlgeschlagen. Aktiviere anonyme Anmeldung in Supabase und prüfe die Umgebungsvariablen. ' +
              (e as Error).message,
          );
        }
      }
    };
    void init();
    addEventListener('focus', reconnect);
    addEventListener('online', reconnect);
    addEventListener('offline', reconnect);
    return () => {
      alive = false;
      fetchRef.current = null;
      clearInterval(timer);
      clearTimeout(debounce);
      if (channel) void db!.removeChannel(channel);
      removeEventListener('focus', reconnect);
      removeEventListener('online', reconnect);
      removeEventListener('offline', reconnect);
    };
  }, []);
  const perform = useCallback(
    async (live: () => Promise<void>, demo: (s: Snapshot) => Snapshot) => {
      if (!member || !owner)
        throw new Error(
          'Wähle deinen Namen und warte, bis die Verbindung bereit ist.',
        );
      if (savingRef.current)
        throw new Error('Eine Änderung wird noch gespeichert.');
      savingRef.current = true;
      setSaving(true);
      try {
        if (db) {
          await live();
          await fetchRef.current?.();
        } else persistDemo(demo(current.current));
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [member, owner],
  );
  async function checked(
    promise: PromiseLike<{ error: { message: string } | null }>,
  ) {
    const { error } = await promise;
    if (error) throw new Error(error.message);
  }
  async function updated(
    promise: PromiseLike<{
      data: unknown[] | null;
      error: { message: string } | null;
    }>,
  ) {
    const result = await promise;
    if (result.error) throw new Error(result.error.message);
    if (!result.data?.length)
      throw new Error(
        'Dieser Eintrag wurde inzwischen geändert oder gehört einer anderen Sitzung. Schließe den Dialog und öffne ihn erneut.',
      );
  }
  return {
    member,
    chooseMember,
    owner,
    snapshot,
    connection,
    error,
    loading,
    saving,
    resetDemo: () => persistDemo(demoSnapshot()),
    refresh: () => fetchRef.current?.(),
    saveIdea: async (
      input: Pick<
        Idea,
        'title' | 'question' | 'description' | 'source_url' | 'tags' | 'status'
      >,
      existing?: Idea,
    ) => {
      const now = new Date().toISOString();
      const record = { ...input, member: member!, owner_id: owner };
      await perform(
        async () => {
          if (existing)
            await updated(
              db!
                .from('ideas')
                .update(input)
                .eq('id', existing.id)
                .eq('owner_id', owner)
                .eq('updated_at', existing.updated_at)
                .select('id'),
            );
          else await checked(db!.from('ideas').insert(record));
        },
        (s) => ({
          ...s,
          ideas: existing
            ? s.ideas.map((i) =>
                i.id === existing.id ? { ...i, ...input, updated_at: now } : i,
              )
            : [
                {
                  ...record,
                  id: crypto.randomUUID(),
                  created_at: now,
                  updated_at: now,
                },
                ...s.ideas,
              ],
        }),
      );
    },
    deleteIdea: async (idea: Idea) =>
      perform(
        async () =>
          updated(
            db!
              .from('ideas')
              .delete()
              .eq('id', idea.id)
              .eq('owner_id', owner)
              .eq('updated_at', idea.updated_at)
              .select('id'),
          ),
        (s) => ({
          ...s,
          ideas: s.ideas.filter((i) => i.id !== idea.id),
          votes: s.votes.filter((v) => v.idea_id !== idea.id),
          comments: s.comments.filter((c) => c.idea_id !== idea.id),
          datasets: s.datasets.map((d) =>
            d.idea_id === idea.id ? { ...d, idea_id: null } : d,
          ),
        }),
      ),
    toggleVote: async (idea: Idea) => {
      const voted = current.current.votes.some(
        (v) => v.idea_id === idea.id && v.user_id === owner,
      );
      const record: Vote = {
        idea_id: idea.id,
        user_id: owner,
        member: member!,
        created_at: new Date().toISOString(),
      };
      await perform(
        async () => {
          if (voted)
            await checked(
              db!
                .from('votes')
                .delete()
                .eq('idea_id', idea.id)
                .eq('user_id', owner),
            );
          else
            await checked(
              db!
                .from('votes')
                .insert({ idea_id: idea.id, user_id: owner, member }),
            );
        },
        (s) => ({
          ...s,
          votes: voted
            ? s.votes.filter(
                (v) => !(v.idea_id === idea.id && v.user_id === owner),
              )
            : [...s.votes, record],
        }),
      );
    },
    addComment: async (ideaId: string, body: string) => {
      const record: Comment = {
        id: crypto.randomUUID(),
        idea_id: ideaId,
        owner_id: owner,
        member: member!,
        body,
        created_at: new Date().toISOString(),
      };
      await perform(
        async () =>
          checked(
            db!
              .from('comments')
              .insert({ idea_id: ideaId, owner_id: owner, member, body }),
          ),
        (s) => ({ ...s, comments: [...s.comments, record] }),
      );
    },
    deleteComment: async (comment: Comment) =>
      perform(
        async () =>
          updated(
            db!
              .from('comments')
              .delete()
              .eq('id', comment.id)
              .eq('owner_id', owner)
              .select('id'),
          ),
        (s) => ({
          ...s,
          comments: s.comments.filter((c) => c.id !== comment.id),
        }),
      ),
    saveDataset: async (
      input: Pick<
        Dataset,
        | 'name'
        | 'idea_id'
        | 'source_url'
        | 'columns'
        | 'rows'
        | 'chart'
        | 'findings'
      >,
      existing?: Dataset,
    ) => {
      const now = new Date().toISOString();
      const record = { ...input, member: member!, owner_id: owner };
      await perform(
        async () => {
          if (existing)
            await updated(
              db!
                .from('datasets')
                .update(input)
                .eq('id', existing.id)
                .eq('owner_id', owner)
                .eq('updated_at', existing.updated_at)
                .select('id'),
            );
          else await checked(db!.from('datasets').insert(record));
        },
        (s) => ({
          ...s,
          datasets: existing
            ? s.datasets.map((d) =>
                d.id === existing.id ? { ...d, ...input, updated_at: now } : d,
              )
            : [
                {
                  ...record,
                  id: crypto.randomUUID(),
                  created_at: now,
                  updated_at: now,
                },
                ...s.datasets,
              ],
        }),
      );
    },
    deleteDataset: async (dataset: Dataset) =>
      perform(
        async () =>
          updated(
            db!
              .from('datasets')
              .delete()
              .eq('id', dataset.id)
              .eq('owner_id', owner)
              .eq('updated_at', dataset.updated_at)
              .select('id'),
          ),
        (s) => ({
          ...s,
          datasets: s.datasets.filter((d) => d.id !== dataset.id),
        }),
      ),
  };
}
export type Hub = ReturnType<typeof useHub>;
