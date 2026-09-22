-- ============================================================
-- TwiteConnect Live Chat & Messaging Schema
-- Creates user_messages table for real-time messaging between
-- Sales Executives, Team Leads, Managers, and Operations.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    recipient_email TEXT,
    recipient_name TEXT,
    contact_type TEXT DEFAULT 'direct', -- 'mgr', 'tl', 'team', 'hr', 'direct'
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast recipient/sender conversation lookups
CREATE INDEX IF NOT EXISTS idx_user_messages_sender ON public.user_messages(sender_email);
CREATE INDEX IF NOT EXISTS idx_user_messages_recipient ON public.user_messages(recipient_email);
CREATE INDEX IF NOT EXISTS idx_user_messages_contact_type ON public.user_messages(contact_type);

-- Grant privileges
GRANT ALL PRIVILEGES ON TABLE public.user_messages TO anon, authenticated, service_role, postgres;
