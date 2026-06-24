-- Backfill client_data.fechaDesembolso para créditos ya desembolsados.
-- Esto permite que los reportes históricos filtren por fecha real de desembolso
-- (no de radicación), concordando con la venta real.
--
-- Estrategia:
--   1) Si hay un evento en credit_history que mencione DESEMBOLSADO, usar esa fecha.
--   2) Si no hay history (créditos antiguos sin trazabilidad), usar credits.updated_at
--      como aproximación. Para créditos donde markCommissionPaid haya tocado updated_at
--      posteriormente la fecha puede correrse unos días — aceptable para datos históricos.
--
-- Idempotente: solo escribe en filas donde client_data.fechaDesembolso aún no exista.

-- Paso 1: backfill desde credit_history
UPDATE credits c
SET client_data = jsonb_set(
    COALESCE(c.client_data, '{}'::jsonb),
    '{fechaDesembolso}',
    to_jsonb(h.changed_at::text)
)
FROM (
    SELECT
        ch.credit_id,
        MAX(ch.created_at) AS changed_at
    FROM credit_history ch
    WHERE ch.description ILIKE '%DESEMBOLSADO%' OR ch.action ILIKE '%DESEMBOLSADO%'
    GROUP BY ch.credit_id
) h
WHERE c.id = h.credit_id
  AND c.status_id::text IN (SELECT id::text FROM credit_states_config WHERE name ILIKE '%DESEMBOLSADO%')
  AND (c.client_data->>'fechaDesembolso') IS NULL;

-- Paso 2: fallback a updated_at para los que no tengan history
UPDATE credits c
SET client_data = jsonb_set(
    COALESCE(c.client_data, '{}'::jsonb),
    '{fechaDesembolso}',
    to_jsonb(c.updated_at::text)
)
WHERE c.status_id IN (SELECT id FROM credit_states_config WHERE name ILIKE '%DESEMBOLSADO%')
  AND (c.client_data->>'fechaDesembolso') IS NULL;
