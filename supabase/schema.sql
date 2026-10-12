-- thesis collective v1. Use a NEW, dedicated Supabase project.
-- Run in the SQL Editor. Safe to rerun against this application's schema.
create extension if not exists pgcrypto;

create table if not exists public.ideas (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 member text not null check (member in ('Jan','Marcel','Ole','Szymon','Paul','Bolivar')),
 title text not null check (length(trim(title)) between 1 and 140),
 question text not null check (length(trim(question)) between 1 and 1000),
 description text not null default '' check (length(description) <= 4000),
 source_url text not null default '' check (length(source_url) <= 2000 and (source_url = '' or source_url ~* '^https?://')),
 tags text[] not null default '{}' check (array_length(tags,1) is null or array_length(tags,1) <= 5),
 status text not null default 'idea' check (status in ('idea','shortlisted','chosen')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.votes (
 idea_id uuid not null references public.ideas(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 member text not null check (member in ('Jan','Marcel','Ole','Szymon','Paul','Bolivar')),
 created_at timestamptz not null default now(), primary key (idea_id,user_id)
);
create table if not exists public.comments (
 id uuid primary key default gen_random_uuid(),
 idea_id uuid not null references public.ideas(id) on delete cascade,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 member text not null check (member in ('Jan','Marcel','Ole','Szymon','Paul','Bolivar')),
 body text not null check (length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create or replace function public.thesis_valid_table(cols jsonb, data_rows jsonb, config jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare c jsonb; r jsonb; cell jsonb; n integer;
begin
 if jsonb_typeof(cols) <> 'array' or jsonb_typeof(data_rows) <> 'array' or jsonb_typeof(config) <> 'object' then return false; end if;
 n := jsonb_array_length(cols);
 if n < 2 or n > 30 or jsonb_array_length(data_rows) < 1 or jsonb_array_length(data_rows) > 2000 or octet_length(data_rows::text) > 1000000 then return false; end if;
 for c in select value from jsonb_array_elements(cols) loop
  if jsonb_typeof(c) <> 'string' or length(trim(c #>> '{}')) not between 1 and 100 then return false; end if;
 end loop;
 if (select count(distinct trim(value)) from jsonb_array_elements_text(cols)) <> n then return false; end if;
 for r in select value from jsonb_array_elements(data_rows) loop
  if jsonb_typeof(r) <> 'array' or jsonb_array_length(r) <> n then return false; end if;
  for cell in select value from jsonb_array_elements(r) loop
   if jsonb_typeof(cell) <> 'string' or length(cell #>> '{}') > 500 then return false; end if;
  end loop;
 end loop;
 if config->>'kind' is null or config->>'kind' not in ('bar','line','scatter') or config->>'decimal' is null or config->>'decimal' not in ('dot','comma') then return false; end if;
 if jsonb_typeof(config->'unit') <> 'string' or config->>'unit' is null or length(config->>'unit') > 40 then return false; end if;
 if config->>'x' is null or config->>'y' is null or (config->>'x') !~ '^\d+$' or (config->>'y') !~ '^\d+$' then return false; end if;
 if (config->>'x')::integer >= n or (config->>'y')::integer >= n then return false; end if;
 return true;
exception when others then return false;
end $$;
create table if not exists public.datasets (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 member text not null check (member in ('Jan','Marcel','Ole','Szymon','Paul','Bolivar')),
 idea_id uuid references public.ideas(id) on delete set null,
 name text not null check (length(trim(name)) between 1 and 140),
 source_url text not null default '' check (length(source_url) <= 2000 and (source_url = '' or source_url ~* '^https?://')),
 columns jsonb not null, rows jsonb not null,
 chart jsonb not null,
 findings text not null default '' check (length(findings) <= 8000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint valid_dataset check (public.thesis_valid_table(columns, rows, chart))
);
create index if not exists ideas_owner_idx on public.ideas(owner_id);
create index if not exists comments_idea_idx on public.comments(idea_id);
create index if not exists comments_owner_idx on public.comments(owner_id);
create index if not exists datasets_owner_idx on public.datasets(owner_id);
create index if not exists datasets_idea_idx on public.datasets(idea_id);
create index if not exists votes_user_idx on public.votes(user_id);

create or replace function public.thesis_touch()
returns trigger language plpgsql set search_path = public as $$
begin
 if new.owner_id is distinct from old.owner_id or new.member is distinct from old.member or new.created_at is distinct from old.created_at then
  raise exception 'Ownership, name and creation date cannot be changed';
 end if;
 new.updated_at := clock_timestamp(); return new;
end $$;
drop trigger if exists thesis_touch_ideas on public.ideas;
create trigger thesis_touch_ideas before update on public.ideas for each row execute function public.thesis_touch();
drop trigger if exists thesis_touch_datasets on public.datasets;
create trigger thesis_touch_datasets before update on public.datasets for each row execute function public.thesis_touch();

alter table public.ideas enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.datasets enable row level security;
-- Every anonymous sign-in gets the authenticated role. No raw unauthenticated reads.
drop policy if exists group_read on public.ideas;
create policy group_read on public.ideas for select to authenticated using (true);
drop policy if exists owner_insert on public.ideas;
create policy owner_insert on public.ideas for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists owner_update on public.ideas;
create policy owner_update on public.ideas for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists owner_delete on public.ideas;
create policy owner_delete on public.ideas for delete to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists group_read on public.votes;
create policy group_read on public.votes for select to authenticated using (true);
drop policy if exists owner_insert on public.votes;
create policy owner_insert on public.votes for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists owner_delete on public.votes;
create policy owner_delete on public.votes for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists group_read on public.comments;
create policy group_read on public.comments for select to authenticated using (true);
drop policy if exists owner_insert on public.comments;
create policy owner_insert on public.comments for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists owner_delete on public.comments;
create policy owner_delete on public.comments for delete to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists group_read on public.datasets;
create policy group_read on public.datasets for select to authenticated using (true);
drop policy if exists owner_insert on public.datasets;
create policy owner_insert on public.datasets for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists owner_update on public.datasets;
create policy owner_update on public.datasets for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists owner_delete on public.datasets;
create policy owner_delete on public.datasets for delete to authenticated using ((select auth.uid()) = owner_id);

-- Remove broad default grants: IDs, authorship and timestamps cannot be patched by clients.
revoke all on public.ideas, public.votes, public.comments, public.datasets from anon, authenticated;
grant select, delete on public.ideas, public.votes, public.comments, public.datasets to authenticated;
grant insert (owner_id, member, title, question, description, source_url, tags, status) on public.ideas to authenticated;
grant update (title, question, description, source_url, tags, status) on public.ideas to authenticated;
grant insert (idea_id, user_id, member) on public.votes to authenticated;
grant insert (idea_id, owner_id, member, body) on public.comments to authenticated;
grant insert (owner_id, member, idea_id, name, source_url, columns, rows, chart, findings) on public.datasets to authenticated;
grant update (idea_id, name, source_url, columns, rows, chart, findings) on public.datasets to authenticated;
revoke execute on function public.thesis_touch() from public, anon, authenticated;
revoke execute on function public.thesis_valid_table(jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.thesis_valid_table(jsonb,jsonb,jsonb) to authenticated;

-- Include all four tables in the Supabase realtime publication.
do $$
declare t text;
begin
 foreach t in array array['ideas','votes','comments','datasets'] loop
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I', t);
  end if;
 end loop;
end $$;
