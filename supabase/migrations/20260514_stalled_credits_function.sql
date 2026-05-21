-- =============================================
-- Función que detecta créditos estancados y genera alertas
-- (la inserción en notifications dispara el push automáticamente
--  vía el trigger push-notification-on-insert existente)
-- =============================================

CREATE OR REPLACE FUNCTION check_stalled_credits()
RETURNS integer AS $$
DECLARE
  rec RECORD;
  v_supervisor_id uuid;
  v_cliente text;
  v_horas integer;
  v_alertas integer := 0;
BEGIN
  FOR rec IN
    SELECT
      c.id,
      c.assigned_gestor_id,
      c.status_id,
      c.state_changed_at,
      c.client_data,
      s.name AS state_name,
      s.sla_hours,
      p.zone_id
    FROM credits c
    JOIN credit_states_config s ON s.id::text = c.status_id
    LEFT JOIN profiles p ON p.id = c.assigned_gestor_id
    WHERE s.sla_hours IS NOT NULL
      AND s.is_final = false
      AND c.state_changed_at < now() - (s.sla_hours || ' hours')::interval
      -- Alertar si nunca se alertó, o si la última alerta fue hace más de 24h (recordatorio diario)
      AND (c.last_stall_alert_at IS NULL OR c.last_stall_alert_at < now() - interval '24 hours')
  LOOP
    v_cliente := COALESCE(rec.client_data->>'nombreCompleto', 'Cliente');
    v_horas := EXTRACT(EPOCH FROM (now() - rec.state_changed_at)) / 3600;

    -- 1. Notificar al gestor responsable
    IF rec.assigned_gestor_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, is_read, credit_id)
      VALUES (
        rec.assigned_gestor_id,
        '⏰ Crédito sin movimiento',
        format('El crédito de %s lleva %s horas en "%s". Por favor dale seguimiento.', v_cliente, v_horas, rec.state_name),
        'warning', false, rec.id
      );
      v_alertas := v_alertas + 1;
    END IF;

    -- 2. Notificar al supervisor de la zona del gestor
    IF rec.zone_id IS NOT NULL THEN
      FOR v_supervisor_id IN
        SELECT id FROM profiles
        WHERE zone_id = rec.zone_id AND role = 'SUPERVISOR_ASIGNADO' AND status = 'ACTIVE'
      LOOP
        INSERT INTO notifications (user_id, title, message, type, is_read, credit_id)
        VALUES (
          v_supervisor_id,
          '⏰ Crédito estancado en tu zona',
          format('El crédito de %s (gestor en tu zona) lleva %s horas en "%s".', v_cliente, v_horas, rec.state_name),
          'warning', false, rec.id
        );
        v_alertas := v_alertas + 1;
      END LOOP;
    END IF;

    -- 3. Registrar evento en credit_history (para trazabilidad + futura automatización)
    INSERT INTO credit_history (credit_id, user_id, action, description)
    VALUES (
      rec.id, rec.assigned_gestor_id, 'ALERTA_ESTANCADO',
      format('Alerta automática: %s horas sin movimiento en "%s" (SLA: %sh).', v_horas, rec.state_name, rec.sla_hours)
    );

    -- 4. Marcar última alerta
    UPDATE credits SET last_stall_alert_at = now() WHERE id = rec.id;
  END LOOP;

  RETURN v_alertas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Programar ejecución diaria a las 13:00 UTC (8:00 AM Colombia)
SELECT cron.schedule(
  'check-stalled-credits-daily',
  '0 13 * * *',
  $$ SELECT check_stalled_credits(); $$
);
