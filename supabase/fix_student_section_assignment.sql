-- ============================================================
-- FIX: Assign students with null section_id to their class's
-- first section, and provide diagnostic queries.
-- Run in Supabase SQL Editor (safe to re-run).
-- ============================================================

-- ── DIAGNOSTIC 1: Find all students and their section assignment ──
SELECT
  p.first_name,
  p.last_name,
  s.admission_number,
  s.class_id,
  c.name AS class_name,
  s.section_id,
  sec.name AS section_name,
  s.is_active,
  s.enrollment_date
FROM students s
JOIN profiles p ON p.id = s.id
LEFT JOIN classes c ON c.id = s.class_id
LEFT JOIN sections sec ON sec.id = s.section_id
WHERE s.is_active = true
ORDER BY s.enrollment_date DESC;

-- ── DIAGNOSTIC 2: Count students per section (shows the real count issue) ──
SELECT
  sec.id AS section_id,
  sec.name AS section_name,
  c.name AS class_name,
  COUNT(s.id) FILTER (WHERE s.section_id = sec.id AND s.is_active = true) AS students_by_section,
  COUNT(s2.id) FILTER (WHERE s2.class_id = c.id AND s2.is_active = true) AS total_in_class
FROM sections sec
JOIN classes c ON c.id = sec.class_id
LEFT JOIN students s ON s.section_id = sec.id
LEFT JOIN students s2 ON s2.class_id = c.id
GROUP BY sec.id, sec.name, c.name
ORDER BY c.name, sec.name;

-- ── DIAGNOSTIC 3: Find orphan students (class_id set but no section_id) ──
SELECT
  p.first_name,
  p.last_name,
  s.admission_number,
  c.name AS class_name,
  s.section_id,
  s.class_id
FROM students s
JOIN profiles p ON p.id = s.id
LEFT JOIN classes c ON c.id = s.class_id
WHERE s.section_id IS NULL
AND s.class_id IS NOT NULL
AND s.is_active = true;

-- ============================================================
-- FIX: Assign orphan students to their class's first section
-- ============================================================
UPDATE students s
SET section_id = (
  SELECT sec.id
  FROM sections sec
  WHERE sec.class_id = s.class_id
  AND sec.school_id = s.school_id
  ORDER BY sec.name ASC
  LIMIT 1
)
WHERE s.section_id IS NULL
AND s.class_id IS NOT NULL
AND s.is_active = true;

-- ── VERIFY: Check the fix worked ──
SELECT
  p.first_name,
  p.last_name,
  s.admission_number,
  c.name AS class_name,
  sec.name AS section_name,
  s.enrollment_date
FROM students s
JOIN profiles p ON p.id = s.id
LEFT JOIN classes c ON c.id = s.class_id
LEFT JOIN sections sec ON sec.id = s.section_id
WHERE s.is_active = true
AND s.section_id IS NOT NULL
ORDER BY s.enrollment_date DESC;
