-- Migration: Agregar columna de descuento de seguro y aval a fpm_factors
-- Ejecutar en: Supabase Dashboard > SQL Editor
ALTER TABLE fpm_factors ADD COLUMN IF NOT EXISTS discount_pct NUMERIC DEFAULT 0;
