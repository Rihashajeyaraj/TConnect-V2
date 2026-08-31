-- Add new columns to system.reports_eod for Weekly/Monthly sales reports support
ALTER TABLE system.reports_eod ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'eod';
ALTER TABLE system.reports_eod ADD COLUMN IF NOT EXISTS report_period TEXT;
ALTER TABLE system.reports_eod ADD COLUMN IF NOT EXISTS metrics JSONB;
ALTER TABLE system.reports_eod ADD COLUMN IF NOT EXISTS ceo_remarks TEXT DEFAULT '';
ALTER TABLE system.reports_eod ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft';
ALTER TABLE system.reports_eod ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE system.reports_eod ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
