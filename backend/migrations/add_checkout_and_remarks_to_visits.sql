-- Migration: Add check-out location coordinates, address, and remarks columns to field_management.visits
ALTER TABLE field_management.visits ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE field_management.visits ADD COLUMN IF NOT EXISTS check_out_latitude NUMERIC;
ALTER TABLE field_management.visits ADD COLUMN IF NOT EXISTS check_out_longitude NUMERIC;
ALTER TABLE field_management.visits ADD COLUMN IF NOT EXISTS check_out_address TEXT;
