-- ============================================
-- Migration: Push Notifications
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de suscripciones push por usuario (un usuario puede tener múltiples dispositivos)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Índice para buscar suscripciones por usuario
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Solo el usuario puede ver/modificar sus propias suscripciones
CREATE POLICY "push_subs_own" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Service role puede acceder a todo (para la Edge Function)
CREATE POLICY "push_subs_service" ON push_subscriptions
  FOR SELECT USING (auth.role() = 'service_role');

-- ============================================
-- Database Webhook / Trigger para notificaciones push
-- Cuando se inserta una notificación, dispara la Edge Function
-- ============================================

-- Función que llama a la Edge Function cuando se crea una notificación
CREATE OR REPLACE FUNCTION notify_push_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Llamar a la Edge Function via pg_net (extensión de Supabase)
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'type', NEW.type,
      'credit_id', NEW.credit_id
    )::text
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- No bloquear el insert si falla el push
  RAISE WARNING 'Push notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: cada insert en notifications dispara push
DROP TRIGGER IF EXISTS trigger_push_notification ON notifications;
CREATE TRIGGER trigger_push_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_insert();

-- NOTA: Para que pg_net funcione, debes habilitar la extensión:
-- CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- Y configurar las variables de la app en Supabase Dashboard > Settings > Database > App Settings:
-- app.settings.supabase_url = 'https://yfosumpmtmcomfpbspaz.supabase.co'
-- app.settings.service_role_key = '<tu service role key>'
--
-- ALTERNATIVA sin pg_net: Usar un Database Webhook desde el dashboard de Supabase:
-- Dashboard > Database > Webhooks > Crear webhook
-- Tabla: notifications | Evento: INSERT
-- URL: https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/send-push-notification
-- Headers: Authorization: Bearer <service_role_key>
