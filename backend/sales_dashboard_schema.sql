-- =============================================================
-- Sales Executive Dashboard – Supabase Schema
-- Run this in Supabase SQL Editor to create required tables
-- =============================================================

-- ── Todos table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.todos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    priority    TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    due_date    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS todos_updated_at ON public.todos;
CREATE TRIGGER todos_updated_at
    BEFORE UPDATE ON public.todos
    FOR EACH ROW EXECUTE FUNCTION update_todos_updated_at();

-- RLS: each user sees only their own todos
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "todos_select_own" ON public.todos;
CREATE POLICY "todos_select_own" ON public.todos
    FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "todos_insert_own" ON public.todos;
CREATE POLICY "todos_insert_own" ON public.todos
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "todos_update_own" ON public.todos;
CREATE POLICY "todos_update_own" ON public.todos
    FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "todos_delete_own" ON public.todos;
CREATE POLICY "todos_delete_own" ON public.todos
    FOR DELETE USING (auth.uid()::text = user_id);

-- Service role bypass (backend service key can do anything)
DROP POLICY IF EXISTS "todos_service_role" ON public.todos;
CREATE POLICY "todos_service_role" ON public.todos
    USING (true) WITH CHECK (true);

-- Grant access to anon / service_role
GRANT ALL ON public.todos TO anon, authenticated, service_role;


-- ── Seed sample todos (dev only) ──────────────────────────────
INSERT INTO public.todos (user_id, title, priority, is_completed)
VALUES
    ('dev-admin-id', 'Submit Expense Report',          'High',   FALSE),
    ('dev-admin-id', 'Call XYZ Builders',              'Medium', FALSE),
    ('dev-admin-id', 'Visit ABC Hospital',             'Medium', TRUE),
    ('dev-admin-id', 'Upload Customer Documents',      'Medium', FALSE),
    ('dev-admin-id', 'Send Quotation to DEF Industries','High',  FALSE)
ON CONFLICT DO NOTHING;


-- ── Leaderboard view (over opportunities + hrms) ──────────────
-- Adjust column names to match your actual schema
CREATE OR REPLACE VIEW public.leaderboard_this_month AS
SELECT
    COALESCE(e.full_name, o.assigned_to) AS name,
    SUM(COALESCE(o.value, 0))            AS revenue,
    COUNT(o.id)                          AS deals_closed
FROM public.opportunities o
LEFT JOIN hrms.employees e ON e.id::text = o.assigned_to
WHERE
    o.stage IN ('CLOSED_WON', 'closed_won')
    AND DATE_TRUNC('month', o.updated_at) = DATE_TRUNC('month', NOW())
GROUP BY COALESCE(e.full_name, o.assigned_to)
ORDER BY revenue DESC
LIMIT 10;

GRANT SELECT ON public.leaderboard_this_month TO anon, authenticated, service_role;
