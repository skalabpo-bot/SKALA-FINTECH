-- ============================================================
-- MIGRACIÓN: Permitir que todos los usuarios autenticados
-- puedan subir y leer archivos en el bucket 'skala-bucket'
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Permitir uploads a usuarios autenticados
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'skala-bucket');

-- 2. Permitir lectura/descarga a usuarios autenticados
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'skala-bucket');

-- 3. Permitir actualizar archivos propios
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'skala-bucket');
