-- ============================================================
-- EDUCORE SCHOOL MANAGEMENT SYSTEM
-- Complete Supabase PostgreSQL Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'school_admin', 'teacher', 'student', 'parent');
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'pro', 'enterprise');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE exam_type AS ENUM ('midterm', 'final', 'quiz', 'assignment', 'cat');
CREATE TYPE question_type AS ENUM ('mcq', 'true_false', 'short_answer', 'essay');
CREATE TYPE fee_type AS ENUM ('tuition', 'transport', 'library', 'lab', 'boarding', 'uniform', 'other');
CREATE TYPE invoice_status AS ENUM ('pending', 'partial', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'mpesa', 'card', 'bank_transfer', 'cheque');
CREATE TYPE contract_type AS ENUM ('permanent', 'contract', 'part_time', 'intern');
CREATE TYPE leave_type AS ENUM ('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'emergency');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE payroll_status AS ENUM ('pending', 'processed', 'paid');
CREATE TYPE book_issue_status AS ENUM ('issued', 'returned', 'overdue', 'lost');
CREATE TYPE member_type AS ENUM ('student', 'teacher', 'staff');
CREATE TYPE material_type AS ENUM ('video', 'document', 'link', 'quiz', 'audio');
CREATE TYPE submission_status AS ENUM ('pending', 'submitted', 'graded', 'returned');
CREATE TYPE application_status AS ENUM ('pending', 'reviewing', 'approved', 'rejected', 'waitlisted', 'enrolled');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error', 'attendance', 'fee', 'exam', 'announcement');
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');


-- ============================================================
-- UTILITY: auto-update updated_at on every table
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 1. SCHOOLS
-- ============================================================

CREATE TABLE schools (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  logo_url          TEXT,
  address           TEXT,
  city              TEXT,
  country           TEXT DEFAULT 'Kenya',
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  subscription_plan subscription_plan NOT NULL DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  settings          JSONB NOT NULL DEFAULT '{
    "timezone": "Africa/Nairobi",
    "currency": "KES",
    "academic_year_start_month": 1,
    "grading_scale": [
      {"grade":"A","min":80,"max":100},
      {"grade":"B","min":65,"max":79},
      {"grade":"C","min":50,"max":64},
      {"grade":"D","min":40,"max":49},
      {"grade":"E","min":0,"max":39}
    ],
    "working_days": ["monday","tuesday","wednesday","thursday","friday"],
    "attendance_late_threshold_minutes": 15,
    "library_fine_per_day": 5
  }'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schools_slug ON schools(slug);
CREATE INDEX idx_schools_is_active ON schools(is_active);

CREATE TRIGGER trg_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 2. PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id     UUID REFERENCES schools(id) ON DELETE SET NULL,
  role          user_role NOT NULL DEFAULT 'student',
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  gender        gender_type,
  date_of_birth DATE,
  address       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  two_fa_enabled BOOLEAN NOT NULL DEFAULT false,
  two_fa_secret  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_school_id ON profiles(school_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 3. ACADEMIC YEARS
-- ============================================================

CREATE TABLE academic_years (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_academic_year_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_academic_years_school_id ON academic_years(school_id);
CREATE INDEX idx_academic_years_is_current ON academic_years(school_id, is_current);

CREATE TRIGGER trg_academic_years_updated_at
  BEFORE UPDATE ON academic_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 4. TERMS / SEMESTERS
-- ============================================================

CREATE TABLE terms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  is_current       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_term_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_terms_school_id ON terms(school_id);
CREATE INDEX idx_terms_academic_year_id ON terms(academic_year_id);

CREATE TRIGGER trg_terms_updated_at
  BEFORE UPDATE ON terms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 5. CLASSES
-- ============================================================

CREATE TABLE classes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  level            INTEGER,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_classes_academic_year_id ON classes(academic_year_id);

CREATE TRIGGER trg_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 6. SECTIONS
-- ============================================================

CREATE TABLE sections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id         UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  capacity         INTEGER DEFAULT 40,
  class_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  room             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sections_school_id ON sections(school_id);
CREATE INDEX idx_sections_class_id ON sections(class_id);
CREATE INDEX idx_sections_class_teacher_id ON sections(class_teacher_id);

CREATE TRIGGER trg_sections_updated_at
  BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 7. SUBJECTS
-- ============================================================

CREATE TABLE subjects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id     UUID REFERENCES classes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  code         TEXT,
  description  TEXT,
  credit_hours INTEGER DEFAULT 1,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subjects_school_id ON subjects(school_id);
CREATE INDEX idx_subjects_class_id ON subjects(class_id);

CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 8. TEACHERS
-- ============================================================

CREATE TABLE teachers (
  id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  employee_number TEXT,
  department      TEXT,
  qualification   TEXT,
  specialization  TEXT,
  joining_date    DATE,
  salary          NUMERIC(12,2),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teachers_school_id ON teachers(school_id);
CREATE UNIQUE INDEX idx_teachers_employee_number ON teachers(school_id, employee_number) WHERE employee_number IS NOT NULL;

CREATE TRIGGER trg_teachers_updated_at
  BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 9. TEACHER SUBJECTS (many-to-many)
-- ============================================================

CREATE TABLE teacher_subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, section_id)
);

CREATE INDEX idx_teacher_subjects_teacher_id ON teacher_subjects(teacher_id);
CREATE INDEX idx_teacher_subjects_subject_id ON teacher_subjects(subject_id);


-- ============================================================
-- 10. PARENTS
-- ============================================================

CREATE TABLE parents (
  id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  occupation TEXT,
  national_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parents_school_id ON parents(school_id);

CREATE TRIGGER trg_parents_updated_at
  BEFORE UPDATE ON parents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 11. STUDENTS
-- ============================================================

CREATE TABLE students (
  id               UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  admission_number TEXT NOT NULL,
  class_id         UUID REFERENCES classes(id) ON DELETE SET NULL,
  section_id       UUID REFERENCES sections(id) ON DELETE SET NULL,
  enrollment_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  blood_group      TEXT,
  medical_notes    TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, admission_number)
);

CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_section_id ON students(section_id);
CREATE INDEX idx_students_admission_number ON students(school_id, admission_number);

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 12. PARENT-STUDENT (many-to-many)
-- ============================================================

CREATE TABLE parent_student (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

CREATE INDEX idx_parent_student_parent_id ON parent_student(parent_id);
CREATE INDEX idx_parent_student_student_id ON parent_student(student_id);


-- ============================================================
-- 13. ATTENDANCE (students)
-- ============================================================

CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id  UUID REFERENCES sections(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  status      attendance_status NOT NULL DEFAULT 'absent',
  marked_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, date)
);

CREATE INDEX idx_attendance_school_id ON attendance(school_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_class_id ON attendance(class_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_school_date ON attendance(school_id, date);

CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 14. TEACHER ATTENDANCE
-- ============================================================

CREATE TABLE teacher_attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      attendance_status NOT NULL DEFAULT 'absent',
  check_in_time TIME,
  check_out_time TIME,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, date)
);

CREATE INDEX idx_teacher_attendance_school_id ON teacher_attendance(school_id);
CREATE INDEX idx_teacher_attendance_teacher_id ON teacher_attendance(teacher_id);
CREATE INDEX idx_teacher_attendance_date ON teacher_attendance(date);

CREATE TRIGGER trg_teacher_attendance_updated_at
  BEFORE UPDATE ON teacher_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 15. EXAMS
-- ============================================================

CREATE TABLE exams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term_id     UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES classes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  exam_type   exam_type NOT NULL DEFAULT 'midterm',
  start_date  DATE,
  end_date    DATE,
  total_marks INTEGER NOT NULL DEFAULT 100,
  pass_marks  INTEGER NOT NULL DEFAULT 40,
  is_online   BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  instructions TEXT,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exams_school_id ON exams(school_id);
CREATE INDEX idx_exams_term_id ON exams(term_id);
CREATE INDEX idx_exams_class_id ON exams(class_id);

CREATE TRIGGER trg_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 16. EXAM SUBJECTS
-- ============================================================

CREATE TABLE exam_subjects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exam_date        DATE,
  start_time       TIME,
  duration_minutes INTEGER DEFAULT 120,
  max_marks        INTEGER NOT NULL DEFAULT 100,
  pass_marks       INTEGER NOT NULL DEFAULT 40,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, subject_id)
);

CREATE INDEX idx_exam_subjects_exam_id ON exam_subjects(exam_id);
CREATE INDEX idx_exam_subjects_subject_id ON exam_subjects(subject_id);


-- ============================================================
-- 17. RESULTS
-- ============================================================

CREATE TABLE results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id          UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  marks_obtained   NUMERIC(6,2) NOT NULL DEFAULT 0,
  grade            TEXT,
  remarks          TEXT,
  is_published     BOOLEAN NOT NULL DEFAULT false,
  entered_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, exam_id, subject_id)
);

CREATE INDEX idx_results_school_id ON results(school_id);
CREATE INDEX idx_results_student_id ON results(student_id);
CREATE INDEX idx_results_exam_id ON results(exam_id);
CREATE INDEX idx_results_subject_id ON results(subject_id);

CREATE TRIGGER trg_results_updated_at
  BEFORE UPDATE ON results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 18. QUESTION BANK
-- ============================================================

CREATE TABLE question_bank (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id     UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  question_text  TEXT NOT NULL,
  question_type  question_type NOT NULL DEFAULT 'mcq',
  options        JSONB,
  correct_answer TEXT,
  marks          INTEGER NOT NULL DEFAULT 1,
  difficulty     TEXT DEFAULT 'medium',
  topic          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_bank_school_id ON question_bank(school_id);
CREATE INDEX idx_question_bank_subject_id ON question_bank(subject_id);

CREATE TRIGGER trg_question_bank_updated_at
  BEFORE UPDATE ON question_bank
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 19. ONLINE EXAM SESSIONS
-- ============================================================

CREATE TABLE online_exam_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exam_id      UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  answers      JSONB DEFAULT '{}',
  score        NUMERIC(6,2),
  is_submitted BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

CREATE INDEX idx_online_exam_sessions_exam_id ON online_exam_sessions(exam_id);
CREATE INDEX idx_online_exam_sessions_student_id ON online_exam_sessions(student_id);

CREATE TRIGGER trg_online_exam_sessions_updated_at
  BEFORE UPDATE ON online_exam_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 20. FEE STRUCTURES
-- ============================================================

CREATE TABLE fee_structures (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id          UUID REFERENCES terms(id) ON DELETE SET NULL,
  class_id         UUID REFERENCES classes(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  fee_type         fee_type NOT NULL DEFAULT 'tuition',
  amount           NUMERIC(12,2) NOT NULL,
  due_date         DATE,
  description      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fee_structures_school_id ON fee_structures(school_id);
CREATE INDEX idx_fee_structures_academic_year_id ON fee_structures(academic_year_id);
CREATE INDEX idx_fee_structures_class_id ON fee_structures(class_id);

CREATE TRIGGER trg_fee_structures_updated_at
  BEFORE UPDATE ON fee_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 21. FEE INVOICES
-- ============================================================

CREATE TABLE fee_invoices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id          UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id         UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id   UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
  invoice_number     TEXT NOT NULL,
  amount             NUMERIC(12,2) NOT NULL,
  discount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance            NUMERIC(12,2) GENERATED ALWAYS AS (amount - discount - paid_amount) STORED,
  status             invoice_status NOT NULL DEFAULT 'pending',
  due_date           DATE,
  description        TEXT,
  created_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, invoice_number)
);

CREATE INDEX idx_fee_invoices_school_id ON fee_invoices(school_id);
CREATE INDEX idx_fee_invoices_student_id ON fee_invoices(student_id);
CREATE INDEX idx_fee_invoices_status ON fee_invoices(status);
CREATE INDEX idx_fee_invoices_due_date ON fee_invoices(due_date);

CREATE TRIGGER trg_fee_invoices_updated_at
  BEFORE UPDATE ON fee_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 22. PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  payment_method  payment_method NOT NULL DEFAULT 'cash',
  transaction_ref TEXT,
  receipt_number  TEXT,
  notes           TEXT,
  received_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_school_id ON payments(school_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

-- Auto-update invoice paid_amount and status after payment insert
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE fee_invoices
  SET
    paid_amount = paid_amount + NEW.amount,
    status = CASE
      WHEN (paid_amount + NEW.amount) >= (amount - discount) THEN 'paid'::invoice_status
      WHEN (paid_amount + NEW.amount) > 0 THEN 'partial'::invoice_status
      ELSE 'pending'::invoice_status
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_update_invoice
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment();


-- ============================================================
-- 23. SCHOLARSHIPS / DISCOUNTS
-- ============================================================

CREATE TABLE scholarships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  percentage  NUMERIC(5,2),
  fixed_amount NUMERIC(12,2),
  reason      TEXT,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scholarships_school_id ON scholarships(school_id);
CREATE INDEX idx_scholarships_student_id ON scholarships(student_id);

CREATE TRIGGER trg_scholarships_updated_at
  BEFORE UPDATE ON scholarships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 24. EMPLOYEES (all staff including teachers)
-- ============================================================

CREATE TABLE employees (
  id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  employee_number TEXT,
  department      TEXT,
  position        TEXT,
  contract_type   contract_type NOT NULL DEFAULT 'permanent',
  basic_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances      JSONB NOT NULL DEFAULT '{"housing":0,"transport":0,"medical":0,"other":0}',
  bank_name       TEXT,
  bank_account    TEXT,
  joining_date    DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, employee_number)
);

CREATE INDEX idx_employees_school_id ON employees(school_id);

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 25. LEAVE REQUESTS
-- ============================================================

CREATE TABLE leave_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type  leave_type NOT NULL DEFAULT 'annual',
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  days        INTEGER NOT NULL DEFAULT 1,
  reason      TEXT NOT NULL,
  status      leave_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_school_id ON leave_requests(school_id);
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 26. PAYROLL
-- ============================================================

CREATE TABLE payroll (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         INTEGER NOT NULL CHECK (year > 2000),
  basic_salary NUMERIC(12,2) NOT NULL,
  allowances   JSONB NOT NULL DEFAULT '{}',
  deductions   JSONB NOT NULL DEFAULT '{"tax":0,"nhif":0,"nssf":0,"other":0}',
  gross_salary NUMERIC(12,2) NOT NULL,
  net_salary   NUMERIC(12,2) NOT NULL,
  paid_date    DATE,
  status       payroll_status NOT NULL DEFAULT 'pending',
  notes        TEXT,
  processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

CREATE INDEX idx_payroll_school_id ON payroll(school_id);
CREATE INDEX idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX idx_payroll_month_year ON payroll(school_id, month, year);

CREATE TRIGGER trg_payroll_updated_at
  BEFORE UPDATE ON payroll
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 27. BOOKS (Library)
-- ============================================================

CREATE TABLE books (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  author           TEXT,
  isbn             TEXT,
  publisher        TEXT,
  publish_year     INTEGER,
  category         TEXT,
  cover_url        TEXT,
  total_copies     INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  shelf_location   TEXT,
  description      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_copies CHECK (available_copies <= total_copies AND available_copies >= 0)
);

CREATE INDEX idx_books_school_id ON books(school_id);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_category ON books(school_id, category);

CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 28. BOOK ISSUES
-- ============================================================

CREATE TABLE book_issues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_type member_type NOT NULL DEFAULT 'student',
  issue_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date    DATE NOT NULL,
  return_date DATE,
  fine_amount NUMERIC(8,2) NOT NULL DEFAULT 0,
  fine_paid   BOOLEAN NOT NULL DEFAULT false,
  status      book_issue_status NOT NULL DEFAULT 'issued',
  issued_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_book_issues_school_id ON book_issues(school_id);
CREATE INDEX idx_book_issues_book_id ON book_issues(book_id);
CREATE INDEX idx_book_issues_member_id ON book_issues(member_id);
CREATE INDEX idx_book_issues_status ON book_issues(status);
CREATE INDEX idx_book_issues_due_date ON book_issues(due_date);

-- Decrement available_copies on issue
CREATE OR REPLACE FUNCTION handle_book_issue()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE books SET available_copies = available_copies - 1, updated_at = NOW()
    WHERE id = NEW.book_id AND available_copies > 0;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No copies available for this book';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'returned' AND OLD.status != 'returned' THEN
    UPDATE books SET available_copies = available_copies + 1, updated_at = NOW()
    WHERE id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_book_issues_copies
  AFTER INSERT OR UPDATE ON book_issues
  FOR EACH ROW EXECUTE FUNCTION handle_book_issue();

CREATE TRIGGER trg_book_issues_updated_at
  BEFORE UPDATE ON book_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 29. COURSES (LMS)
-- ============================================================

CREATE TABLE courses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id   UUID REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id   UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id     UUID REFERENCES classes(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  cover_url    TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_school_id ON courses(school_id);
CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX idx_courses_class_id ON courses(class_id);

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 30. COURSE MATERIALS
-- ============================================================

CREATE TABLE course_materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        material_type NOT NULL DEFAULT 'document',
  content_url TEXT,
  content     TEXT,
  duration    INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_course_materials_course_id ON course_materials(course_id);

CREATE TRIGGER trg_course_materials_updated_at
  BEFORE UPDATE ON course_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 31. STUDENT PROGRESS (LMS)
-- ============================================================

CREATE TABLE student_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  progress    INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  completed   BOOLEAN NOT NULL DEFAULT false,
  last_accessed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, material_id)
);

CREATE INDEX idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX idx_student_progress_material_id ON student_progress(material_id);

CREATE TRIGGER trg_student_progress_updated_at
  BEFORE UPDATE ON student_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 32. ASSIGNMENTS
-- ============================================================

CREATE TABLE assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id   UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id     UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id   UUID REFERENCES sections(id) ON DELETE SET NULL,
  subject_id   UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  due_date     TIMESTAMPTZ NOT NULL,
  max_marks    INTEGER NOT NULL DEFAULT 100,
  attachments  JSONB DEFAULT '[]',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_school_id ON assignments(school_id);
CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 33. SUBMISSIONS
-- ============================================================

CREATE TABLE submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  content       TEXT,
  attachments   JSONB DEFAULT '[]',
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  marks         NUMERIC(6,2),
  feedback      TEXT,
  status        submission_status NOT NULL DEFAULT 'submitted',
  graded_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  graded_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);

CREATE TRIGGER trg_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 34. TIMETABLE
-- ============================================================

CREATE TABLE timetable (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  section_id  UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  room        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_timetable_times CHECK (end_time > start_time)
);

CREATE INDEX idx_timetable_school_id ON timetable(school_id);
CREATE INDEX idx_timetable_section_id ON timetable(section_id);
CREATE INDEX idx_timetable_teacher_id ON timetable(teacher_id);
CREATE INDEX idx_timetable_day ON timetable(day_of_week);

CREATE TRIGGER trg_timetable_updated_at
  BEFORE UPDATE ON timetable
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 35. ADMISSIONS / APPLICATIONS
-- ============================================================

CREATE TABLE applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_name      TEXT NOT NULL,
  date_of_birth     DATE,
  gender            gender_type,
  applying_for_class TEXT NOT NULL,
  parent_name       TEXT NOT NULL,
  parent_email      TEXT,
  parent_phone      TEXT NOT NULL,
  address           TEXT,
  previous_school   TEXT,
  documents         JSONB DEFAULT '[]',
  status            application_status NOT NULL DEFAULT 'pending',
  notes             TEXT,
  reviewed_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  enrolled_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applications_school_id ON applications(school_id);
CREATE INDEX idx_applications_status ON applications(status);

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 36. ANNOUNCEMENTS
-- ============================================================

CREATE TABLE announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  target_roles  user_role[] NOT NULL DEFAULT ARRAY['student','teacher','parent','school_admin']::user_role[],
  is_published  BOOLEAN NOT NULL DEFAULT false,
  published_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_school_id ON announcements(school_id);
CREATE INDEX idx_announcements_is_published ON announcements(school_id, is_published);

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 37. MESSAGES
-- ============================================================

CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject      TEXT,
  content      TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  read_at      TIMESTAMPTZ,
  parent_id    UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_school_id ON messages(school_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_is_read ON messages(recipient_id, is_read);

-- No updated_at: messages are immutable after send


-- ============================================================
-- 38. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID REFERENCES schools(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        notification_type NOT NULL DEFAULT 'info',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  action_url  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_school_id ON notifications(school_id);


-- ============================================================
-- 39. PUSH SUBSCRIPTIONS (for PWA)
-- ============================================================

CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);


-- ============================================================
-- 40. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID REFERENCES schools(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_school_id ON audit_logs(school_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);


-- ============================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_school_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'school_admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION belongs_to_school(sid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND school_id = sid);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_children_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT student_id FROM parent_student WHERE parent_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE schools              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years       ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms                ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE students             ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_attendance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_subjects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE results              ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank        ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll              ENABLE ROW LEVEL SECURITY;
ALTER TABLE books                ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_issues          ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials     ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable            ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;


-- ── SCHOOLS ─────────────────────────────────────────────────
CREATE POLICY "super_admin_all_schools" ON schools
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "school_members_read_own_school" ON schools
  FOR SELECT TO authenticated
  USING (id = get_my_school_id());

-- ── PROFILES ────────────────────────────────────────────────
CREATE POLICY "super_admin_all_profiles" ON profiles
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "school_admin_manage_school_profiles" ON profiles
  FOR ALL TO authenticated
  USING (is_school_admin() AND school_id = get_my_school_id())
  WITH CHECK (is_school_admin() AND school_id = get_my_school_id());

CREATE POLICY "teachers_read_school_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (get_my_role() = 'teacher' AND school_id = get_my_school_id());

CREATE POLICY "parents_read_school_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (get_my_role() = 'parent' AND school_id = get_my_school_id());

-- ── ACADEMIC YEARS ──────────────────────────────────────────
CREATE POLICY "school_members_read_academic_years" ON academic_years
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_academic_years" ON academic_years
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

-- Public can read academic years for registration form
CREATE POLICY "public_read_academic_years" ON academic_years
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── TERMS ───────────────────────────────────────────────────
CREATE POLICY "school_members_read_terms" ON terms
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_terms" ON terms
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

-- ── CLASSES ─────────────────────────────────────────────────
CREATE POLICY "school_members_read_classes" ON classes
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_classes" ON classes
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

-- Public can read class names/levels for registration form
CREATE POLICY "public_read_classes" ON classes
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── SECTIONS ────────────────────────────────────────────────
CREATE POLICY "school_members_read_sections" ON sections
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_sections" ON sections
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

-- ── SUBJECTS ────────────────────────────────────────────────
CREATE POLICY "school_members_read_subjects" ON subjects
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_subjects" ON subjects
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

-- ── TEACHERS ────────────────────────────────────────────────
CREATE POLICY "school_members_read_teachers" ON teachers
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_teachers" ON teachers
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "teacher_read_own_record" ON teachers
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ── STUDENTS ────────────────────────────────────────────────
CREATE POLICY "super_admin_all_students" ON students
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "school_admin_manage_students" ON students
  FOR ALL TO authenticated
  USING (is_school_admin() AND school_id = get_my_school_id())
  WITH CHECK (is_school_admin() AND school_id = get_my_school_id());

CREATE POLICY "teachers_read_school_students" ON students
  FOR SELECT TO authenticated
  USING (get_my_role() = 'teacher' AND school_id = get_my_school_id());

CREATE POLICY "student_read_own_record" ON students
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "parent_read_children" ON students
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'parent' AND
    id = ANY(get_my_children_ids())
  );

-- ── PARENTS ─────────────────────────────────────────────────
CREATE POLICY "school_admin_manage_parents" ON parents
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "parent_read_own" ON parents
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "teachers_read_parents" ON parents
  FOR SELECT TO authenticated
  USING (get_my_role() = 'teacher' AND school_id = get_my_school_id());

-- ── PARENT_STUDENT ──────────────────────────────────────────
CREATE POLICY "school_admin_manage_parent_student" ON parent_student
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "parent_read_own_links" ON parent_student
  FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

-- ── ATTENDANCE ──────────────────────────────────────────────
CREATE POLICY "school_admin_all_attendance" ON attendance
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "teachers_manage_attendance" ON attendance
  FOR ALL TO authenticated
  USING (get_my_role() = 'teacher' AND school_id = get_my_school_id())
  WITH CHECK (get_my_role() = 'teacher' AND school_id = get_my_school_id());

CREATE POLICY "student_read_own_attendance" ON attendance
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "parent_read_children_attendance" ON attendance
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'parent' AND
    student_id = ANY(get_my_children_ids())
  );

-- ── TEACHER ATTENDANCE ──────────────────────────────────────
CREATE POLICY "school_admin_manage_teacher_attendance" ON teacher_attendance
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "teacher_read_own_attendance" ON teacher_attendance
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- ── EXAMS ───────────────────────────────────────────────────
CREATE POLICY "school_members_read_exams" ON exams
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_exams" ON exams
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "teachers_manage_exams" ON exams
  FOR ALL TO authenticated
  USING (get_my_role() = 'teacher' AND school_id = get_my_school_id() AND created_by = auth.uid())
  WITH CHECK (get_my_role() = 'teacher' AND school_id = get_my_school_id());

-- ── RESULTS ─────────────────────────────────────────────────
CREATE POLICY "school_admin_all_results" ON results
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "teachers_manage_results" ON results
  FOR ALL TO authenticated
  USING (get_my_role() = 'teacher' AND school_id = get_my_school_id())
  WITH CHECK (get_my_role() = 'teacher' AND school_id = get_my_school_id());

CREATE POLICY "student_read_own_results" ON results
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() AND is_published = true);

CREATE POLICY "parent_read_children_results" ON results
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'parent' AND
    student_id = ANY(get_my_children_ids()) AND
    is_published = true
  );

-- ── FEE STRUCTURES ──────────────────────────────────────────
CREATE POLICY "school_members_read_fee_structures" ON fee_structures
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_fee_structures" ON fee_structures
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

-- ── FEE INVOICES ────────────────────────────────────────────
CREATE POLICY "school_admin_all_invoices" ON fee_invoices
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "student_read_own_invoices" ON fee_invoices
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "parent_read_children_invoices" ON fee_invoices
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'parent' AND
    student_id = ANY(get_my_children_ids())
  );

-- ── PAYMENTS ────────────────────────────────────────────────
CREATE POLICY "school_admin_all_payments" ON payments
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "student_read_own_payments" ON payments
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "parent_read_children_payments" ON payments
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'parent' AND
    student_id = ANY(get_my_children_ids())
  );

-- ── EMPLOYEES ───────────────────────────────────────────────
CREATE POLICY "school_admin_manage_employees" ON employees
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "employee_read_own" ON employees
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ── LEAVE REQUESTS ──────────────────────────────────────────
CREATE POLICY "school_admin_manage_leave" ON leave_requests
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "employee_manage_own_leave" ON leave_requests
  FOR ALL TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- ── PAYROLL ─────────────────────────────────────────────────
CREATE POLICY "school_admin_manage_payroll" ON payroll
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "employee_read_own_payroll" ON payroll
  FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

-- ── BOOKS ───────────────────────────────────────────────────
CREATE POLICY "school_members_read_books" ON books
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_books" ON books
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

-- ── BOOK ISSUES ─────────────────────────────────────────────
CREATE POLICY "school_admin_manage_book_issues" ON book_issues
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "member_read_own_issues" ON book_issues
  FOR SELECT TO authenticated
  USING (member_id = auth.uid());

-- ── COURSES ─────────────────────────────────────────────────
CREATE POLICY "school_members_read_courses" ON courses
  FOR SELECT TO authenticated
  USING ((school_id = get_my_school_id() AND is_published = true) OR is_super_admin());

CREATE POLICY "teachers_manage_own_courses" ON courses
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid() OR (is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK (teacher_id = auth.uid() OR is_school_admin() OR is_super_admin());

-- ── COURSE MATERIALS ────────────────────────────────────────
CREATE POLICY "school_members_read_materials" ON course_materials
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "teachers_manage_materials" ON course_materials
  FOR ALL TO authenticated
  USING (
    (get_my_role() = 'teacher' AND school_id = get_my_school_id()) OR
    (is_school_admin() AND school_id = get_my_school_id()) OR
    is_super_admin()
  )
  WITH CHECK (
    (get_my_role() = 'teacher' AND school_id = get_my_school_id()) OR
    (is_school_admin() AND school_id = get_my_school_id()) OR
    is_super_admin()
  );

-- ── ASSIGNMENTS ─────────────────────────────────────────────
CREATE POLICY "school_members_read_assignments" ON assignments
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "teachers_manage_own_assignments" ON assignments
  FOR ALL TO authenticated
  USING (
    (get_my_role() = 'teacher' AND school_id = get_my_school_id()) OR
    (is_school_admin() AND school_id = get_my_school_id()) OR
    is_super_admin()
  )
  WITH CHECK (
    (get_my_role() = 'teacher' AND school_id = get_my_school_id()) OR
    (is_school_admin() AND school_id = get_my_school_id()) OR
    is_super_admin()
  );

-- ── SUBMISSIONS ─────────────────────────────────────────────
CREATE POLICY "teachers_read_submissions" ON submissions
  FOR SELECT TO authenticated
  USING (
    (get_my_role() = 'teacher' AND school_id = get_my_school_id()) OR
    (is_school_admin() AND school_id = get_my_school_id()) OR
    is_super_admin()
  );

CREATE POLICY "teachers_grade_submissions" ON submissions
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'teacher' AND school_id = get_my_school_id())
  WITH CHECK (get_my_role() = 'teacher' AND school_id = get_my_school_id());

CREATE POLICY "student_manage_own_submissions" ON submissions
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ── TIMETABLE ───────────────────────────────────────────────
CREATE POLICY "school_members_read_timetable" ON timetable
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_timetable" ON timetable
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

-- ── ANNOUNCEMENTS ───────────────────────────────────────────
CREATE POLICY "school_members_read_announcements" ON announcements
  FOR SELECT TO authenticated
  USING (
    school_id = get_my_school_id() AND
    is_published = true AND
    get_my_role() = ANY(target_roles)
  );

CREATE POLICY "school_admin_manage_announcements" ON announcements
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

-- ── MESSAGES ────────────────────────────────────────────────
CREATE POLICY "users_manage_own_messages" ON messages
  FOR ALL TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- ── NOTIFICATIONS ───────────────────────────────────────────
CREATE POLICY "users_manage_own_notifications" ON notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "school_admin_create_notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_school_admin() OR is_super_admin());

-- ── PUSH SUBSCRIPTIONS ──────────────────────────────────────
CREATE POLICY "users_manage_own_push_subs" ON push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── AUDIT LOGS ──────────────────────────────────────────────
CREATE POLICY "super_admin_read_audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "school_admin_read_own_audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (is_school_admin() AND school_id = get_my_school_id());

CREATE POLICY "insert_audit_logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── APPLICATIONS ────────────────────────────────────────────
CREATE POLICY "school_admin_manage_applications" ON applications
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "public_insert_applications" ON applications
  FOR INSERT
  WITH CHECK (true);

-- ── QUESTION BANK ───────────────────────────────────────────
CREATE POLICY "school_members_read_questions" ON question_bank
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "teachers_manage_questions" ON question_bank
  FOR ALL TO authenticated
  USING (
    (get_my_role() = 'teacher' AND school_id = get_my_school_id()) OR
    (is_school_admin() AND school_id = get_my_school_id()) OR
    is_super_admin()
  )
  WITH CHECK (
    (get_my_role() = 'teacher' AND school_id = get_my_school_id()) OR
    (is_school_admin() AND school_id = get_my_school_id()) OR
    is_super_admin()
  );

-- ── SCHOLARSHIPS ────────────────────────────────────────────
CREATE POLICY "school_admin_manage_scholarships" ON scholarships
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

CREATE POLICY "student_read_own_scholarships" ON scholarships
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- ── ONLINE EXAM SESSIONS ────────────────────────────────────
CREATE POLICY "student_manage_own_exam_sessions" ON online_exam_sessions
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "teachers_read_exam_sessions" ON online_exam_sessions
  FOR SELECT TO authenticated
  USING (
    (get_my_role() = 'teacher' AND school_id = get_my_school_id()) OR
    (is_school_admin() AND school_id = get_my_school_id()) OR
    is_super_admin()
  );

-- ── STUDENT PROGRESS ────────────────────────────────────────
CREATE POLICY "student_manage_own_progress" ON student_progress
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "teachers_read_progress" ON student_progress
  FOR SELECT TO authenticated
  USING (
    (get_my_role() = 'teacher' AND school_id = get_my_school_id()) OR
    (is_school_admin() AND school_id = get_my_school_id()) OR
    is_super_admin()
  );

-- ── TEACHER SUBJECTS ────────────────────────────────────────
CREATE POLICY "school_members_read_teacher_subjects" ON teacher_subjects
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_teacher_subjects" ON teacher_subjects
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());

-- ── EXAM SUBJECTS ───────────────────────────────────────────
CREATE POLICY "school_members_read_exam_subjects" ON exam_subjects
  FOR SELECT TO authenticated
  USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "school_admin_manage_exam_subjects" ON exam_subjects
  FOR ALL TO authenticated
  USING ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin())
  WITH CHECK ((is_school_admin() AND school_id = get_my_school_id()) OR is_super_admin());


-- ============================================================
-- SUPABASE REALTIME PUBLICATIONS
-- ============================================================

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    attendance,
    notifications,
    messages,
    announcements,
    results,
    fee_invoices;
COMMIT;


-- ============================================================
-- SEED DATA — Demo school + super admin
-- ============================================================

-- Note: Replace 'YOUR_SUPER_ADMIN_AUTH_UUID' with the actual UUID
-- from auth.users after creating your first user via Supabase Auth dashboard.

-- Insert demo school
INSERT INTO schools (id, name, slug, email, phone, address, city, subscription_plan, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Greenfield Academy',
  'greenfield-academy',
  'admin@greenfield.edu',
  '+254700000001',
  '123 School Road, Westlands',
  'Nairobi',
  'pro',
  true
);

-- Default academic year for demo school
INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_current)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '2025',
  '2025-01-06',
  '2025-11-28',
  true
);

-- Three terms
INSERT INTO terms (id, school_id, academic_year_id, name, start_date, end_date, is_current) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Term 1', '2025-01-06', '2025-04-04', false),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Term 2', '2025-04-28', '2025-08-01', true),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Term 3', '2025-08-25', '2025-11-28', false);

-- Classes (Grade 1 - Grade 6 for demo)
INSERT INTO classes (id, school_id, academic_year_id, name, level) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Grade 1', 1),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Grade 2', 2),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Grade 3', 3),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Grade 4', 4),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Grade 5', 5),
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Grade 6', 6);

-- Subjects
INSERT INTO subjects (school_id, class_id, name, code) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Mathematics', 'MATH1'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'English', 'ENG1'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Science', 'SCI1'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Social Studies', 'SS1'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Mathematics', 'MATH2'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'English', 'ENG2'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Science', 'SCI2'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'Mathematics', 'MATH3'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'English', 'ENG3'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'Science', 'SCI3');

-- Fee structure for demo
INSERT INTO fee_structures (school_id, academic_year_id, term_id, class_id, name, fee_type, amount, due_date) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Tuition Fee - Term 2', 'tuition', 15000, '2025-05-05'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Activity Fee - Term 2', 'other', 2000, '2025-05-05'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'Tuition Fee - Term 2', 'tuition', 16000, '2025-05-05'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'Tuition Fee - Term 2', 'tuition', 17000, '2025-05-05');

-- Sample books for library
INSERT INTO books (school_id, title, author, isbn, category, total_copies, available_copies) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Mathematics Grade 1 Textbook', 'KIE', '978-9966-33-100-1', 'Textbook', 30, 28),
  ('a0000000-0000-0000-0000-000000000001', 'English Activities Grade 1', 'KIE', '978-9966-33-101-2', 'Textbook', 30, 30),
  ('a0000000-0000-0000-0000-000000000001', 'The Lion, the Witch and the Wardrobe', 'C.S. Lewis', '978-0-06-023481-9', 'Fiction', 5, 4),
  ('a0000000-0000-0000-0000-000000000001', 'Charlotte''s Web', 'E.B. White', '978-0-06-026385-7', 'Fiction', 5, 5),
  ('a0000000-0000-0000-0000-000000000001', 'A Brief History of Time', 'Stephen Hawking', '978-0-553-38016-3', 'Science', 3, 3);


-- ============================================================
-- DONE
-- ============================================================
-- After running this SQL:
-- 1. Go to Supabase Auth → create your first user (super admin)
-- 2. INSERT into profiles with that user's UUID and role = 'super_admin'
-- 3. Start building your Next.js app!
-- ============================================================


-- ============================================================
-- ADMIN USER MANAGEMENT FUNCTIONS
-- Super admin uses these to create all other users
-- ============================================================

-- Function: Create a school admin for a specific school
CREATE OR REPLACE FUNCTION create_school_admin(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_school_id UUID,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, role, aud, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), 'authenticated', 'authenticated', NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('first_name', p_first_name, 'last_name', p_last_name)::jsonb,
    false, '', '', '', ''
  );

  -- Create profile
  INSERT INTO public.profiles (id, email, first_name, last_name, role, school_id, phone, is_active)
  VALUES (new_user_id, p_email, p_first_name, p_last_name, 'school_admin', p_school_id, p_phone, true);

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Create a teacher
CREATE OR REPLACE FUNCTION create_teacher(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_school_id UUID,
  p_phone TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_qualification TEXT DEFAULT NULL,
  p_employee_number TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, role, aud, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), 'authenticated', 'authenticated', NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('first_name', p_first_name, 'last_name', p_last_name)::jsonb,
    false, '', '', '', ''
  );

  INSERT INTO public.profiles (id, email, first_name, last_name, role, school_id, phone, is_active)
  VALUES (new_user_id, p_email, p_first_name, p_last_name, 'teacher', p_school_id, p_phone, true);

  INSERT INTO public.teachers (id, school_id, employee_number, department, qualification, joining_date, is_active)
  VALUES (new_user_id, p_school_id, p_employee_number, p_department, p_qualification, CURRENT_DATE, true);

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Create a student + parent in one go
CREATE OR REPLACE FUNCTION create_student(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_school_id UUID,
  p_class_id UUID,
  p_section_id UUID,
  p_admission_number TEXT,
  p_date_of_birth DATE DEFAULT NULL,
  p_gender gender_type DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  -- Parent details
  p_parent_email TEXT DEFAULT NULL,
  p_parent_password TEXT DEFAULT NULL,
  p_parent_first_name TEXT DEFAULT NULL,
  p_parent_last_name TEXT DEFAULT NULL,
  p_parent_phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_student_id UUID := gen_random_uuid();
  new_parent_id  UUID := gen_random_uuid();
BEGIN
  -- Create student auth user
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, role, aud, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    new_student_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), 'authenticated', 'authenticated', NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('first_name', p_first_name, 'last_name', p_last_name)::jsonb,
    false, '', '', '', ''
  );

  -- Student profile
  INSERT INTO public.profiles (id, email, first_name, last_name, role, school_id, phone, date_of_birth, gender, is_active)
  VALUES (new_student_id, p_email, p_first_name, p_last_name, 'student', p_school_id, p_phone, p_date_of_birth, p_gender, true);

  -- Student record
  INSERT INTO public.students (id, school_id, admission_number, class_id, section_id, enrollment_date, is_active)
  VALUES (new_student_id, p_school_id, p_admission_number, p_class_id, p_section_id, CURRENT_DATE, true);

  -- Create parent if provided
  IF p_parent_email IS NOT NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, role, aud, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      new_parent_id,
      '00000000-0000-0000-0000-000000000000',
      p_parent_email,
      crypt(p_parent_password, gen_salt('bf')),
      NOW(), 'authenticated', 'authenticated', NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      json_build_object('first_name', p_parent_first_name, 'last_name', p_parent_last_name)::jsonb,
      false, '', '', '', ''
    );

    INSERT INTO public.profiles (id, email, first_name, last_name, role, school_id, phone, is_active)
    VALUES (new_parent_id, p_parent_email, p_parent_first_name, p_parent_last_name, 'parent', p_school_id, p_parent_phone, true);

    INSERT INTO public.parents (id, school_id)
    VALUES (new_parent_id, p_school_id);

    -- Link parent to student
    INSERT INTO public.parent_student (parent_id, student_id, school_id, is_primary)
    VALUES (new_parent_id, new_student_id, p_school_id, true);
  END IF;

  RETURN new_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Create a parent only (link to existing student)
CREATE OR REPLACE FUNCTION create_parent(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_school_id UUID,
  p_phone TEXT DEFAULT NULL,
  p_student_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_parent_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, role, aud, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    new_parent_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), 'authenticated', 'authenticated', NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('first_name', p_first_name, 'last_name', p_last_name)::jsonb,
    false, '', '', '', ''
  );

  INSERT INTO public.profiles (id, email, first_name, last_name, role, school_id, phone, is_active)
  VALUES (new_parent_id, p_email, p_first_name, p_last_name, 'parent', p_school_id, p_phone, true);

  INSERT INTO public.parents (id, school_id)
  VALUES (new_parent_id, p_school_id);

  IF p_student_id IS NOT NULL THEN
    INSERT INTO public.parent_student (parent_id, student_id, school_id, is_primary)
    VALUES (new_parent_id, p_student_id, p_school_id, true);
  END IF;

  RETURN new_parent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- AUTO-CREATE PROFILES ON AUTH.USERS INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  meta_first_name TEXT;
  meta_last_name TEXT;
  meta_role TEXT;
  meta_phone TEXT;
BEGIN
  meta_first_name := NULLIF(NEW.raw_user_meta_data ->> 'first_name', '');
  meta_last_name  := NULLIF(NEW.raw_user_meta_data ->> 'last_name', '');
  meta_role       := NEW.raw_user_meta_data ->> 'role';
  meta_phone      := NEW.raw_user_meta_data ->> 'phone';

  INSERT INTO public.profiles (id, email, first_name, last_name, role, phone, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta_first_name, ''),
    COALESCE(meta_last_name, ''),
    COALESCE(meta_role, 'student')::user_role,
    meta_phone,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('teacher-files', 'teacher-files', true, 52428800, '{application/pdf,image/*,video/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/zip}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('application-documents', 'application-documents', true, 20971520, '{application/pdf,image/*}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('course-files', 'course-files', true, 104857600, '{application/pdf,image/*,video/*,audio/*,application/zip,application/x-zip-compressed}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('book-covers', 'book-covers', true, 5242880, '{image/*}')
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies: authenticated users can read/write to school-scoped paths
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id IN ('teacher-files', 'application-documents', 'course-files', 'book-covers'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Insert' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Authenticated Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('teacher-files', 'application-documents', 'course-files', 'book-covers') AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owner Update' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Owner Update" ON storage.objects FOR UPDATE USING (auth.uid() = owner) WITH CHECK (auth.uid() = owner);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owner Delete' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Owner Delete" ON storage.objects FOR DELETE USING (auth.uid() = owner);
  END IF;
END;
$$;


-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================

CREATE TABLE notification_preferences (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications   BOOLEAN NOT NULL DEFAULT true,
  sms_notifications     BOOLEAN NOT NULL DEFAULT false,
  push_notifications    BOOLEAN NOT NULL DEFAULT true,
  attendance_alerts     BOOLEAN NOT NULL DEFAULT true,
  fee_reminders         BOOLEAN NOT NULL DEFAULT true,
  exam_results          BOOLEAN NOT NULL DEFAULT true,
  announcements         BOOLEAN NOT NULL DEFAULT true,
  marketing_emails      BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start     TIME,
  quiet_hours_end       TIME,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notification_prefs_user UNIQUE (user_id)
);

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create notification_preferences row on profile insert
CREATE OR REPLACE FUNCTION auto_create_notification_prefs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_auto_notification_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_notification_prefs();

-- ============================================================
-- PENDING STUDENT REGISTRATIONS (self-registration flow)
-- ============================================================

CREATE TABLE IF NOT EXISTS pending_student_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  program_type    TEXT NOT NULL DEFAULT 'junior',
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pending_student_user UNIQUE (user_id),
  CONSTRAINT chk_pending_status CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT chk_program_type CHECK (program_type IN ('junior', 'major', 'bachelors'))
);

CREATE INDEX IF NOT EXISTS idx_pending_students_school ON pending_student_registrations(school_id, status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pending_students_updated_at'
  ) THEN
    CREATE TRIGGER trg_pending_students_updated_at
      BEFORE UPDATE ON pending_student_registrations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

ALTER TABLE pending_student_registrations ENABLE ROW LEVEL SECURITY;

-- Students can insert their own pending registration
CREATE POLICY "student_insert_own_pending" ON pending_student_registrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Students can read their own pending registration
CREATE POLICY "student_read_own_pending" ON pending_student_registrations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- School admins can manage pending registrations for their school
CREATE POLICY "school_admin_manage_pending" ON pending_student_registrations
  FOR ALL TO authenticated
  USING (is_school_admin() AND school_id = get_my_school_id())
  WITH CHECK (is_school_admin() AND school_id = get_my_school_id());

-- Super admin can manage all
CREATE POLICY "super_admin_all_pending" ON pending_student_registrations
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Public (unauthenticated) can read active schools for registration
CREATE POLICY "public_read_active_schools" ON schools
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- ============================================================
-- ADMISSION NUMBER GENERATOR
-- ============================================================

CREATE OR REPLACE FUNCTION generate_admission_number(p_school_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  school_prefix TEXT;
  current_year TEXT;
  next_sequence INTEGER;
  admission_number TEXT;
BEGIN
  SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 3))
  INTO school_prefix
  FROM schools WHERE id = p_school_id;

  current_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(admission_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO next_sequence
  FROM students
  WHERE school_id = p_school_id
  AND admission_number LIKE school_prefix || '-' || current_year || '-%';

  admission_number := school_prefix || '-' || current_year || '-' || LPAD(next_sequence::TEXT, 4, '0');

  RETURN admission_number;
END;
$$;

-- ============================================================
-- ONBOARDING COLUMN FOR PROFILES
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- Allow anon users to upload to application-documents (for public registration form)
CREATE POLICY "Public Upload Applications" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'application-documents'
    AND (storage.foldername(name))[1] = 'applications'
  );
