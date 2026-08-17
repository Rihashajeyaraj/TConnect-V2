-- Migration to add leave & permission allocation columns to hrms.employees table
-- Supabase SQL Editor: https://supabase.com/dashboard/project/cljifufjjwrdgethvfvl/sql/new

ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS annual_leaves INTEGER DEFAULT 12;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS half_day_permissions INTEGER DEFAULT 6;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS short_permissions INTEGER DEFAULT 2;

-- Sync any existing users' metadata values to these columns if they were previously configured
-- (Optional cleanup helper)
UPDATE hrms.employees SET 
  annual_leaves = COALESCE(annual_leaves, 12),
  half_day_permissions = COALESCE(half_day_permissions, 6),
  short_permissions = COALESCE(short_permissions, 2);
