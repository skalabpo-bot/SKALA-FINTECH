-- =============================================
-- Academia: simuladores online por entidad (link de Google Sheets, multi-versión)
-- + permisos VIEW_ACADEMIA / MANAGE_ACADEMIA
-- =============================================

-- Simuladores por entidad. VARIOS por entidad (versiones / tasa especial).
CREATE TABLE IF NOT EXISTS entity_simulators (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_name text NOT NULL,
  label text NOT NULL DEFAULT 'Vigente',     -- ej. 'Vigente', 'Tasa especial junio'
  google_sheet_id text NOT NULL,             -- ID del Google Sheet (extraído del link)
  sheet_tab text,                            -- hoja principal a mostrar (ej. 'SimuladorV11')
  download_url text,                         -- opcional: .xlsx en storage para descargar
  is_active boolean DEFAULT true,
  order_index int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_simulators_entity ON entity_simulators (entity_name, is_active, order_index);

ALTER TABLE entity_simulators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entity_simulators_select" ON entity_simulators;
CREATE POLICY "entity_simulators_select" ON entity_simulators FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "entity_simulators_admin" ON entity_simulators;
CREATE POLICY "entity_simulators_admin" ON entity_simulators FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permisos: todos ven Academia; solo admin la gestiona.
-- (Los permisos efectivos se cargan en login desde roles.default_permissions.)
UPDATE roles
SET default_permissions = (
  SELECT to_jsonb(array(SELECT DISTINCT jsonb_array_elements_text(default_permissions) UNION SELECT 'VIEW_ACADEMIA'))
)
WHERE default_permissions IS NOT NULL;

UPDATE roles
SET default_permissions = (
  SELECT to_jsonb(array(SELECT DISTINCT jsonb_array_elements_text(default_permissions) UNION SELECT 'MANAGE_ACADEMIA'))
)
WHERE name = 'ADMIN';
