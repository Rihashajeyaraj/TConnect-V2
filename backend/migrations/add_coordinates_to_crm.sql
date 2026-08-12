-- ============================================================
-- STEP 2 MIGRATION: Add latitude/longitude to CRM tables
-- Apply via Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Add to crm.leads
ALTER TABLE crm.leads
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- 2. Add to crm.customers
ALTER TABLE crm.customers
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- 3. Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'crm'
  AND table_name IN ('leads', 'customers')
  AND column_name IN ('latitude', 'longitude')
ORDER BY table_name, column_name;
