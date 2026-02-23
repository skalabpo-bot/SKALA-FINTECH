-- ===================================================================
-- FIX: Tabla de Notificaciones
-- ===================================================================
-- Asegurar que la tabla notifications existe y tiene la estructura correcta
-- ===================================================================

-- PASO 1: Crear tabla notifications si no existe
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    credit_id UUID REFERENCES public.credits(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 2: Crear índices
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- PASO 3: Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PASO 4: Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- PASO 5: Crear políticas
CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===================================================================
-- VERIFICACIÓN
-- ===================================================================
-- Ver estructura de la tabla:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notifications' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver políticas:
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- Ver notificaciones recientes:
SELECT
    n.id,
    p.full_name as recipient,
    n.title,
    n.message,
    n.type,
    n.is_read,
    n.created_at
FROM public.notifications n
LEFT JOIN public.profiles p ON n.user_id = p.id
ORDER BY n.created_at DESC
LIMIT 10;

-- Ver admins activos que recibirán notificaciones:
SELECT id, full_name, email, role, status
FROM public.profiles
WHERE role = 'ADMIN' AND status = 'ACTIVE';
