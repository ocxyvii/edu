export interface ApplicationFormData {
  schoolId: string
  schoolName: string
  classId: string
  className: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  nationalId: string
  phone: string
  address: string
  previousSchool: string
  parentName: string
  parentRelationship: 'father' | 'mother' | 'guardian'
  parentPhone: string
  parentEmail: string
  parentNationalId: string
  parentOccupation: string
  documents: ApplicationDocument[]
}

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
  documents: ApplicationDocument[]
  status: ApplicationStatusValue
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  enrolled_student_id: string | null
  created_at: string
  updated_at: string
}

export type ApplicationStatusValue = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'waitlisted' | 'enrolled'

export interface ApplicationDocument {
  type: 'transcript' | 'birth_certificate' | 'passport_photo' | 'other'
  url: string
  name: string
  size: number
}

export interface EnrollmentData {
  classId: string
  sectionId: string | null
  enrollmentDate: string
  admissionNumber: string
  studentPassword: string
  parentPassword: string
}

export interface EnrollmentResult {
  admissionNumber: string
  studentEmail: string
  studentPassword: string
  parentEmail: string
  parentPassword: string
  parentIsNew: boolean
  parentAccountNote: string
  studentName: string
  sectionName: string | null
  className: string | null
}

export interface SchoolOption {
  id: string
  name: string
  slug: string
  logo_url: string | null
  city?: string | null
}

export interface AcademicYearOption {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

export interface ClassOption {
  id: string
  name: string
  level: number | null
  description?: string | null
  sections: { id: string; name: string; capacity: number | null }[]
}
