-- Create table for weekly and monthly sales reports submitted to the CEO
CREATE TABLE IF NOT EXISTS crm.sales_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
    report_period TEXT NOT NULL,
    manager_id TEXT NOT NULL,
    manager_name TEXT NOT NULL,
    manager_email TEXT NOT NULL,
    metrics JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Pending Review', 'Reviewed')),
    ceo_remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE crm.sales_reports ENABLE ROW LEVEL SECURITY;

-- CEO / Admin / Super Admin Full access
DROP POLICY IF EXISTS "CEO and Admin full access on reports" ON crm.sales_reports;
CREATE POLICY "CEO and Admin full access on reports" ON crm.sales_reports
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO', 'CEO / Founder')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO', 'CEO / Founder')
    );

-- Sales Manager read/write own reports
DROP POLICY IF EXISTS "Sales Manager own reports access" ON crm.sales_reports;
CREATE POLICY "Sales Manager own reports access" ON crm.sales_reports
    FOR ALL
    USING (
        (auth.jwt() ->> 'role' IN ('Sales Manager', 'manager')) AND manager_email = auth.jwt() ->> 'email'
    )
    WITH CHECK (
        (auth.jwt() ->> 'role' IN ('Sales Manager', 'manager')) AND manager_email = auth.jwt() ->> 'email'
    );

GRANT ALL ON crm.sales_reports TO anon, authenticated, service_role, postgres;

-- Public Schema Fallback Table
CREATE TABLE IF NOT EXISTS public.sales_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
    report_period TEXT NOT NULL,
    manager_id TEXT NOT NULL,
    manager_name TEXT NOT NULL,
    manager_email TEXT NOT NULL,
    metrics JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Pending Review', 'Reviewed')),
    ceo_remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sales_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CEO and Admin full access on public reports" ON public.sales_reports;
CREATE POLICY "CEO and Admin full access on public reports" ON public.sales_reports
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO', 'CEO / Founder')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO', 'CEO / Founder')
    );

DROP POLICY IF EXISTS "Sales Manager own public reports access" ON public.sales_reports;
CREATE POLICY "Sales Manager own public reports access" ON public.sales_reports
    FOR ALL
    USING (
        (auth.jwt() ->> 'role' IN ('Sales Manager', 'manager')) AND manager_email = auth.jwt() ->> 'email'
    )
    WITH CHECK (
        (auth.jwt() ->> 'role' IN ('Sales Manager', 'manager')) AND manager_email = auth.jwt() ->> 'email'
    );

GRANT ALL ON public.sales_reports TO anon, authenticated, service_role, postgres;
