-- Puzzle multiplayer game schema.
-- Run this once in your Supabase project's SQL editor (Dashboard > SQL Editor > New query).
-- Safe to re-run: it drops and recreates the objects it owns.

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists rooms (
  id            text primary key,                    -- short shareable room code (e.g. "f7k2m9pq")
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  completed_at  timestamptz,
  host_name     text not null check (char_length(host_name) between 1 and 40),
  image_url     text not null,
  image_source  text not null check (image_source in ('default', 'custom')),
  image_width   integer not null check (image_width > 0),
  image_height  integer not null check (image_height > 0),
  grid_rows     integer not null check (grid_rows between 2 and 20),
  grid_cols     integer not null check (grid_cols between 2 and 20),
  status        text not null default 'waiting' check (status in ('waiting', 'playing', 'completed')),
  piece_state   jsonb not null default '{}'::jsonb
);

create table if not exists messages (
  id          bigint generated always as identity primary key,
  room_id     text not null references rooms(id) on delete cascade,
  sender_name text not null check (char_length(sender_name) between 1 and 40),
  content     text not null check (char_length(content) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index if not exists messages_room_id_created_at_idx on messages (room_id, created_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- There's no login system here — the room link itself is the shared secret.
-- Anonymous (anon) clients may freely READ rooms/messages and POST chat
-- messages. They can NOT write to `rooms` directly: room creation and image
-- uploads go through server-side code using the service role key (so we can
-- validate everything first), and in-game piece moves go through the
-- `update_piece` / `complete_room` functions below instead of raw UPDATEs.

alter table rooms enable row level security;
alter table messages enable row level security;

drop policy if exists "rooms are readable by anyone with the link" on rooms;
create policy "rooms are readable by anyone with the link"
  on rooms for select
  to anon
  using (true);

drop policy if exists "messages are readable by anyone with the link" on messages;
create policy "messages are readable by anyone with the link"
  on messages for select
  to anon
  using (true);

drop policy if exists "anyone with the link can post chat messages" on messages;
create policy "anyone with the link can post chat messages"
  on messages for insert
  to anon
  with check (true);

-- ============================================================================
-- RPC functions (security definer so anon can call them without direct
-- table-level UPDATE privileges on `rooms`)
-- ============================================================================

create or replace function update_piece(
  p_room_id text,
  p_piece_key text,
  p_piece jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update rooms
  set piece_state = jsonb_set(piece_state, array[p_piece_key], p_piece, true),
      updated_at = now()
  where id = p_room_id
    and status <> 'completed';
end;
$$;

create or replace function set_room_playing(p_room_id text) returns void
language sql
security definer
set search_path = public
as $$
  update rooms
  set status = 'playing', updated_at = now()
  where id = p_room_id
    and status = 'waiting';
$$;

create or replace function complete_room(p_room_id text) returns void
language sql
security definer
set search_path = public
as $$
  update rooms
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = p_room_id
    and status <> 'completed';
$$;

revoke all on function update_piece(text, text, jsonb) from public;
revoke all on function set_room_playing(text) from public;
revoke all on function complete_room(text) from public;
grant execute on function update_piece(text, text, jsonb) to anon;
grant execute on function set_room_playing(text) to anon;
grant execute on function complete_room(text) to anon;

-- ============================================================================
-- Realtime: broadcast INSERTs on `messages` to subscribers (used for chat).
-- Piece drag/move events do NOT go through Postgres changes — they use
-- ephemeral Realtime Broadcast messages instead, so dragging never spams
-- the database. Only the final drop position is persisted via update_piece.
-- ============================================================================

alter publication supabase_realtime add table messages;

-- ============================================================================
-- Storage: bucket for user-uploaded puzzle images.
-- Uploads always go through the server (/api/upload-image), which validates
-- the file (real format via magic bytes, size, resolution) using the service
-- role key — so there is no public INSERT policy on this bucket. Reads are
-- public since the images are shown in <img> tags on the room page.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('puzzle-images', 'puzzle-images', true)
on conflict (id) do nothing;

drop policy if exists "puzzle images are publicly readable" on storage.objects;
create policy "puzzle images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'puzzle-images');

-- ============================================================================
-- Spotify: one connection per room, so anyone in the room can see/control
-- whichever participant linked their account. Tokens are only ever read or
-- written server-side with the service role key (OAuth callback, and the
-- now-playing / control route handlers) — there is deliberately no anon
-- policy on this table, so it's unreachable from the browser even via a
-- crafted request.
-- ============================================================================

create table if not exists spotify_connections (
  room_id       text primary key references rooms(id) on delete cascade,
  connected_by  text not null check (char_length(connected_by) between 1 and 40),
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table spotify_connections enable row level security;
