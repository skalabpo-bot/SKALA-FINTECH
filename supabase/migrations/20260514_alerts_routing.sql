-- =============================================
-- Rutear alertas al ROL RESPONSABLE de cada estado
-- =============================================

-- DIARIA: solo estados NO operativos (gestor y otros). Los operativos
-- (ANALISTA, ASISTENTE_OPERATIVO, ANALISTA_ENTIDAD) los maneja la horaria.
CREATE OR REPLACE FUNCTION check_stalled_credits()
RETURNS integer AS $$
DECLARE
  rec RECORD;
  v_supervisor_id uuid;
  v_target_id uuid;
  v_cliente text;
  v_horas integer;
  v_alertas integer := 0;
BEGIN
  FOR rec IN
    SELECT c.id, c.assigned_gestor_id, c.status_id, c.state_changed_at, c.client_data,
           s.name AS state_name, s.sla_hours, s.role_responsible, p.zone_id
    FROM credits c
    JOIN credit_states_config s ON s.id::text = c.status_id
    LEFT JOIN profiles p ON p.id = c.assigned_gestor_id
    WHERE s.sla_hours IS NOT NULL
      AND s.is_final = false
      AND s.role_responsible NOT IN ('ANALISTA','ASISTENTE_OPERATIVO','ANALISTA_ENTIDAD')
      AND c.state_changed_at < now() - (s.sla_hours || ' hours')::interval
      AND c.state_changed_at > now() - interval '15 days'
      AND (c.last_stall_alert_at IS NULL OR c.last_stall_alert_at < now() - interval '24 hours')
  LOOP
    v_cliente := COALESCE(rec.client_data->>'nombreCompleto', 'Cliente');
    v_horas := EXTRACT(EPOCH FROM (now() - rec.state_changed_at)) / 3600;

    IF rec.role_responsible = 'GESTOR' THEN
      -- Gestor responsable → gestor + su supervisor
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
    ELSE
      -- Otros roles no operativos (TESORERIA, etc.) → todos los activos de ese rol
      FOR v_target_id IN
        SELECT id FROM profiles WHERE role = rec.role_responsible AND status = 'ACTIVE'
      LOOP
        INSERT INTO notifications (user_id, title, message, type, is_read, credit_id)
        VALUES (v_target_id, '⏰ Crédito sin movimiento',
          format('El crédito de %s lleva %s horas en "%s" (tu responsabilidad).', v_cliente, v_horas, rec.state_name),
          'warning', false, rec.id);
        v_alertas := v_alertas + 1;
      END LOOP;
    END IF;

    INSERT INTO credit_history (credit_id, user_id, action, description)
    VALUES (rec.id, rec.assigned_gestor_id, 'ALERTA_ESTANCADO',
      format('Alerta automática: %s horas sin movimiento en "%s" (SLA: %sh, responsable: %s).', v_horas, rec.state_name, rec.sla_hours, rec.role_responsible));

    UPDATE credits SET last_stall_alert_at = now() WHERE id = rec.id;
  END LOOP;

  RETURN v_alertas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- HORARIA: resumen al equipo operativo, separado por rol responsable
-- (analista ve lo suyo, asistente lo suyo) — sigue siendo agregado para no spamear.
CREATE OR REPLACE FUNCTION check_operational_alerts()
RETURNS integer AS $$
DECLARE
  v_role text;
  v_stuck integer;
  v_unanswered integer;
  v_user_id uuid;
  v_count integer := 0;
BEGIN
  -- Para cada rol operativo, contar sus pendientes y avisarle solo a ese rol
  FOREACH v_role IN ARRAY ARRAY['ANALISTA','ASISTENTE_OPERATIVO','ANALISTA_ENTIDAD']
  LOOP
    -- Créditos en estados de ESE rol, estancados > 4h
    SELECT count(*) INTO v_stuck
    FROM credits c
    JOIN credit_states_config s ON s.id::text = c.status_id
    WHERE s.role_responsible = v_role
      AND s.is_final = false
      AND s.sla_hours IS NOT NULL
      AND c.state_changed_at < now() - interval '4 hours'
      AND c.state_changed_at > now() - interval '15 days';

    -- Comentarios sin responder en créditos de estados de ESE rol
    SELECT count(*) INTO v_unanswered
    FROM credits c
    JOIN credit_states_config s ON s.id::text = c.status_id
    JOIN LATERAL (
      SELECT cm.user_id, cm.created_at FROM comments cm
      WHERE cm.credit_id = c.id ORDER BY cm.created_at DESC LIMIT 1
    ) last_cm ON true
    JOIN profiles author ON author.id = last_cm.user_id
    WHERE s.role_responsible = v_role
      AND s.is_final = false
      AND c.state_changed_at > now() - interval '15 days'
      AND last_cm.created_at < now() - interval '1 hour'
      AND author.role <> v_role;

    IF v_stuck = 0 AND v_unanswered = 0 THEN
      CONTINUE;
    END IF;

    -- Notificar solo a los usuarios de ESE rol
    FOR v_user_id IN
      SELECT id FROM profiles WHERE role = v_role AND status = 'ACTIVE'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, is_read)
      VALUES (v_user_id, '📋 Créditos pendientes de gestión',
        format('Tienes %s crédito(s) sin mover hace +4h y %s con comentarios sin responder. Revísalos en la bandeja.', v_stuck, v_unanswered),
        'warning', false);
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
