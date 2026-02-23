-- =====================================================
-- MIGRACIÓN: Tabla pension_types
-- Ejecutar en Supabase > SQL Editor
-- =====================================================

-- 1. Crear la tabla
CREATE TABLE IF NOT EXISTS pension_types (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insertar los tipos iniciales
INSERT INTO pension_types (name) VALUES
    ('VEJEZ'),
    ('SUSTITUCIÓN'),
    ('INVALIDEZ'),
    ('ACTIVO')
ON CONFLICT (name) DO NOTHING;

-- 3. Habilitar RLS
ALTER TABLE pension_types ENABLE ROW LEVEL SECURITY;

-- 4. Política: cualquier usuario autenticado puede leer
CREATE POLICY "pension_types_select"
    ON pension_types FOR SELECT
    TO authenticated
    USING (true);

-- 5. Política: solo ADMIN puede insertar/editar/eliminar
CREATE POLICY "pension_types_admin_write"
    ON pension_types FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- =====================================================
-- Para agregar más tipos en el futuro, ejecutar:
--   INSERT INTO pension_types (name) VALUES ('NUEVO_TIPO');
-- =====================================================
