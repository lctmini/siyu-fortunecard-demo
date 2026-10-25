-- SiYu Universe schema (run this whole file in Supabase SQL Editor)
create extension if not exists pgcrypto;

create sequence if not exists public.player_number_seq start 1;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  player_number bigint not null unique default nextval('public.player_number_seq'),
  player_id text generated always as ('SY-' || lpad(player_number::text, 4, '0')) stored unique,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name_en text not null,
  caption_en text not null default 'A little SiYu moment ✦',
  rarity text not null default 'N' check (rarity in ('N','R','SR','SSR','UR')),
  moment_tag text not null default 'SIYU',
  image_url text,
  active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.daily_fortunes (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  fortune_date date not null,
  title_en text not null,
  message_en text not null,
  created_at timestamptz not null default now(),
  unique(player_id, fortune_date)
);

create table if not exists public.draw_logs (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  card_id bigint not null references public.cards(id),
  draw_date date not null,
  created_at timestamptz not null default now()
);
create index if not exists draw_logs_player_date_idx on public.draw_logs(player_id, draw_date);

create table if not exists public.player_cards (
  player_id uuid not null references public.players(id) on delete cascade,
  card_id bigint not null references public.cards(id),
  quantity int not null default 1 check (quantity > 0),
  first_obtained_at timestamptz not null default now(),
  last_obtained_at timestamptz not null default now(),
  primary key(player_id, card_id)
);

-- The token is hashed server-side before storing, so the raw token is not persisted.
create or replace function public.get_or_create_player(p_token text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_player public.players;
begin
  if p_token is null or length(p_token) < 30 or length(p_token) > 50 then
    raise exception 'Invalid player token';
  end if;
  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  select * into v_player from public.players where token_hash = v_hash;
  if not found then
    insert into public.players(token_hash) values(v_hash)
    on conflict(token_hash) do nothing
    returning * into v_player;
    if v_player.id is null then
      select * into v_player from public.players where token_hash = v_hash;
    end if;
  end if;
  return json_build_object('id',v_player.id,'player_id',v_player.player_id,'created_at',v_player.created_at);
end;
$$;

-- Atomically enforces three daily draws, writes draw history and increments collection.
create or replace function public.draw_daily_card(p_player_id uuid, p_draw_date date)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_card public.cards;
  v_qty int;
begin
  perform pg_advisory_xact_lock(hashtext(p_player_id::text || p_draw_date::text));
  select count(*) into v_count from public.draw_logs where player_id=p_player_id and draw_date=p_draw_date;
  if v_count >= 3 then
    return json_build_object('error','DAILY_LIMIT','draws_left',0);
  end if;
  select * into v_card from public.cards where active=true order by random() limit 1;
  if v_card.id is null then raise exception 'No active cards in the card pool'; end if;
  insert into public.draw_logs(player_id,card_id,draw_date) values(p_player_id,v_card.id,p_draw_date);
  insert into public.player_cards(player_id,card_id,quantity)
    values(p_player_id,v_card.id,1)
    on conflict(player_id,card_id) do update set quantity=player_cards.quantity+1,last_obtained_at=now()
    returning quantity into v_qty;
  return json_build_object('card',row_to_json(v_card),'duplicate',v_qty>1,'quantity',v_qty,'draws_left',2-v_count);
end;
$$;

-- Lock down direct access. Only Netlify functions use the service role key.
alter table public.players enable row level security;
alter table public.cards enable row level security;
alter table public.daily_fortunes enable row level security;
alter table public.draw_logs enable row level security;
alter table public.player_cards enable row level security;
revoke all on public.players, public.daily_fortunes, public.draw_logs, public.player_cards from anon, authenticated;
grant select on public.cards to anon, authenticated;
grant execute on function public.get_or_create_player(text) to service_role;
grant execute on function public.draw_daily_card(uuid,date) to service_role;

-- Starter example cards. Replace image_url with paths such as /cards/card-001.jpg.
insert into public.cards(slug,name_en,caption_en,rarity,moment_tag,image_url,sort_order) values
('siyu-001','A Little Glance','A little glance that fans remember.','N','GLANCE','/cards/card-001.jpg',1),
('siyu-002','Side by Side','Two people sharing the same frame.','R','TOGETHER','/cards/card-002.jpg',2),
('siyu-003','Soft Smile','A smile that makes the day brighter.','SR','SMILE','/cards/card-003.jpg',3),
('siyu-004','Destiny Moment','A treasured moment in the SiYu universe.','SSR','DESTINY','/cards/card-004.jpg',4),
('siyu-005','Universe Connection','A rare card for a sparkling memory.','UR','UNIVERSE','/cards/card-005.jpg',5)
on conflict(slug) do nothing;
