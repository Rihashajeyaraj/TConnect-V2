-- Migration: Add visit_date and visit_time columns to field_management.visits and public.visits (if exists)
ALTER TABLE IF EXISTS field_management.visits ADD COLUMN IF NOT EXISTS visit_date TEXT;
ALTER TABLE IF EXISTS field_management.visits ADD COLUMN IF NOT EXISTS visit_time TEXT;

ALTER TABLE IF EXISTS public.visits ADD COLUMN IF NOT EXISTS visit_date TEXT;
ALTER TABLE IF EXISTS public.visits ADD COLUMN IF NOT EXISTS visit_time TEXT;
