-- ============================================
-- Migration: app_settings table + SMMLV config
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de configuración global de la app
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMMLV (Salario Mínimo Mensual Legal Vigente) - Colombia 2025
INSERT INTO app_settings (key, value, description)
VALUES ('smmlv', '1423500', 'Salario Mínimo Mensual Legal Vigente (Colombia)')
ON CONFLICT (key) DO NOTHING;

-- Habilitar RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Política: lectura pública, escritura solo autenticados
CREATE POLICY "app_settings_read" ON app_settings FOR SELECT USING (true);
CREATE POLICY "app_settings_write" ON app_settings FOR ALL USING (auth.role() = 'authenticated');

-- Toggle de radicación (cerrar/abrir creación de créditos)
INSERT INTO app_settings (key, value, description)
VALUES ('radicacion_abierta', 'true', 'Toggle para abrir/cerrar radicación de créditos')
ON CONFLICT (key) DO NOTHING;

-- Campo requires_full_form en financial_entities
ALTER TABLE financial_entities ADD COLUMN IF NOT EXISTS requires_full_form BOOLEAN DEFAULT FALSE;
