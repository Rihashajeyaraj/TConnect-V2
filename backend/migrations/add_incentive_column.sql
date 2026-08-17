-- Migration to add incentive percentage to hrms.employees table
-- Supabase SQL Editor: https://supabase.com/dashboard/project/cljifufjjwrdgethvfvl/sql/new

ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS incentive_percentage NUMERIC DEFAULT 5.0;

-- Sync existing users to have 5% default if they are null
UPDATE hrms.employees SET incentive_percentage = COALESCE(incentive_percentage, 5.0);
