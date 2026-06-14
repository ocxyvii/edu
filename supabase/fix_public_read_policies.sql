-- ============================================================
-- Fix: Public read policies for registration form
-- Run this in Supabase SQL editor (safe to re-run)
-- ============================================================

-- Classes: allow anon SELECT
DROP POLICY IF EXISTS "public_read_classes" ON classes;
CREATE POLICY "public_read_classes" ON classes
  FOR SELECT TO anon, authenticated
  USING (true);

-- Academic years: allow anon SELECT
DROP POLICY IF EXISTS "public_read_academic_years" ON academic_years;
CREATE POLICY "public_read_academic_years" ON academic_years
  FOR SELECT TO anon, authenticated
  USING (true);

-- Schools: allow anon SELECT for active schools
DROP POLICY IF EXISTS "public_read_active_schools" ON schools;
CREATE POLICY "public_read_active_schools" ON schools
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
