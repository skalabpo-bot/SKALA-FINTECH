-- =============================================
-- Sistema de alertas de créditos estancados (SLA por estado)
-- =============================================

-- 1. SLA (horas) por estado. NULL = no se vigila (ej: estados finales).
ALTER TABLE credit_states_config
  ADD COLUMN IF NOT EXISTS sla_hours integer DEFAULT NULL;

-- 2. Timestamp de cuándo el crédito entró a su estado actual + última alerta enviada
ALTER TABLE credits
  ADD COLUMN IF NOT EXISTS state_changed_at timestamptz DEFAULT now();
ALTER TABLE credits
  ADD COLUMN IF NOT EXISTS last_stall_alert_at timestamptz DEFAULT NULL;

-- Backfill: usar updated_at como aproximación del último cambio de estado
UPDATE credits SET state_changed_at = COALESCE(updated_at, created_at, now())
WHERE state_changed_at IS NULL;

-- 3. Trigger: cada vez que cambia status_id, actualizar state_changed_at y
--    resetear la marca de alerta (el crédito empieza fresco en el nuevo estado)
CREATE OR REPLACE FUNCTION trg_credit_state_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
    NEW.state_changed_at = now();
    NEW.last_stall_alert_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS credit_state_changed ON credits;
CREATE TRIGGER credit_state_changed
  BEFORE UPDATE ON credits
  FOR EACH ROW
  EXECUTE FUNCTION trg_credit_state_changed();

-- 4. Valores iniciales de SLA para estados operativos (en horas).
--    Ajustables desde Admin → Flujo de Crédito.
UPDATE credit_states_config SET sla_hours = 48  WHERE name ILIKE '%DEVUELTO%';
UPDATE credit_states_config SET sla_hours = 24  WHERE name ILIKE '%EN ESTUDIO%';
UPDATE credit_states_config SET sla_hours = 24  WHERE name ILIKE '%PREANALISIS%' OR name ILIKE '%PRE ANALISIS%';
UPDATE credit_states_config SET sla_hours = 48  WHERE name ILIKE '%APLAZADO%';
UPDATE credit_states_config SET sla_hours = 72  WHERE name ILIKE '%PROCESO PAGADURIA%';
UPDATE credit_states_config SET sla_hours = 48  WHERE name ILIKE '%PTE FIRMA%' OR name ILIKE '%PENDIENTE FIRMA%';
UPDATE credit_states_config SET sla_hours = 24  WHERE name ILIKE '%RADICADO%' OR name ILIKE '%VALIDACI%';
UPDATE credit_states_config SET sla_hours = 24  WHERE name ILIKE '%SUBSANADO%';
UPDATE credit_states_config SET sla_hours = 48  WHERE name ILIKE '%PREAPROBADO%' OR name ILIKE '%APROBADO PEND%';

-- Estados finales NO se vigilan (sla_hours queda NULL)
UPDATE credit_states_config SET sla_hours = NULL WHERE is_final = true
  OR name ILIKE '%DESEMBOLSADO%' OR name ILIKE '%NEGADO%' OR name ILIKE '%DESISTIDO%';
