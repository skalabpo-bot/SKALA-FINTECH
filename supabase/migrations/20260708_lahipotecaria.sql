-- Integración La Hipotecaria (jul 2026):
-- 1) Entidad con preaprobación externa (formulario nativo Skala + robot backend).
-- 2) Tabla de sesiones transitorias del robot (estado entre /start y /verify-otp).

-- Config de entidad
alter table public.financial_entities add column if not exists preaprobacion_externa boolean default false;
alter table public.financial_entities add column if not exists preaprobacion_url text;

-- Estado transitorio de la sesión de La Hipotecaria (cookies/_token/JWT/_section entre pasos).
-- Solo el service role (Edge Function) la toca; nunca se expone al navegador.
create table if not exists public.lahipotecaria_sessions (
  id uuid primary key default gen_random_uuid(),
  survey_uuid text,
  jwt text,
  section text,
  cookies text,
  client_ref text,           -- cédula u otro identificador para trazabilidad
  state jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '15 minutes'
);

alter table public.lahipotecaria_sessions enable row level security;
revoke all on public.lahipotecaria_sessions from anon, authenticated;
