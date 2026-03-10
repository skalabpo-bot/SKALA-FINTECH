-- Migración: Autorización de Consulta en Centrales de Riesgo
-- Ejecutar en Supabase SQL Editor

-- 1. Tabla de tokens de autorización
CREATE TABLE IF NOT EXISTS public.authorization_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id UUID NOT NULL REFERENCES public.credits(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    otp_code TEXT,
    otp_expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | signed | expired
    expires_at TIMESTAMPTZ NOT NULL,         -- vigencia 30 días
    client_name TEXT NOT NULL,
    client_document TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    client_ip TEXT,
    validation_url TEXT,                     -- link de validación de identidad (por entidad o por cliente)
    signed_at TIMESTAMPTZ,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_authorization_tokens_credit_id ON public.authorization_tokens(credit_id);
CREATE INDEX IF NOT EXISTS idx_authorization_tokens_token ON public.authorization_tokens(token);
CREATE INDEX IF NOT EXISTS idx_authorization_tokens_status ON public.authorization_tokens(status);

-- 3. RLS (Row Level Security)
ALTER TABLE public.authorization_tokens ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado o anónimo puede leer (el cliente abre el link sin login)
CREATE POLICY "authorization_tokens_select" ON public.authorization_tokens
    FOR SELECT USING (true);

-- Inserción: solo usuarios autenticados (gestores, admin, etc.)
CREATE POLICY "authorization_tokens_insert" ON public.authorization_tokens
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Actualización: cualquiera puede actualizar (el cliente firma sin login)
CREATE POLICY "authorization_tokens_update" ON public.authorization_tokens
    FOR UPDATE USING (true);

-- 4. Agregar columna validation_url a financial_entities (para configurar URL de validación por entidad)
ALTER TABLE public.financial_entities ADD COLUMN IF NOT EXISTS validation_url TEXT;

-- 5. Tabla de observaciones internas (Docs Legales)
CREATE TABLE IF NOT EXISTS public.legal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id UUID NOT NULL REFERENCES public.credits(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_notes_credit_id ON public.legal_notes(credit_id);

ALTER TABLE public.legal_notes ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados pueden leer y escribir
CREATE POLICY "legal_notes_select" ON public.legal_notes
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "legal_notes_insert" ON public.legal_notes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
