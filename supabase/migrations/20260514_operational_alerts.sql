-- =============================================
-- Alertas operativas + cutoff de 15 días en la diaria
-- =============================================

-- 1. Añadir cutoff de 15 días a la función diaria (evita inundar con créditos abandonados)
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
    SELECT c.id, c.assigned_gestor_id, c.status_id, c.state_changed_at, c.client_data,
           s.name AS state_name, s.sla_hours, p.zone_id
    FROM credits c
    JOIN credit_states_config s ON s.id::text = c.status_id
    LEFT JOIN profiles p ON p.id = c.assigned_gestor_id
    WHERE s.sla_hours IS NOT NULL
      AND s.is_final = false
      AND c.state_changed_at < now() - (s.sla_hours || ' hours')::interval
      AND c.state_changed_at > now() - interval '15 days'   -- cutoff: ignora abandonados
      AND (c.last_stall_alert_at IS NULL OR c.last_stall_alert_at < now() - interval '24 hours')
  LOOP
    v_cliente := COALESCE(rec.client_data->>'nombreCompleto', 'Cliente');
    v_horas := EXTRACT(EPOCH FROM (now() - rec.state_changed_at)) / 3600;

    IF rec.assigned_gestor_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, is_read, credit_id)
      VALUES (rec.assigned_gestor_id, '⏰ Crédito sin movimiento',
        format('El crédito de %s lleva %s horas en "%s". Por favor dale seguimiento.', v_cliente, v_horas, rec.state_name),
        'warning', false, rec.id);
      v_alertas := v_alertas + 1;
    END IF;

    IF rec.zone_id IS NOT NULL THEN
      FOR v_supervisor_id IN
        SELECT id FROM profiles WHERE zone_id = rec.zone_id AND role = 'SUPERVISOR_ASIGNADO' AND status = 'ACTIVE'
      LOOP
        INSERT INTO notifications (user_id, title, message, type, is_read, credit_id)
        VALUES (v_supervisor_id, '⏰ Crédito estancado en tu zona',
          format('El crédito de %s lleva %s horas en "%s".', v_cliente, v_horas, rec.state_name),
          'warning', false, rec.id);
        v_alertas := v_alertas + 1;
      END LOOP;
    END IF;

    INSERT INTO credit_history (credit_id, user_id, action, description)
    VALUES (rec.id, rec.assigned_gestor_id, 'ALERTA_ESTANCADO',
      format('Alerta automática: %s horas sin movimiento en "%s" (SLA: %sh).', v_horas, rec.state_name, rec.sla_hours));

    UPDATE credits SET last_stall_alert_at = now() WHERE id = rec.id;
  END LOOP;

  RETURN v_alertas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Alerta HORARIA para el equipo operativo (resumen agregado)
CREATE OR REPLACE FUNCTION check_operational_alerts()
RETURNS integer AS $$
DECLARE
  v_stuck integer;
  v_unanswered integer;
  v_user_id uuid;
  v_count integer := 0;
BEGIN
  -- Créditos en estados operativos estancados > 4h (dentro de 15 días)
  SELECT count(*) INTO v_stuck
  FROM credits c
  JOIN credit_states_config s ON s.id::text = c.status_id
  WHERE s.role_responsible IN ('ANALISTA','ASISTENTE_OPERATIVO','ANALISTA_ENTIDAD')
    AND s.is_final = false
    AND c.state_changed_at < now() - interval '4 hours'
    AND c.state_changed_at > now() - interval '15 days';

  -- Créditos con el último comentario hecho por alguien fuera del equipo operativo
  -- hace más de 1h (= comentario sin responder por operaciones)
  SELECT count(*) INTO v_unanswered
  FROM credits c
  JOIN credit_states_config s ON s.id::text = c.status_id
  JOIN LATERAL (
    SELECT cm.user_id, cm.created_at
    FROM comments cm WHERE cm.credit_id = c.id
    ORDER BY cm.created_at DESC LIMIT 1
  ) last_cm ON true
  JOIN profiles author ON author.id = last_cm.user_id
  WHERE s.is_final = false
    AND c.state_changed_at > now() - interval '15 days'
    AND last_cm.created_at < now() - interval '1 hour'
    AND author.role NOT IN ('ANALISTA','ASISTENTE_OPERATIVO','ANALISTA_ENTIDAD');

  IF v_stuck = 0 AND v_unanswered = 0 THEN
    RETURN 0;
  END IF;

  -- Una notificación-resumen a cada miembro del equipo operativo
  FOR v_user_id IN
    SELECT id FROM profiles
    WHERE role IN ('ANALISTA','ASISTENTE_OPERATIVO','ANALISTA_ENTIDAD') AND status = 'ACTIVE'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (v_user_id, '📋 Créditos pendientes de gestión',
      format('Hay %s crédito(s) sin mover hace +4h y %s con comentarios sin responder. Revísalos en la bandeja operativa.', v_stuck, v_unanswered),
      'warning', false);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Programar la horaria: cada hora de 12:00 a 23:00 UTC (7am-6pm Colombia), Lun-Vie
SELECT cron.schedule(
  'check-operational-alerts-hourly',
  '0 12-23 * * 1-5',
  $$ SELECT check_operational_alerts(); $$
);
