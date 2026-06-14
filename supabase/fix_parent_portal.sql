-- ============================================================
-- FIX: Parent Portal - RLS Policies & Data Repair
-- Run this in Supabase SQL editor (safe to re-run)
-- ============================================================

-- ── FIX 1: Repair missing parent_student links ──
-- Links parents to their children by matching school + profiles
INSERT INTO parent_student (parent_id, student_id, school_id, is_primary, relationship)
SELECT DISTINCT
  p_parent.id as parent_id,
  s.id as student_id,
  s.school_id,
  true as is_primary,
  'parent' as relationship
FROM students s
JOIN profiles p_student ON p_student.id = s.id
JOIN profiles p_parent ON 
  p_parent.school_id = s.school_id AND 
  p_parent.role = 'parent'
WHERE NOT EXISTS (
  SELECT 1 FROM parent_student ps 
  WHERE ps.student_id = s.id 
  AND ps.parent_id = p_parent.id
)
AND s.is_active = true
ON CONFLICT (parent_id, student_id) DO NOTHING;

-- ── FIX 2: Verify links were created ──
-- Run this separately to check:
-- SELECT p.email, p.first_name, ps.student_id, sp.first_name, st.admission_number
-- FROM profiles p
-- JOIN parents pa ON pa.id = p.id
-- LEFT JOIN parent_student ps ON ps.parent_id = p.id
-- LEFT JOIN students st ON st.id = ps.student_id
-- LEFT JOIN profiles sp ON sp.id = st.id
-- WHERE p.role = 'parent'
-- ORDER BY p.email;

-- ── FIX 3: Recreate ALL parent RLS policies correctly ──
-- Drop existing
DROP POLICY IF EXISTS "parent_read_children" ON students;
DROP POLICY IF EXISTS "parent_read_children_attendance" ON attendance;
DROP POLICY IF EXISTS "parent_read_children_results" ON results;
DROP POLICY IF EXISTS "parent_read_children_invoices" ON fee_invoices;
DROP POLICY IF EXISTS "parent_read_children_payments" ON payments;
DROP POLICY IF EXISTS "parent_read_own_links" ON parent_student;
DROP POLICY IF EXISTS "parent_read_own" ON parents;
DROP POLICY IF EXISTS "parent_read_children_profiles" ON profiles;
DROP POLICY IF EXISTS "parent_read_children_assignments" ON assignments;
DROP POLICY IF EXISTS "parent_read_children_submissions" ON submissions;
DROP POLICY IF EXISTS "parent_read_announcements" ON announcements;
DROP POLICY IF EXISTS "parent_read_messages" ON messages;
DROP POLICY IF EXISTS "parent_read_sections" ON sections;
DROP POLICY IF EXISTS "parent_read_classes" ON classes;

-- Parents table: parent can read own record
CREATE POLICY "parent_read_own" ON parents
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Parent-student: parent can see their own links
CREATE POLICY "parent_read_own_links" ON parent_student
  FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

-- Students: parent can read their children
CREATE POLICY "parent_read_children" ON students
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT student_id FROM parent_student 
      WHERE parent_id = auth.uid()
    )
  );

-- Profiles: parent can read own profile AND children's profiles
CREATE POLICY "parent_read_children_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR
    id IN (
      SELECT student_id FROM parent_student 
      WHERE parent_id = auth.uid()
    )
  );

-- Attendance: parent can see children's attendance
CREATE POLICY "parent_read_children_attendance" ON attendance
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT student_id FROM parent_student 
      WHERE parent_id = auth.uid()
    )
  );

-- Results: parent can see children's published results
CREATE POLICY "parent_read_children_results" ON results
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT student_id FROM parent_student 
      WHERE parent_id = auth.uid()
    )
    AND is_published = true
  );

-- Fee invoices: parent can see children's invoices
CREATE POLICY "parent_read_children_invoices" ON fee_invoices
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT student_id FROM parent_student 
      WHERE parent_id = auth.uid()
    )
  );

-- Payments: parent can see children's payments
CREATE POLICY "parent_read_children_payments" ON payments
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT student_id FROM parent_student 
      WHERE parent_id = auth.uid()
    )
  );

-- Assignments: parent can see assignments for their children's classes
CREATE POLICY "parent_read_children_assignments" ON assignments
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'parent'
    AND school_id = get_my_school_id()
  );

-- Submissions: parent can see children's submissions
CREATE POLICY "parent_read_children_submissions" ON submissions
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT student_id FROM parent_student 
      WHERE parent_id = auth.uid()
    )
  );

-- Announcements: parent can see published announcements for parents
CREATE POLICY "parent_read_announcements" ON announcements
  FOR SELECT TO authenticated
  USING (
    school_id = get_my_school_id()
    AND is_published = true
    AND 'parent'::user_role = ANY(target_roles)
  );

-- Messages: parent can read own messages
CREATE POLICY "parent_read_messages" ON messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

-- Sections: parent can read sections their children are in
CREATE POLICY "parent_read_sections" ON sections
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'parent'
    AND school_id = get_my_school_id()
  );

-- Classes: parent can read classes their children are in
CREATE POLICY "parent_read_classes" ON classes
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'parent'
    AND school_id = get_my_school_id()
  );

-- Subjects: parent can read subjects
DROP POLICY IF EXISTS "parent_read_subjects" ON subjects;
CREATE POLICY "parent_read_subjects" ON subjects
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'parent'
    AND school_id = get_my_school_id()
  );

-- Teacher subjects: parent can read teacher assignments
DROP POLICY IF EXISTS "parent_read_teacher_subjects" ON teacher_subjects;
CREATE POLICY "parent_read_teacher_subjects" ON teacher_subjects
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'parent'
    AND school_id = get_my_school_id()
  );

-- Teachers: parent can read teacher profiles
DROP POLICY IF EXISTS "parent_read_teachers" ON teachers;
CREATE POLICY "parent_read_teachers" ON teachers
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'parent'
    AND school_id = get_my_school_id()
  );
