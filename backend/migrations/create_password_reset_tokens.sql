-- =============================================================================
-- Migration: Create password_reset_tokens Table
-- Description: Stores secure SHA-256 hashed password reset tokens with time-limited expiry
-- Schema: public (compatible with hrms.employees & public.user_record)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL,
    employee_code VARCHAR(50),
    email       VARCHAR(255) NOT NULL,
    token_hash  VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    is_used     BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address  VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON public.password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_reset_token_user_id ON public.password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_reset_token_email ON public.password_reset_tokens (email);
