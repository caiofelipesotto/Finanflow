-- ============================================================
-- FinanFlow — esquema do Supabase
-- Cole TUDO isto no SQL Editor do Supabase e clique em Run.
-- (Projeto novo: isso recria as tabelas do zero.)
-- ============================================================

-- 1) Limpa o esquema anterior
drop table if exists transactions, categories, accounts, goals, household_members, households cascade;
drop function if exists public.get_or_create_household();
drop function if exists public.join_household(text);
drop function if exists public.is_household_member(text);
drop function if exists public.set_updated_at() cascade;

-- 2) Tabelas (ids em TEXT porque o app gera ids como "tx_1699...")
create table households (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  name text not null default 'Finanças Compartilhadas',
  owner_uid text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table household_members (
  household_id text not null references households(id) on delete cascade,
  user_uid text not null,
  user_name text,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_uid)
);
create index idx_members_user on household_members(user_uid);

create table transactions (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  creator_uid text not null,
  description text not null default '',
  amount numeric(14,2) not null default 0,
  type text not null default 'expense',
  category text,
  date date not null,
  account text,
  payment_method text,
  is_paid boolean not null default false,
  notes text,
  recurrence text,
  installment jsonb,
  installment_group_id text,
  recurrence_group_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tx_household on transactions(household_id);

create table categories (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  creator_uid text not null,
  name text not null,
  icon text,
  color text,
  type text not null default 'expense',
  budget numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_cat_household on categories(household_id);

create table accounts (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  creator_uid text not null,
  name text not null,
  type text not null default 'checking',
  initial_balance numeric(14,2) not null default 0,
  color text,
  card_limit numeric(14,2),
  card_due_day integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_acc_household on accounts(household_id);

create table goals (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  creator_uid text not null,
  title text not null,
  target_amount numeric(14,2) not null default 0,
  current_amount numeric(14,2) not null default 0,
  deadline date,
  color text,
  icon text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_goal_household on goals(household_id);

-- 3) updated_at automático
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_updated_households before update on households for each row execute function public.set_updated_at();
create trigger trg_updated_transactions before update on transactions for each row execute function public.set_updated_at();
create trigger trg_updated_categories before update on categories for each row execute function public.set_updated_at();
create trigger trg_updated_accounts before update on accounts for each row execute function public.set_updated_at();
create trigger trg_updated_goals before update on goals for each row execute function public.set_updated_at();

-- 4) Ajudantes de permissão
-- SECURITY DEFINER: consulta household_members sem entrar em recursão de RLS.
create function public.is_household_member(hid text)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_uid = auth.uid()::text
  );
$$;

-- Espaço do usuário: devolve o que ele já tem ou cria um novo no 1º acesso.
create function public.get_or_create_household()
returns households language plpgsql security definer set search_path = public as $$
declare
  v_uid text := auth.uid()::text;
  hh households;
  v_name text;
  v_code text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select h.* into hh
  from household_members m join households h on h.id = m.household_id
  where m.user_uid = v_uid
  limit 1;
  if found then return hh; end if;

  v_name := coalesce(
    nullif((auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif((auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    'Finanças Compartilhadas'
  );

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into households (name, owner_uid, invite_code)
      values ('Finanças Compartilhadas', v_uid, v_code)
      returning * into hh;
      exit;
    exception when unique_violation then
      -- código de convite colidiu: tenta outro
    end;
  end loop;

  insert into household_members (household_id, user_uid, user_name)
  values (hh.id, v_uid, v_name);

  return hh;
end $$;

-- Entrar em um espaço pelo código de convite (um espaço por usuário).
create function public.join_household(p_code text)
returns households language plpgsql security definer set search_path = public as $$
declare
  v_uid text := auth.uid()::text;
  hh households;
  v_name text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_code is null or length(trim(p_code)) < 4 then
    raise exception 'Código inválido.';
  end if;

  select * into hh from households
  where upper(invite_code) = upper(trim(p_code))
  limit 1;
  if not found then raise exception 'Código de convite não encontrado.'; end if;

  v_name := coalesce(
    nullif((auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif((auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    'Usuário'
  );

  delete from household_members where user_uid = v_uid;
  insert into household_members (household_id, user_uid, user_name)
  values (hh.id, v_uid, v_name)
  on conflict (household_id, user_uid) do nothing;

  return hh;
end $$;

-- 5) Row Level Security
alter table households        enable row level security;
alter table household_members enable row level security;
alter table transactions      enable row level security;
alter table categories        enable row level security;
alter table accounts          enable row level security;
alter table goals             enable row level security;

-- households: vejo os espaços dos quais participo (ou que são meus)
create policy hh_select on households for select to authenticated
  using (owner_uid = auth.uid()::text or public.is_household_member(id));
create policy hh_update on households for update to authenticated
  using (owner_uid = auth.uid()::text) with check (owner_uid = auth.uid()::text);

-- members: vejo os membros do meu espaço; só eu saio/entro como eu mesmo
create policy hm_select on household_members for select to authenticated
  using (public.is_household_member(household_id));
create policy hm_insert on household_members for insert to authenticated
  with check (user_uid = auth.uid()::text);
create policy hm_delete on household_members for delete to authenticated
  using (user_uid = auth.uid()::text);

-- dados financeiros: só do meu espaço
create policy tx_all on transactions for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy cat_all on categories for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy acc_all on accounts for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy goal_all on goals for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- 6) Permissões (a RLS acima continua filtrando linha por linha)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_household_member(text) to authenticated;
grant execute on function public.get_or_create_household() to authenticated;
grant execute on function public.join_household(text) to authenticated;
