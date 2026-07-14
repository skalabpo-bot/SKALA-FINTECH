-- API externa: llaves para que plataformas de terceros consuman la Edge Function `api`.
-- La validación de la llave la hace la Edge Function con el service role (bypassa RLS).
create extension if not exists pgcrypto;

create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,                 -- nombre de la plataforma externa
  key          text not null unique,          -- token secreto (se envía en el header x-api-key)
  scopes       text[] not null default '{}',  -- ej. {'credits:create','credits:read','credits:update'}
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

-- RLS activo SIN políticas públicas: nadie (anon/authenticated) puede leer las llaves.
-- Solo el service role (Edge Function) las lee/actualiza.
alter table public.api_keys enable row level security;

-- Llave de ejemplo con todos los scopes (para pruebas). Rotar/eliminar en producción.
insert into public.api_keys (name, key, scopes)
values (
  'Plataforma Demo',
  'sk_live_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  array['credits:create','credits:read','credits:update']
)
on conflict do nothing;
