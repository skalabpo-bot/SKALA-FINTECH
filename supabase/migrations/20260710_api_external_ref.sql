-- API: external_ref (enlace de IDs aliado ↔ Skala) + hardening de llaves (jul 10 2026).

-- external_ref: el aliado guarda SU identificador en el crédito de Skala, para que ambas
-- plataformas sepan que es "el mismo crédito" (y para deduplicar).
alter table public.credits add column if not exists external_ref text;
create index if not exists credits_external_ref_idx on public.credits(external_ref) where external_ref is not null;

-- Hardening de llaves (aplicado de forma NO destructiva: el DROP COLUMN estaba bloqueado en prod).
-- La columna api_keys.key se conserva pero solo guarda el HASH (nunca el token en claro);
-- la autenticación siempre usa key_hash. La llave demo queda desactivada.
update public.api_keys set key = key_hash where key is distinct from key_hash;
update public.api_keys set active = false where name = 'Plataforma Demo';
