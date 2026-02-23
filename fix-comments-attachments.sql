-- ===================================================================
-- FIX: Tabla Comments - Adjuntos en Chat Operativo
-- ===================================================================
-- Asegurar que la tabla comments tenga las columnas para adjuntos
-- ===================================================================

-- PASO 1: Verificar estructura actual
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'comments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASO 2: Agregar columnas de adjuntos si no existen
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- PASO 3: Verificar políticas RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'comments' AND schemaname = 'public';

-- PASO 4: Asegurar que RLS está habilitado
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- PASO 5: Eliminar TODAS las políticas existentes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'comments' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.comments';
    END LOOP;
END $$;

-- PASO 6: Crear políticas permisivas
CREATE POLICY "Authenticated can read comments"
ON public.comments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ===================================================================
-- VERIFICACIÓN
-- ===================================================================
-- Ver comentarios recientes con adjuntos:
SELECT id, credit_id, text, attachment_name, attachment_url, created_at
FROM public.comments
WHERE attachment_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Ver TODOS los comentarios (incluso sin adjuntos):
SELECT
    c.id,
    c.credit_id,
    p.full_name as user_name,
    LEFT(c.text, 50) as text_preview,
    c.attachment_name,
    c.attachment_url,
    c.created_at
FROM public.comments c
LEFT JOIN public.profiles p ON c.user_id = p.id
ORDER BY c.created_at DESC
LIMIT 20;
