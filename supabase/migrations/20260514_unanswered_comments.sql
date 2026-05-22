-- =============================================
-- Alerta de comentarios del chat operativo sin responder (ambas direcciones)
--   * Último comentario del EQUIPO → debe responder el GESTOR (per-crédito)
--   * Último comentario del GESTOR/CLIENTE → debe responder el EQUIPO (resumen)
-- =============================================

ALTER TABLE credits
  ADD COLUMN IF NOT EXISTS last_comment_alert_at timestamptz DEFAULT NULL;

CREATE OR REPLACE FUNCTION check_unanswered_comments()
RETURNS integer AS $$
DECLARE
  rec RECORD;
  v_role text;
  v_team_count integer;
  v_user_id uuid;
  v_cliente text;
  v_horas integer;
  v_count integer := 0;
  v_op_roles text[] := ARRAY['ANALISTA','ASISTENTE_OPERATIVO','ANALISTA_ENTIDAD'];
BEGIN
  -- GESTOR: último comentario del equipo, el gestor no ha respondido (per-crédito)
  FOR rec IN
    SELECT c.id, c.assigned_gestor_id, c.client_data, last_cm.created_at AS last_at, last_cm.user_id AS last_author_id
    FROM credits c
    JOIN credit_states_config s ON s.id::text = c.status_id
    JOIN LATERAL (SELECT cm.user_id, cm.created_at FROM comments cm WHERE cm.credit_id=c.id AND COALESCE(cm.is_system,false)=false ORDER BY cm.created_at DESC LIMIT 1) last_cm ON true
    JOIN profiles author ON author.id = last_cm.user_id
    WHERE s.is_final = false
      AND c.state_changed_at > now() - interval '15 days'
      AND last_cm.created_at < now() - interval '2 hours'
      AND author.role = ANY(v_op_roles)
      AND c.assigned_gestor_id IS NOT NULL
      AND c.assigned_gestor_id <> last_cm.user_id
      AND (c.last_comment_alert_at IS NULL OR c.last_comment_alert_at < last_cm.created_at OR c.last_comment_alert_at < now() - interval '6 hours')
  LOOP
    v_cliente := COALESCE(rec.client_data->>'nombreCompleto','Cliente');
    v_horas := EXTRACT(EPOCH FROM (now()-rec.last_at))/3600;
    INSERT INTO notifications (user_id, title, message, type, is_read, credit_id)
    VALUES (rec.assigned_gestor_id, '💬 Comentario sin responder',
      format('El equipo dejó un comentario en el crédito de %s hace %s horas y no lo has respondido.', v_cliente, v_horas),
      'warning', false, rec.id);
    UPDATE credits SET last_comment_alert_at = now() WHERE id = rec.id;
    v_count := v_count + 1;
  END LOOP;

  -- EQUIPO: último comentario del gestor/cliente sin responder (resumen agregado por rol)
  FOREACH v_role IN ARRAY v_op_roles LOOP
    SELECT count(*) INTO v_team_count
    FROM credits c
    JOIN credit_states_config s ON s.id::text = c.status_id
    JOIN LATERAL (SELECT cm.user_id, cm.created_at FROM comments cm WHERE cm.credit_id=c.id AND COALESCE(cm.is_system,false)=false ORDER BY cm.created_at DESC LIMIT 1) last_cm ON true
    JOIN profiles author ON author.id = last_cm.user_id
    WHERE s.is_final = false AND s.role_responsible = v_role
      AND c.state_changed_at > now() - interval '15 days'
      AND last_cm.created_at < now() - interval '2 hours'
      AND last_cm.created_at > COALESCE(c.last_comment_alert_at, to_timestamp(0))  -- solo comentarios desde el baseline
      AND author.role <> v_role;

    IF v_team_count = 0 THEN CONTINUE; END IF;
    FOR v_user_id IN SELECT id FROM profiles WHERE role = v_role AND status='ACTIVE' LOOP
      INSERT INTO notifications (user_id, title, message, type, is_read)
      VALUES (v_user_id, '💬 Comentarios sin responder',
        format('Tienes %s comentario(s) sin responder. Revísalos en la bandeja.', v_team_count),
        'warning', false);
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resumen operativo: solo "sin mover" (los comentarios los maneja la función dedicada)
CREATE OR REPLACE FUNCTION check_operational_alerts()
RETURNS integer AS $$
DECLARE
  v_role text;
  v_stuck integer;
  v_user_id uuid;
  v_count integer := 0;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['ANALISTA','ASISTENTE_OPERATIVO','ANALISTA_ENTIDAD']
  LOOP
    SELECT count(*) INTO v_stuck
    FROM credits c
    JOIN credit_states_config s ON s.id::text = c.status_id
    WHERE s.role_responsible = v_role AND s.is_final = false AND s.sla_hours IS NOT NULL
      AND c.state_changed_at < now() - interval '4 hours'
      AND c.state_changed_at > now() - interval '15 days';
    IF v_stuck = 0 THEN CONTINUE; END IF;
    FOR v_user_id IN SELECT id FROM profiles WHERE role = v_role AND status = 'ACTIVE' LOOP
      INSERT INTO notifications (user_id, title, message, type, is_read)
      VALUES (v_user_id, '📋 Créditos pendientes de gestión',
        format('Tienes %s crédito(s) sin mover hace +4h. Revísalos en la bandeja.', v_stuck), 'warning', false);
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Programar revisión de comentarios cada hora (7am-6pm Colombia, L-V)
SELECT cron.schedule('check-unanswered-comments-hourly', '0 12-23 * * 1-5', $$ SELECT check_unanswered_comments(); $$);
