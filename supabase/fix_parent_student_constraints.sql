-- Check current constraints on parent_student
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'parent_student'::regclass;

-- If there's a UNIQUE constraint on (parent_id) alone, drop it:
-- (only run if the above shows a wrong constraint)
-- ALTER TABLE parent_student DROP CONSTRAINT parent_student_parent_id_key;

-- The correct constraint should be UNIQUE (parent_id, student_id)
-- which allows one parent to have multiple children
-- Add if missing:
-- ALTER TABLE parent_student ADD CONSTRAINT parent_student_parent_id_student_id_key UNIQUE (parent_id, student_id);

-- Enable RLS on parent_student if not already enabled
-- ALTER TABLE parent_student ENABLE ROW LEVEL SECURITY;

-- RLS policy: parents can only read their own links
-- CREATE POLICY "Parents can view own links"
--   ON parent_student
--   FOR SELECT
--   USING (parent_id = auth.uid());

-- RLS policy: service role can insert/update (for enrollStudent)
-- CREATE POLICY "Service role can manage parent_student"
--   ON parent_student
--   FOR ALL
--   USING (auth.role() = 'service_role');
