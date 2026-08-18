-- ============================================================
-- TwiteConnect Auto-Save Drafts Table & RLS Setup
-- ============================================================

CREATE SCHEMA IF NOT EXISTS system;

CREATE TABLE IF NOT EXISTS system.auto_save_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    form_key TEXT NOT NULL,
    record_id TEXT NOT NULL DEFAULT 'new',
    draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, form_key, record_id)
);

-- Enable Row Level Security
ALTER TABLE system.auto_save_drafts ENABLE ROW LEVEL SECURITY;

-- Select policy: users can read their own drafts
CREATE POLICY select_own_drafts ON system.auto_save_drafts
    FOR SELECT
    TO authenticated
    USING (user_id = auth.jwt()->>'email' OR user_id = auth.uid()::text);

-- Insert policy: users can insert their own drafts
CREATE POLICY insert_own_drafts ON system.auto_save_drafts
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.jwt()->>'email' OR user_id = auth.uid()::text);

-- Update policy: users can update their own drafts
CREATE POLICY update_own_drafts ON system.auto_save_drafts
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.jwt()->>'email' OR user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.jwt()->>'email' OR user_id = auth.uid()::text);

-- Delete policy: users can delete their own drafts
CREATE POLICY delete_own_drafts ON system.auto_save_drafts
    FOR DELETE
    TO authenticated
    USING (user_id = auth.jwt()->>'email' OR user_id = auth.uid()::text);

-- Grant privileges to client roles
GRANT ALL PRIVILEGES ON TABLE system.auto_save_drafts TO anon, authenticated, service_role, postgres;
