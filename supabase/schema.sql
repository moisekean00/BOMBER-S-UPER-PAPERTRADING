-- Long Ball: schema del database. Da incollare una volta sola in
-- Supabase -> SQL Editor -> New query -> Run.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  trader_name text not null unique check (char_length(trader_name) between 2 and 24),
  cash numeric not null default 100000,
  paid boolean not null default false,
  is_admin boolean not null default false,
  eliminated_on date,
  created_at timestamptz not null default now()
);

-- Portafoglio attivo (pubblico per tutti i giocatori).
create table if not exists positions (
  user_id uuid not null references profiles on delete cascade,
  symbol text not null,
  name text not null,
  kind text not null check (kind in ('stock','etf_equity','etf_bond','etf_other','etp','future','option')),
  currency text not null,
  qty numeric not null,
  multiplier numeric not null default 1,
  leverage numeric not null default 1,
  margin numeric not null default 0,
  ref_price numeric,
  expiry date,
  underlying text,
  strike numeric,
  opt_type text,
  primary key (user_id, symbol)
);

-- Acquisti a leva su azioni ed ETF (aggiunto il 25/10).
alter table positions add column if not exists debt numeric not null default 0;

-- Storico delle operazioni eseguite alla chiusura di ogni finestra (aggiunto il 25/10).
create table if not exists trades (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  window_id int not null,
  date date not null,
  symbol text not null,
  name text not null,
  kind text not null,
  side text not null,
  qty_before numeric not null,
  qty_after numeric not null,
  price numeric,
  currency text not null,
  amount numeric not null,
  exposure numeric not null,
  leverage numeric not null default 1,
  created_at timestamptz not null default now()
);
alter table trades enable row level security;
drop policy if exists "read trades" on trades;
create policy "read trades" on trades for select to authenticated using (true);

-- Formazione inviata in una finestra: privata fino alla chiusura.
create table if not exists lineups (
  user_id uuid not null references profiles on delete cascade,
  window_id int not null,
  positions jsonb not null,
  cash numeric not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, window_id)
);

-- Esito alla chiusura: eseguiti o scartati, con il motivo (aggiunto il 27/10).
alter table lineups add column if not exists status text;
alter table lineups add column if not exists note text;

-- Chiusure ufficiali usate per finestre e valutazioni (una per simbolo e data).
create table if not exists prices (
  symbol text not null,
  date date not null,
  close numeric not null,
  currency text not null,
  primary key (symbol, date)
);

create table if not exists snapshots (
  user_id uuid not null references profiles on delete cascade,
  date date not null,
  total numeric not null,
  cash numeric not null,
  primary key (user_id, date)
);

create table if not exists ledger (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  date date not null,
  symbol text not null,
  kind text not null,
  amount numeric not null,
  note text,
  created_at timestamptz not null default now()
);

-- Lavori automatici già eseguiti (regolamento del venerdì, chiusura finestre).
create table if not exists jobs (
  key text primary key,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  error text
);

-- Profilo creato in automatico alla registrazione, con il nome da trader scelto.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, trader_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'trader_name'), ''), 'Trader ' || left(new.id::text, 4)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sicurezza: tutti i giocatori loggati leggono classifica e portafogli attivi,
-- ognuno legge solo la propria formazione in corso. Le scritture passano solo
-- dal server (service role), che controlla le regole.
alter table profiles enable row level security;
alter table positions enable row level security;
alter table lineups enable row level security;
alter table prices enable row level security;
alter table snapshots enable row level security;
alter table ledger enable row level security;
alter table jobs enable row level security;

drop policy if exists "read profiles" on profiles;
create policy "read profiles" on profiles for select to authenticated using (true);
drop policy if exists "read positions" on positions;
create policy "read positions" on positions for select to authenticated using (true);
drop policy if exists "read own lineup" on lineups;
create policy "read own lineup" on lineups for select to authenticated using (auth.uid() = user_id);
drop policy if exists "read prices" on prices;
create policy "read prices" on prices for select to authenticated using (true);
drop policy if exists "read snapshots" on snapshots;
create policy "read snapshots" on snapshots for select to authenticated using (true);
drop policy if exists "read ledger" on ledger;
create policy "read ledger" on ledger for select to authenticated using (true);

-- Il primo iscritto diventa commissario se nessuno lo è ancora.
update profiles set is_admin = true
where id = (select id from profiles order by created_at limit 1)
  and not exists (select 1 from profiles where is_admin);
