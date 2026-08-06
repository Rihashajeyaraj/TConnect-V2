-- ============================================================================
-- Supabase Row Level Security (RLS) Isolation Script for Sales Executives
-- Enforces strictly isolated data access per logged-in employee/user ID/email
-- ============================================================================

-- 1. LEADS TABLE
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sales Executive leads isolation policy" ON public.leads;
CREATE POLICY "Sales Executive leads isolation policy" ON public.leads
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR assigned_to = auth.jwt() ->> 'email'
    OR assigned_to_email = auth.jwt() ->> 'email'
    OR employee_id = auth.jwt() ->> 'sub'
    OR user_id = auth.jwt() ->> 'sub'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR assigned_to = auth.jwt() ->> 'email'
    OR assigned_to_email = auth.jwt() ->> 'email'
    OR employee_id = auth.jwt() ->> 'sub'
    OR user_id = auth.jwt() ->> 'sub'
  );

-- 2. CUSTOMERS TABLE
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sales Executive customers isolation policy" ON public.customers;
CREATE POLICY "Sales Executive customers isolation policy" ON public.customers
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR account_manager = auth.jwt() ->> 'email'
    OR assigned_to = auth.jwt() ->> 'email'
    OR employee_id = auth.jwt() ->> 'sub'
    OR user_id = auth.jwt() ->> 'sub'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR account_manager = auth.jwt() ->> 'email'
    OR assigned_to = auth.jwt() ->> 'email'
    OR employee_id = auth.jwt() ->> 'sub'
    OR user_id = auth.jwt() ->> 'sub'
  );

-- 3. VISITS TABLE
ALTER TABLE IF EXISTS public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sales Executive visits isolation policy" ON public.visits;
CREATE POLICY "Sales Executive visits isolation policy" ON public.visits
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR visitor_id = auth.jwt() ->> 'sub'
    OR employee_id = auth.jwt() ->> 'sub'
    OR assigned_to = auth.jwt() ->> 'email'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR visitor_id = auth.jwt() ->> 'sub'
    OR employee_id = auth.jwt() ->> 'sub'
    OR assigned_to = auth.jwt() ->> 'email'
  );

-- 4. ATTENDANCE LOGS TABLE
ALTER TABLE IF EXISTS public.attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sales Executive attendance isolation policy" ON public.attendance_logs;
CREATE POLICY "Sales Executive attendance isolation policy" ON public.attendance_logs
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR user_id = auth.jwt() ->> 'sub'
    OR employee_id = auth.jwt() ->> 'sub'
    OR email = auth.jwt() ->> 'email'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR user_id = auth.jwt() ->> 'sub'
    OR employee_id = auth.jwt() ->> 'sub'
    OR email = auth.jwt() ->> 'email'
  );

-- 5. EXPENSES TABLE
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sales Executive expenses isolation policy" ON public.expenses;
CREATE POLICY "Sales Executive expenses isolation policy" ON public.expenses
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR executive_email = auth.jwt() ->> 'email'
    OR employee_id = auth.jwt() ->> 'sub'
    OR user_id = auth.jwt() ->> 'sub'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR executive_email = auth.jwt() ->> 'email'
    OR employee_id = auth.jwt() ->> 'sub'
    OR user_id = auth.jwt() ->> 'sub'
  );

-- 6. OPPORTUNITIES TABLE
ALTER TABLE IF EXISTS public.opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sales Executive opportunities isolation policy" ON public.opportunities;
CREATE POLICY "Sales Executive opportunities isolation policy" ON public.opportunities
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR owner_id = auth.jwt() ->> 'sub'
    OR assigned_to = auth.jwt() ->> 'email'
    OR employee_id = auth.jwt() ->> 'sub'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR owner_id = auth.jwt() ->> 'sub'
    OR assigned_to = auth.jwt() ->> 'email'
    OR employee_id = auth.jwt() ->> 'sub'
  );

-- 7. TODOS TABLE
ALTER TABLE IF EXISTS public.todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sales Executive todos isolation policy" ON public.todos;
CREATE POLICY "Sales Executive todos isolation policy" ON public.todos
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR user_id = auth.jwt() ->> 'sub'
    OR employee_id = auth.jwt() ->> 'sub'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR user_id = auth.jwt() ->> 'sub'
    OR employee_id = auth.jwt() ->> 'sub'
  );

-- 8. NOTIFICATIONS TABLE
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sales Executive notifications isolation policy" ON public.notifications;
CREATE POLICY "Sales Executive notifications isolation policy" ON public.notifications
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR user_id = auth.jwt() ->> 'sub'
    OR recipient_email = auth.jwt() ->> 'email'
    OR recipient_role = 'sales'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'Sales Manager', 'Manager', 'CEO')
    OR user_id = auth.jwt() ->> 'sub'
    OR recipient_email = auth.jwt() ->> 'email'
    OR recipient_role = 'sales'
  );
