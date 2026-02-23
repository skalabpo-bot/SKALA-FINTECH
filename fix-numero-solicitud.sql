-- ===================================================================
-- ADD: Número de Solicitud para Créditos
-- ===================================================================
-- Agregar un número de solicitud único y secuencial para cada crédito
-- ===================================================================

-- PASO 1: Agregar columna para número de solicitud
ALTER TABLE public.credits
ADD COLUMN IF NOT EXISTS solicitud_number SERIAL;

-- PASO 2: Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_credits_solicitud_number ON public.credits(solicitud_number);

-- PASO 3: Asignar números de solicitud a créditos existentes (si no tienen)
-- Esto usa el orden de creación para asignar números secuenciales
DO $$
DECLARE
    r RECORD;
    counter INTEGER := 1;
BEGIN
    FOR r IN (SELECT id FROM public.credits WHERE solicitud_number IS NULL ORDER BY created_at ASC) LOOP
        UPDATE public.credits SET solicitud_number = counter WHERE id = r.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- PASO 4: Hacer la columna NOT NULL (ahora que todos tienen valor)
ALTER TABLE public.credits
ALTER COLUMN solicitud_number SET NOT NULL;

-- ===================================================================
-- VERIFICACIÓN
-- ===================================================================
-- Ver créditos con sus números de solicitud
SELECT
    solicitud_number,
    id,
    client_data->>'nombreCompleto' as cliente,
    client_data->>'numeroDocumento' as cedula,
    created_at
FROM public.credits
ORDER BY solicitud_number DESC
LIMIT 20;

-- Ver la estructura actualizada de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'credits' AND column_name = 'solicitud_number';
