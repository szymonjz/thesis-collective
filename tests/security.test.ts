import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
let pg: PGlite;
const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';
let ideaId = '';
const datasetBody = {
  name: 'Test',
  columns: ['Ort', 'Wert'],
  rows: [['Berlin', '12']],
  chart: { kind: 'bar', x: 0, y: 1, decimal: 'dot', unit: '' },
};
async function asUser<T>(
  uid: string,
  callback: () => Promise<T>,
  role = 'authenticated',
) {
  await pg.exec(
    `begin; set local role ${role}; select set_config('request.jwt.claim.sub', '${uid}', true);`,
  );
  try {
    const result = await callback();
    await pg.exec('commit');
    return result;
  } catch (e) {
    await pg.exec('rollback');
    throw e;
  }
}
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$; grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated; insert into auth.users values ('${userA}'),('${userB}');`,
  );
  const sql = readFileSync('supabase/schema.sql', 'utf8')
    .replace('create extension if not exists pgcrypto;', '')
    .replace(/-- Include all four tables[\s\S]*$/, '');
  // PGlite has gen_random_uuid but no Supabase logical replication or pgcrypto extension.
  await pg.exec(sql);
  await pg.exec(sql);
}, 30_000);
afterAll(async () => {
  await pg.close();
});
describe('database RLS, constraints and conflicts', () => {
  it('owner can create an idea', async () => {
    const result = await asUser(userA, () =>
      pg.query<{ id: string }>(
        "insert into public.ideas(member,title,question) values ('Jan','Test idea','Can this work?') returning id",
      ),
    );
    ideaId = result.rows[0].id;
    expect(ideaId).toBeTruthy();
  });
  it('another authenticated session can read shared ideas', async () =>
    expect(
      (await asUser(userB, () => pg.query('select * from public.ideas'))).rows
        .length,
    ).toBe(1));
  it('an unauthenticated request cannot read ideas', async () =>
    await expect(
      asUser('', () => pg.query('select * from public.ideas'), 'anon'),
    ).rejects.toThrow());
  it('another session cannot overwrite or delete the idea', async () => {
    expect(
      (
        await asUser(userB, () =>
          pg.query(
            'update public.ideas set title=$1 where id=$2 returning id',
            ['Bad', ideaId],
          ),
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await asUser(userB, () =>
          pg.query('delete from public.ideas where id=$1 returning id', [
            ideaId,
          ]),
        )
      ).rows,
    ).toHaveLength(0);
  });
  it('rejects forged ownership on insert', async () =>
    await expect(
      asUser(userB, () =>
        pg.query(
          "insert into public.ideas(owner_id,member,title,question) values ($1,'Jan','Forged','Question')",
          [userA],
        ),
      ),
    ).rejects.toThrow());
  it('cannot patch author or timestamps', async () => {
    await expect(
      asUser(userA, () =>
        pg.query('update public.ideas set owner_id=$1 where id=$2', [
          userB,
          ideaId,
        ]),
      ),
    ).rejects.toThrow();
    await expect(
      asUser(userA, () =>
        pg.query('update public.ideas set updated_at=now() where id=$1', [
          ideaId,
        ]),
      ),
    ).rejects.toThrow();
  });
  it('one vote per session per idea', async () => {
    await asUser(userB, () =>
      pg.query("insert into public.votes(idea_id,member) values ($1,'Ole')", [
        ideaId,
      ]),
    );
    await expect(
      asUser(userB, () =>
        pg.query("insert into public.votes(idea_id,member) values ($1,'Ole')", [
          ideaId,
        ]),
      ),
    ).rejects.toThrow();
  });
  it('cannot remove someone else’s vote', async () =>
    expect(
      (
        await asUser(userA, () =>
          pg.query(
            'delete from public.votes where idea_id=$1 returning idea_id',
            [ideaId],
          ),
        )
      ).rows,
    ).toHaveLength(0));
  it('can comment but not delete another session’s comment', async () => {
    await asUser(userB, () =>
      pg.query(
        "insert into public.comments(idea_id,member,body) values ($1,'Ole','Hello')",
        [ideaId],
      ),
    );
    expect(
      (
        await asUser(userA, () =>
          pg.query('delete from public.comments returning id'),
        )
      ).rows,
    ).toHaveLength(0);
  });
  it('rejects malformed datasets at the database layer', async () =>
    await expect(
      asUser(userA, () =>
        pg.query(
          "insert into public.datasets(member,name,columns,rows,chart) values ('Jan',$1,$2,$3,$4)",
          [
            datasetBody.name,
            JSON.stringify(datasetBody.columns),
            JSON.stringify([['bad']]),
            JSON.stringify(datasetBody.chart),
          ],
        ),
      ),
    ).rejects.toThrow());
  it('rejects out-of-range chart axes', async () =>
    await expect(
      asUser(userA, () =>
        pg.query(
          "insert into public.datasets(member,name,columns,rows,chart) values ('Jan',$1,$2,$3,$4)",
          [
            datasetBody.name,
            JSON.stringify(datasetBody.columns),
            JSON.stringify(datasetBody.rows),
            JSON.stringify({ ...datasetBody.chart, x: 99 }),
          ],
        ),
      ),
    ).rejects.toThrow());
  it('stores valid data and blocks stale concurrent edits', async () => {
    const created = await asUser(userA, () =>
      pg.query<{ id: string; updated_at: Date }>(
        "insert into public.datasets(member,idea_id,name,columns,rows,chart) values ('Jan',$1,$2,$3,$4,$5) returning id,updated_at",
        [
          ideaId,
          datasetBody.name,
          JSON.stringify(datasetBody.columns),
          JSON.stringify(datasetBody.rows),
          JSON.stringify(datasetBody.chart),
        ],
      ),
    );
    const { id, updated_at } = created.rows[0];
    await asUser(userA, () =>
      pg.query('update public.datasets set findings=$1 where id=$2', [
        'First edit',
        id,
      ]),
    );
    expect(
      (
        await asUser(userA, () =>
          pg.query(
            'update public.datasets set findings=$1 where id=$2 and updated_at=$3 returning id',
            ['Stale edit', id, updated_at],
          ),
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await asUser(userB, () =>
          pg.query(
            'update public.datasets set findings=$1 where id=$2 returning id',
            ['Other user', id],
          ),
        )
      ).rows,
    ).toHaveLength(0);
  });
  it('cascade deletes votes/comments but keeps linked data', async () => {
    await asUser(userA, () =>
      pg.query('delete from public.ideas where id=$1', [ideaId]),
    );
    expect((await pg.query('select * from public.comments')).rows).toHaveLength(
      0,
    );
    expect((await pg.query('select * from public.votes')).rows).toHaveLength(0);
    const datasets = await pg.query<{ idea_id: string | null }>(
      'select * from public.datasets',
    );
    expect(datasets.rows).toHaveLength(1);
    expect(datasets.rows[0].idea_id).toBeNull();
  });
});
