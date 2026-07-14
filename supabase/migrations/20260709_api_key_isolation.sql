-- Aislamiento de la API externa por llave (jul 9 2026):
-- Cada crédito creado por la API queda "marcado" con la llave que lo creó (api_key_id).
-- La Edge Function `api` filtra TODAS las lecturas/updates por api_key_id → un aliado solo
-- puede ver/tocar SUS créditos, nunca la cartera de otros aliados ni la de Skala.
alter table public.credits add column if not exists api_key_id uuid references public.api_keys(id);
create index if not exists credits_api_key_id_idx on public.credits(api_key_id);

-- Hardening final de llaves:
-- (a) Eliminar la columna `key` en texto plano (ya solo se usa key_hash). Fase 2 pendiente.
alter table public.api_keys drop column if exists key;
-- (b) Desactivar la llave demo (tenía todos los scopes, sin expiración).
update public.api_keys set active = false where name = 'Plataforma Demo';
