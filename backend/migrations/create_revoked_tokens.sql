-- =============================================================================
-- Migration: Create revoked_tokens Table
-- Description: Stores revoked JWT unique IDs (JTI) for logout & session invalidation
-- Schema: public
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.revoked_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jti         VARCHAR(255) UNIQUE NOT NULL,
    user_id     TEXT NOT NULL,
    revoked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti ON public.revoked_tokens (jti);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user_id ON public.revoked_tokens (user_id);
