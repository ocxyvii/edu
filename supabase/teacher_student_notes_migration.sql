-- ============================================================
-- TEACHER-STUDENT NOTES TABLE
-- Allows teachers to add private notes about students
-- ============================================================

CREATE TABLE IF NOT EXISTS teacher_student_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tsn_school_id ON teacher_student_notes(school_id);
CREATE INDEX IF NOT EXISTS idx_tsn_teacher_id ON teacher_student_notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tsn_student_id ON teacher_student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_tsn_teacher_student ON teacher_student_notes(teacher_id, student_id);

DROP TRIGGER IF EXISTS trg_tsn_updated_at ON teacher_student_notes;
CREATE TRIGGER trg_tsn_updated_at
  BEFORE UPDATE ON teacher_student_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE teacher_student_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_manage_own_notes" ON teacher_student_notes;
CREATE POLICY "teacher_manage_own_notes" ON teacher_student_notes
  FOR ALL TO authenticated
  USING (
    teacher_id = auth.uid()
    AND school_id = get_my_school_id()
  )
  WITH CHECK (
    teacher_id = auth.uid()
    AND school_id = get_my_school_id()
  );

DROP POLICY IF EXISTS "school_admin_view_notes" ON teacher_student_notes;
CREATE POLICY "school_admin_view_notes" ON teacher_student_notes
  FOR SELECT TO authenticated
  USING (
    is_school_admin()
    AND school_id = get_my_school_id()
  );
