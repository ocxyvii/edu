// User Roles
export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent'

// User Profile
export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
  profile?: UserProfile
}

export interface UserProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
  date_of_birth?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  created_at: string
  updated_at: string
}

// School
export interface School {
  id: string
  name: string
  code: string
  logo_url?: string
  website?: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  postal_code: string
  established_date?: string
  is_active: boolean
  subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise'
  max_students: number
  max_teachers: number
  settings: SchoolSettings
  created_at: string
  updated_at: string
}

export interface SchoolSettings {
  academic_year_start_month: number
  academic_year_end_month: number
  grading_scale: GradingScale[]
  attendance_policy: AttendancePolicy
  fee_structure: FeeStructure
}

export interface GradingScale {
  grade: string
  min_score: number
  max_score: number
  gpa: number
  description?: string
}

export interface AttendancePolicy {
  required_attendance_percentage: number
  allowed_absences_per_term: number
  late_arrival_threshold_minutes: number
}

export interface FeeStructure {
  currency: string
  late_fee_percentage: number
  payment_methods: string[]
}

// Academic Year
export interface AcademicYear {
  id: string
  school_id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

// Term
export interface Term {
  id: string
  academic_year_id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Class
export interface Class {
  id: string
  school_id: string
  name: string
  grade_level: number
  section?: string
  room_number?: string
  capacity: number
  academic_year_id: string
  homeroom_teacher_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Student
export interface Student {
  id: string
  user_id: string
  school_id: string
  student_id: string
  enrollment_date: string
  admission_number: string
  class_id?: string
  academic_year_id: string
  guardian_id?: string
  is_active: boolean
  status: 'enrolled' | 'graduated' | 'transferred' | 'suspended' | 'withdrawn'
  created_at: string
  updated_at: string
  profile?: UserProfile
  class?: Class
  guardian?: Guardian
}

// Teacher
export interface Teacher {
  id: string
  user_id: string
  school_id: string
  employee_id: string
  hire_date: string
  designation: string
  qualification?: string
  specialization?: string
  experience_years?: number
  salary?: number
  is_active: boolean
  created_at: string
  updated_at: string
  profile?: UserProfile
}

// HR & Payroll
export type ContractType = 'permanent' | 'contract' | 'part_time' | 'intern'
export type LeaveType = 'annual' | 'sick' | 'maternity' | 'paternity' | 'unpaid' | 'emergency'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type PayrollStatus = 'pending' | 'processed' | 'paid'

export interface Employee {
  id: string
  school_id: string
  employee_number?: string
  department?: string
  position?: string
  contract_type: ContractType
  basic_salary: number
  allowances: Record<string, number>
  bank_name?: string
  bank_account?: string
  joining_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
  profile?: UserProfile
}

export interface LeaveRequest {
  id: string
  school_id: string
  employee_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  days: number
  reason: string
  status: LeaveStatus
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  employee?: Employee
  profiles?: UserProfile
}

export interface Payroll {
  id: string
  school_id: string
  employee_id: string
  month: number
  year: number
  basic_salary: number
  allowances: Record<string, number>
  deductions: Record<string, number>
  gross_salary: number
  net_salary: number
  paid_date?: string
  status: PayrollStatus
  notes?: string
  processed_by?: string
  created_at: string
  updated_at: string
  employee?: Employee
  profiles?: UserProfile
}

export interface PayrollSummary {
  totalEmployees: number
  totalGross: number
  totalNet: number
  totalDeductions: number
  totalAllowances: number
  paidCount: number
  pendingCount: number
}

export interface LeaveBalance {
  leave_type: LeaveType
  entitled: number
  used: number
  remaining: number
}

// Parent/Guardian
export interface Guardian {
  id: string
  user_id: string
  school_id: string
  relationship: 'father' | 'mother' | 'guardian' | 'other'
  occupation?: string
  income_level?: string
  is_primary_contact: boolean
  created_at: string
  updated_at: string
  profile?: UserProfile
}

// Subject
export interface Subject {
  id: string
  school_id: string
  name: string
  code: string
  description?: string
  credits: number
  is_core: boolean
  color?: string
  created_at: string
  updated_at: string
}

// Class Subject Assignment
export interface ClassSubject {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
  academic_year_id: string
  periods_per_week: number
  created_at: string
  updated_at: string
  subject?: Subject
  teacher?: Teacher
}

// Attendance
export interface Attendance {
  id: string
  student_id: string
  class_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused' | 'holiday'
  check_in_time?: string
  check_out_time?: string
  notes?: string
  marked_by: string
  created_at: string
  updated_at: string
}

// Exam
export interface Exam {
  id: string
  school_id: string
  class_id: string
  subject_id: string
  term_id: string
  name: string
  type: 'quiz' | 'test' | 'mid_term' | 'final' | 'assignment' | 'project'
  date: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  total_marks: number
  passing_marks: number
  weightage: number
  description?: string
  is_published: boolean
  created_at: string
  updated_at: string
}

// Exam Result
export interface ExamResult {
  id: string
  exam_id: string
  student_id: string
  marks_obtained: number
  percentage: number
  grade: string
  gpa: number
  remarks?: string
  created_at: string
  updated_at: string
}

// Grade
export interface Grade {
  id: string
  student_id: string
  class_id: string
  subject_id: string
  term_id: string
  academic_year_id: string
  midterm_marks: number
  final_marks: number
  assignment_marks: number
  total_marks: number
  percentage: number
  grade: string
  gpa: number
  rank?: number
  created_at: string
  updated_at: string
}

// Fee
export interface Fee {
  id: string
  school_id: string
  name: string
  type: 'tuition' | 'transport' | 'library' | 'lab' | 'sports' | 'other'
  amount: number
  currency: string
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'one_time'
  due_day?: number
  is_mandatory: boolean
  is_active: boolean
  academic_year_id: string
  applicable_classes: string[]
  created_at: string
  updated_at: string
}

// Fee Payment
export interface FeePayment {
  id: string
  student_id: string
  fee_id: string
  amount: number
  currency: string
  payment_date: string
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'online' | 'check'
  transaction_id?: string
  receipt_number: string
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  late_fee?: number
  discount?: number
  notes?: string
  created_at: string
  updated_at: string
}

// Timetable
export interface Timetable {
  id: string
  class_id: string
  academic_year_id: string
  term_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TimetableEntry {
  id: string
  timetable_id: string
  day_of_week: number
  period: number
  subject_id: string
  teacher_id: string
  room_number?: string
  start_time: string
  end_time: string
  created_at: string
  updated_at: string
}

// Announcement
export interface Announcement {
  id: string
  school_id: string
  title: string
  content: string
  type: 'general' | 'urgent' | 'event' | 'holiday' | 'exam'
  target_audience: UserRole[]
  class_ids?: string[]
  publish_date: string
  expiry_date?: string
  is_published: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// Event
export interface Event {
  id: string
  school_id: string
  title: string
  description?: string
  type: 'academic' | 'sports' | 'cultural' | 'holiday' | 'meeting' | 'exam' | 'other'
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  location?: string
  is_all_day: boolean
  is_recurring: boolean
  recurrence_pattern?: string
  target_audience: UserRole[]
  class_ids?: string[]
  created_by: string
  created_at: string
  updated_at: string
}

// Assignment
export interface Assignment {
  id: string
  school_id: string
  class_id: string
  subject_id: string
  teacher_id: string
  title: string
  description?: string
  type: 'homework' | 'project' | 'lab' | 'other'
  due_date: string
  due_time?: string
  total_marks: number
  attachments?: string[]
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  submitted_date: string
  submitted_time?: string
  attachments?: string[]
  marks_obtained?: number
  remarks?: string
  status: 'pending' | 'submitted' | 'graded' | 'late'
  created_at: string
  updated_at: string
}

// Library
export interface Book {
  id: string
  school_id: string
  title: string
  author: string
  isbn?: string
  publisher?: string
  publish_year?: number
  category: string
  cover_url?: string
  total_copies: number
  available_copies: number
  shelf_location?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type BookIssueStatus = 'issued' | 'returned' | 'overdue' | 'lost'
export type MemberType = 'student' | 'teacher' | 'staff'

export interface BookIssue {
  id: string
  school_id: string
  book_id: string
  member_id: string
  member_type: MemberType
  issue_date: string
  due_date: string
  return_date?: string
  fine_amount: number
  fine_paid: boolean
  status: BookIssueStatus
  issued_by?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Transport
export interface TransportRoute {
  id: string
  school_id: string
  name: string
  route_number: string
  description?: string
  driver_name: string
  driver_phone: string
  vehicle_number: string
  vehicle_type: string
  capacity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TransportStop {
  id: string
  route_id: string
  name: string
  location: string
  stop_number: number
  arrival_time: string
  departure_time: string
  fee: number
  created_at: string
  updated_at: string
}

export interface TransportAssignment {
  id: string
  student_id: string
  route_id: string
  stop_id: string
  academic_year_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Report Card
export interface ReportCard {
  id: string
  student_id: string
  class_id: string
  term_id: string
  academic_year_id: string
  total_marks: number
  obtained_marks: number
  percentage: number
  grade: string
  gpa: number
  class_rank?: number
  section_rank?: number
  attendance_percentage: number
  remarks?: string
  generated_by: string
  generated_date: string
  created_at: string
  updated_at: string
}

// Notification
export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  action_url?: string
  created_at: string
  updated_at: string
}

// Activity Log
export interface ActivityLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Dashboard Stats
export interface DashboardStats {
  total_students: number
  total_teachers: number
  total_classes: number
  total_subjects: number
  attendance_rate: number
  fee_collection_rate: number
  upcoming_events: number
  pending_assignments: number
}

// Form Types
export interface LoginFormData {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
}

export interface SchoolFormData {
  name: string
  code: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  postal_code: string
  website?: string
}

export interface StudentFormData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  dateOfBirth?: string
  admissionNumber: string
  classId?: string
  guardianId?: string
}

export interface TeacherFormData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  designation: string
  qualification?: string
  specialization?: string
  experienceYears?: number
}

export interface ClassFormData {
  name: string
  gradeLevel: number
  section?: string
  roomNumber?: string
  capacity: number
  homeroomTeacherId?: string
}

export interface SubjectFormData {
  name: string
  code: string
  description?: string
  credits: number
  isCore: boolean
  color?: string
}

export interface ExamFormData {
  name: string
  type: 'quiz' | 'test' | 'mid_term' | 'final' | 'assignment' | 'project'
  date: string
  startTime?: string
  endTime?: string
  totalMarks: number
  passingMarks: number
  weightage: number
  description?: string
}

// API Response Types
export interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Table Column Types
export interface TableColumn<T> {
  key: keyof T
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: T) => any
}

// Filter Types
export interface FilterOption {
  label: string
  value: string
}

export interface DateRange {
  from: Date
  to: Date
}

export type ApplicationStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'waitlisted' | 'enrolled'

export interface Application {
  id: string
  school_id: string
  student_name: string
  date_of_birth: string | null
  gender: string | null
  applying_for_class: string
  parent_name: string
  parent_email: string | null
  parent_phone: string
  address: string | null
  previous_school: string | null
  documents: { name: string; url: string; type: string }[]
  status: ApplicationStatus
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  enrolled_student_id: string | null
  created_at: string
  updated_at: string
}
