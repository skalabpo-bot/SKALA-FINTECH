-- Hardening de la API externa (jul 2026):
-- 1) Las llaves ya NO se guardan en texto plano: se guarda solo el hash SHA-256 + un prefijo público.
-- 2) Expiración opcional de llaves.
-- 3) Idempotencia para POST /credits (evita créditos duplicados en reintentos).
-- 4) REVOKE explícito a anon/authenticated (la Edge Function usa service role).

alter table public.api_keys add column if not exists key_hash text;
alter table public.api_keys add column if not exists key_prefix text;
alter table public.api_keys add column if not exists expires_at timestamptz;

-- Backfill de llaves existentes: hash SHA-256 (hex) + prefijo.
update public.api_keys
  set key_hash = encode(digest(key, 'sha256'), 'hex'),
      key_prefix = left(key, 12)
  where key is not null and key_hash is null;

create unique index if not exists api_keys_key_hash_uidx on public.api_keys(key_hash);
create index if not exists api_keys_key_prefix_idx on public.api_keys(key_prefix);

-- Cinturón y tirantes: nadie salvo el service role toca la tabla.
revoke all on public.api_keys from anon, authenticated;

-- Idempotencia en creación de créditos por API.
alter table public.credits add column if not exists idempotency_key text;
create unique index if not exists credits_idempotency_key_uidx
  on public.credits(idempotency_key) where idempotency_key is not null;

-- (Segunda fase, tras redesplegar la Edge Function que usa key_hash:)
-- alter table public.api_keys drop column if exists key;
