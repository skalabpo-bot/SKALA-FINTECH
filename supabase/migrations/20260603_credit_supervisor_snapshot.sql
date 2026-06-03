-- Snapshot del supervisor al momento de radicar el crédito.
-- Si cambia el supervisor de una zona (o se reasigna un gestor), las operaciones
-- en curso quedan con su supervisor original. Solo los créditos NUEVOS se
-- asignan al supervisor vigente.

ALTER TABLE credits
    ADD COLUMN IF NOT EXISTS assigned_supervisor_id uuid REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_credits_supervisor
    ON credits(assigned_supervisor_id);

-- Backfill: para créditos ya radicados, asigna el supervisor actual de la zona
-- del gestor. (Si la asignación cambia después de aplicar esta migración,
-- el snapshot ya queda fijado y no se mueve.)
UPDATE credits c
SET assigned_supervisor_id = sup.id
FROM profiles g
JOIN profiles sup
    ON sup.zone_id = g.zone_id
   AND sup.role = 'SUPERVISOR_ASIGNADO'
WHERE c.assigned_gestor_id = g.id
  AND c.assigned_supervisor_id IS NULL;
