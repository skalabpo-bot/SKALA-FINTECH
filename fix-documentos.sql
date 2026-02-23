-- ===================================================================
-- FIX: Tabla de Documentos y Permisos
-- ===================================================================
-- Crear tabla documents si no existe y configurar políticas RLS
-- ===================================================================

-- PASO 1: Crear tabla documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id UUID NOT NULL REFERENCES public.credits(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 2: Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_documents_credit_id ON public.documents(credit_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents(uploaded_at DESC);

-- PASO 3: Habilitar RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- PASO 4: Eliminar políticas antiguas
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos" ON public.documents;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar documentos" ON public.documents;

-- PASO 5: Crear políticas permisivas
CREATE POLICY "Public can read documents"
ON public.documents
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Authenticated can insert documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ===================================================================
-- VERIFICACIÓN
-- ===================================================================
-- Ver la estructura de la tabla:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'documents' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver las políticas:
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'documents';

-- ===================================================================
-- TEST: Verificar que puedes leer documentos existentes
-- ===================================================================
-- Primero ver qué columnas tiene realmente la tabla
SELECT column_name FROM information_schema.columns
WHERE table_name = 'documents' AND table_schema = 'public';

-- Luego leer documentos (ajusta según las columnas que tengas)
SELECT * FROM public.documents LIMIT 10;
