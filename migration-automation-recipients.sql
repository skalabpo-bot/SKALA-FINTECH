-- ============================================================
-- MIGRACIÓN: Agregar campos automation_type y recipients a automation_rules
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna automation_type (tipo de automatización)
ALTER TABLE public.automation_rules
ADD COLUMN IF NOT EXISTS automation_type TEXT DEFAULT 'webhook';

-- 2. Agregar columna recipients (destinatarios como JSON array)
ALTER TABLE public.automation_rules
ADD COLUMN IF NOT EXISTS recipients JSONB DEFAULT '[]'::jsonb;

-- 3. Agregar columna status_filter (filtro por estado de crédito)
ALTER TABLE public.automation_rules
ADD COLUMN IF NOT EXISTS status_filter JSONB DEFAULT '[]'::jsonb;

-- 4. Comentarios descriptivos
COMMENT ON COLUMN public.automation_rules.automation_type IS 'Tipo: webhook, whatsapp, email, notificacion';
COMMENT ON COLUMN public.automation_rules.recipients IS 'Array JSON de roles destinatarios: GESTOR, ANALISTA, CLIENTE, ADMIN, COORDINADOR_ZONA';
COMMENT ON COLUMN public.automation_rules.status_filter IS 'Array JSON de nombres de estado. Si vacío, se dispara para todos los cambios de estado.';

-- 5. Verificar estructura
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'automation_rules'
ORDER BY ordinal_position;
