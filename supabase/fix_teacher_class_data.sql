-- ============================================================
-- FIX: Teacher Class Data Link
-- ============================================================
-- PROBLEM:
-- The admin panel creates teacher_subjects records without
-- section_id (only teacher_id + subject_id). The useTeacherClasses
-- hook queries teacher_subjects WHERE section_id IS NOT NULL,
-- so teachers see zero classes.
--
-- Also, profiles may be missing school_id, or teachers table
-- record may not exist for a profile with role = 'teacher'.
-- ============================================================

-- ============================================================
-- PART 1: DIAGNOSE
-- ============================================================
-- Run this to see which teachers are affected

-- SELECT
--   p.id AS teacher_id,
--   p.first_name || ' ' || p.last_name AS teacher_name,
--   p.school_id,
--   CASE WHEN t.id IS NULL THEN 'MISSING' ELSE 'OK' END AS teachers_record,
--   CASE WHEN ts.id IS NULL THEN 'NONE' ELSE 'EXISTS' END AS subject_assignments,
--   CASE
--     WHEN ts.id IS NOT NULL AND ts.section_id IS NULL THEN 'SECTION_MISSING'
--     WHEN ts.id IS NOT NULL AND ts.section_id IS NOT NULL THEN 'OK'
--     ELSE 'N/A'
--   END AS section_link_status
-- FROM profiles p
-- LEFT JOIN teachers t ON t.id = p.id
-- LEFT JOIN teacher_subjects ts ON ts.teacher_id = p.id
-- WHERE p.role = 'teacher'
-- ORDER BY p.first_name;

-- ============================================================
-- PART 2: ENSURE teachers RECORD EXISTS
-- ============================================================
-- For every profile with role = 'teacher' that is missing a
-- teachers record, create one.

INSERT INTO teachers (id, school_id, is_active)
SELECT p.id, p.school_id, true
FROM profiles p
LEFT JOIN teachers t ON t.id = p.id
WHERE p.role = 'teacher'
  AND t.id IS NULL
  AND p.school_id IS NOT NULL;

-- ============================================================
-- PART 3: POPULATE section_id IN teacher_subjects
-- ============================================================
-- For each teacher_subjects record with NULL section_id,
-- find the subject's class_id and assign to all sections of that class.
-- This links teachers to the sections they should teach.

WITH teacher_subject_class AS (
  SELECT
    ts.id AS ts_id,
    ts.teacher_id,
    ts.subject_id,
    ts.school_id,
    sub.class_id
  FROM teacher_subjects ts
  JOIN subjects sub ON sub.id = ts.subject_id
  WHERE ts.section_id IS NULL
    AND sub.class_id IS NOT NULL
),
target_sections AS (
  SELECT
    tsc.ts_id,
    tsc.teacher_id,
    tsc.subject_id,
    tsc.school_id,
    s.id AS section_id
  FROM teacher_subject_class tsc
  JOIN sections s ON s.class_id = tsc.class_id
    AND s.school_id = tsc.school_id
)
INSERT INTO teacher_subjects (teacher_id, subject_id, section_id, school_id)
SELECT DISTINCT
  ts.teacher_id,
  ts.subject_id,
  ts.section_id,
  ts.school_id
FROM target_sections ts
WHERE NOT EXISTS (
  -- Avoid duplicates
  SELECT 1 FROM teacher_subjects existing
  WHERE existing.teacher_id = ts.teacher_id
    AND existing.subject_id = ts.subject_id
    AND existing.section_id = ts.section_id
);

-- ============================================================
-- PART 4: SET class_teacher_id ON SECTIONS
-- ============================================================
-- If a teacher teaches ALL subjects for a class section, they
-- should be marked as class teacher. But more commonly, the
-- admin needs to set this manually. This is informational only.

-- To set a specific teacher as class teacher for their sections:
-- UPDATE sections
-- SET class_teacher_id = '<teacher-uuid>'
-- WHERE id IN ('<section-uuid-1>', '<section-uuid-2>');

-- ============================================================
-- PART 5: VERIFY FIX
-- ============================================================
-- Check that teachers now have section-linked subject assignments

SELECT
  p.id AS teacher_id,
  p.first_name || ' ' || p.last_name AS teacher_name,
  COUNT(DISTINCT ts.section_id) AS section_count,
  COUNT(DISTINCT ts.subject_id) AS subject_count,
  COUNT(DISTINCT s.id) AS total_sections,
  CASE
    WHEN COUNT(DISTINCT ts.section_id) > 0 THEN 'FIXED'
    ELSE 'STILL_BROKEN'
  END AS status
FROM profiles p
JOIN teachers t ON t.id = p.id
LEFT JOIN teacher_subjects ts ON ts.teacher_id = p.id AND ts.section_id IS NOT NULL
LEFT JOIN sections s ON s.id = ts.section_id
WHERE p.role = 'teacher'
GROUP BY p.id, p.first_name, p.last_name
ORDER BY p.first_name;
