-- API bidireccional — webhooks firmados y aislados por aliado (jul 10 2026).
-- Vía de vuelta (Skala → aliado): cuando cambia el estado de un crédito, un trigger llama
-- a la Edge Function `ally-notify`, que arma el payload, lo FIRMA (HMAC-SHA256 con el
-- webhook_secret de la llave) y lo envía a la webhook_url del aliado. Solo el aliado dueño.

-- Config de webhook + alcance por entidad, por llave.
alter table public.api_keys add column if not exists webhook_url    text;
alter table public.api_keys add column if not exists webhook_secret text;   -- secreto de firma HMAC (se comparte con el aliado)
alter table public.api_keys add column if not exists entity_scope   text[]; -- null = aislado a lo que la llave creó; si tiene entidades, ve las de esas entidades

create extension if not exists pg_net;

-- El trigger llama a ally-notify con un secreto interno. NO se versiona el valor real:
-- reemplazar '<ALLY_NOTIFY_SECRET>' por el valor de la variable de entorno ALLY_NOTIFY_SECRET
-- (el mismo que tiene la Edge Function). En producción ya quedó aplicado con el valor real.
create or replace function public.notify_ally_status_change() returns trigger
language plpgsql security definer as $fn$
begin
  if new.status_id is distinct from old.status_id then
    if exists (select 1 from public.api_keys k
               where k.active and k.webhook_url is not null
                 and (k.id = new.api_key_id or (k.entity_scope is not null and new.entity_name = any(k.entity_scope)))) then
      perform net.http_post(
        url := 'https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/ally-notify',
        headers := jsonb_build_object('Content-Type','application/json','x-ally-notify-secret','<ALLY_NOTIFY_SECRET>'),
        body := jsonb_build_object('credit_id', new.id, 'event','credit_status_change','old_status', old.status_id, 'new_status', new.status_id)
      );
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_notify_ally_status on public.credits;
create trigger trg_notify_ally_status after update on public.credits
  for each row execute function public.notify_ally_status_change();
