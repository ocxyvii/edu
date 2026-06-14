export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent'
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          phone: string | null
          avatar_url: string | null
          date_of_birth: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          postal_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          phone?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schools: {
        Row: {
          id: string
          name: string
          code: string
          logo_url: string | null
          website: string | null
          email: string
          phone: string
          address: string
          city: string
          state: string
          country: string
          postal_code: string
          established_date: string | null
          is_active: boolean
          subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise'
          max_students: number
          max_teachers: number
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          logo_url?: string | null
          website?: string | null
          email: string
          phone: string
          address: string
          city: string
          state: string
          country: string
          postal_code: string
          established_date?: string | null
          is_active?: boolean
          subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise'
          max_students?: number
          max_teachers?: number
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          logo_url?: string | null
          website?: string | null
          email?: string
          phone?: string
          address?: string
          city?: string
          state?: string
          country?: string
          postal_code?: string
          established_date?: string | null
          is_active?: boolean
          subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise'
          max_students?: number
          max_teachers?: number
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      academic_years: {
        Row: {
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
        Insert: {
          id?: string
          school_id: string
          name: string
          start_date: string
          end_date: string
          is_current?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          start_date?: string
          end_date?: string
          is_current?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      terms: {
        Row: {
          id: string
          academic_year_id: string
          name: string
          start_date: string
          end_date: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          academic_year_id: string
          name: string
          start_date: string
          end_date: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          academic_year_id?: string
          name?: string
          start_date?: string
          end_date?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          school_id: string
          name: string
          grade_level: number
          section: string | null
          room_number: string | null
          capacity: number
          academic_year_id: string
          homeroom_teacher_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          grade_level: number
          section?: string | null
          room_number?: string | null
          capacity: number
          academic_year_id: string
          homeroom_teacher_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          grade_level?: number
          section?: string | null
          room_number?: string | null
          capacity?: number
          academic_year_id?: string
          homeroom_teacher_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          user_id: string
          school_id: string
          student_id: string
          enrollment_date: string
          admission_number: string
          class_id: string | null
          academic_year_id: string
          guardian_id: string | null
          is_active: boolean
          status: 'enrolled' | 'graduated' | 'transferred' | 'suspended' | 'withdrawn'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          school_id: string
          student_id: string
          enrollment_date: string
          admission_number: string
          class_id?: string | null
          academic_year_id: string
          guardian_id?: string | null
          is_active?: boolean
          status?: 'enrolled' | 'graduated' | 'transferred' | 'suspended' | 'withdrawn'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          school_id?: string
          student_id?: string
          enrollment_date?: string
          admission_number?: string
          class_id?: string | null
          academic_year_id?: string
          guardian_id?: string | null
          is_active?: boolean
          status?: 'enrolled' | 'graduated' | 'transferred' | 'suspended' | 'withdrawn'
          created_at?: string
          updated_at?: string
        }
      }
      teachers: {
        Row: {
          id: string
          user_id: string
          school_id: string
          employee_id: string
          hire_date: string
          designation: string
          qualification: string | null
          specialization: string | null
          experience_years: number | null
          salary: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          school_id: string
          employee_id: string
          hire_date: string
          designation: string
          qualification?: string | null
          specialization?: string | null
          experience_years?: number | null
          salary?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          school_id?: string
          employee_id?: string
          hire_date?: string
          designation?: string
          qualification?: string | null
          specialization?: string | null
          experience_years?: number | null
          salary?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      guardians: {
        Row: {
          id: string
          user_id: string
          school_id: string
          relationship: 'father' | 'mother' | 'guardian' | 'other'
          occupation: string | null
          income_level: string | null
          is_primary_contact: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          school_id: string
          relationship: 'father' | 'mother' | 'guardian' | 'other'
          occupation?: string | null
          income_level?: string | null
          is_primary_contact?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          school_id?: string
          relationship?: 'father' | 'mother' | 'guardian' | 'other'
          occupation?: string | null
          income_level?: string | null
          is_primary_contact?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          school_id: string
          name: string
          code: string
          description: string | null
          credits: number
          is_core: boolean
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          code: string
          description?: string | null
          credits: number
          is_core?: boolean
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          code?: string
          description?: string | null
          credits?: number
          is_core?: boolean
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      class_subjects: {
        Row: {
          id: string
          class_id: string
          subject_id: string
          teacher_id: string
          academic_year_id: string
          periods_per_week: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_id: string
          subject_id: string
          teacher_id: string
          academic_year_id: string
          periods_per_week: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          subject_id?: string
          teacher_id?: string
          academic_year_id?: string
          periods_per_week?: number
          created_at?: string
          updated_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          student_id: string
          class_id: string
          date: string
          status: 'present' | 'absent' | 'late' | 'excused' | 'holiday'
          check_in_time: string | null
          check_out_time: string | null
          notes: string | null
          marked_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          class_id: string
          date: string
          status: 'present' | 'absent' | 'late' | 'excused' | 'holiday'
          check_in_time?: string | null
          check_out_time?: string | null
          notes?: string | null
          marked_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          class_id?: string
          date?: string
          status?: 'present' | 'absent' | 'late' | 'excused' | 'holiday'
          check_in_time?: string | null
          check_out_time?: string | null
          notes?: string | null
          marked_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      exams: {
        Row: {
          id: string
          school_id: string
          class_id: string
          subject_id: string
          term_id: string
          name: string
          type: 'quiz' | 'test' | 'mid_term' | 'final' | 'assignment' | 'project'
          date: string
          start_time: string | null
          end_time: string | null
          duration_minutes: number | null
          total_marks: number
          passing_marks: number
          weightage: number
          description: string | null
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          class_id: string
          subject_id: string
          term_id: string
          name: string
          type: 'quiz' | 'test' | 'mid_term' | 'final' | 'assignment' | 'project'
          date: string
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
          total_marks: number
          passing_marks: number
          weightage: number
          description?: string | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          class_id?: string
          subject_id?: string
          term_id?: string
          name?: string
          type?: 'quiz' | 'test' | 'mid_term' | 'final' | 'assignment' | 'project'
          date?: string
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
          total_marks?: number
          passing_marks?: number
          weightage?: number
          description?: string | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      exam_results: {
        Row: {
          id: string
          exam_id: string
          student_id: string
          marks_obtained: number
          percentage: number
          grade: string
          gpa: number
          remarks: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          student_id: string
          marks_obtained: number
          percentage: number
          grade: string
          gpa: number
          remarks?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          student_id?: string
          marks_obtained?: number
          percentage?: number
          grade?: string
          gpa?: number
          remarks?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fees: {
        Row: {
          id: string
          school_id: string
          name: string
          type: 'tuition' | 'transport' | 'library' | 'lab' | 'sports' | 'other'
          amount: number
          currency: string
          frequency: 'monthly' | 'quarterly' | 'yearly' | 'one_time'
          due_day: number | null
          is_mandatory: boolean
          is_active: boolean
          academic_year_id: string
          applicable_classes: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          type: 'tuition' | 'transport' | 'library' | 'lab' | 'sports' | 'other'
          amount: number
          currency: string
          frequency: 'monthly' | 'quarterly' | 'yearly' | 'one_time'
          due_day?: number | null
          is_mandatory?: boolean
          is_active?: boolean
          academic_year_id: string
          applicable_classes: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          type?: 'tuition' | 'transport' | 'library' | 'lab' | 'sports' | 'other'
          amount?: number
          currency?: string
          frequency?: 'monthly' | 'quarterly' | 'yearly' | 'one_time'
          due_day?: number | null
          is_mandatory?: boolean
          is_active?: boolean
          academic_year_id?: string
          applicable_classes?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      fee_payments: {
        Row: {
          id: string
          student_id: string
          fee_id: string
          amount: number
          currency: string
          payment_date: string
          payment_method: 'cash' | 'card' | 'bank_transfer' | 'online' | 'check'
          transaction_id: string | null
          receipt_number: string
          status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled'
          late_fee: number | null
          discount: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          fee_id: string
          amount: number
          currency: string
          payment_date: string
          payment_method: 'cash' | 'card' | 'bank_transfer' | 'online' | 'check'
          transaction_id?: string | null
          receipt_number: string
          status?: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled'
          late_fee?: number | null
          discount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          fee_id?: string
          amount?: number
          currency?: string
          payment_date?: string
          payment_method?: 'cash' | 'card' | 'bank_transfer' | 'online' | 'check'
          transaction_id?: string | null
          receipt_number?: string
          status?: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled'
          late_fee?: number | null
          discount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          school_id: string
          title: string
          content: string
          type: 'general' | 'urgent' | 'event' | 'holiday' | 'exam'
          target_audience: string[]
          class_ids: string[] | null
          publish_date: string
          expiry_date: string | null
          is_published: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          title: string
          content: string
          type: 'general' | 'urgent' | 'event' | 'holiday' | 'exam'
          target_audience: string[]
          class_ids?: string[] | null
          publish_date: string
          expiry_date?: string | null
          is_published?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          title?: string
          content?: string
          type?: 'general' | 'urgent' | 'event' | 'holiday' | 'exam'
          target_audience?: string[]
          class_ids?: string[] | null
          publish_date?: string
          expiry_date?: string | null
          is_published?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          school_id: string
          title: string
          description: string | null
          type: 'academic' | 'sports' | 'cultural' | 'holiday' | 'meeting' | 'exam' | 'other'
          start_date: string
          end_date: string
          start_time: string | null
          end_time: string | null
          location: string | null
          is_all_day: boolean
          is_recurring: boolean
          recurrence_pattern: string | null
          target_audience: string[]
          class_ids: string[] | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          title: string
          description?: string | null
          type: 'academic' | 'sports' | 'cultural' | 'holiday' | 'meeting' | 'exam' | 'other'
          start_date: string
          end_date: string
          start_time?: string | null
          end_time?: string | null
          location?: string | null
          is_all_day?: boolean
          is_recurring?: boolean
          recurrence_pattern?: string | null
          target_audience: string[]
          class_ids?: string[] | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          title?: string
          description?: string | null
          type?: 'academic' | 'sports' | 'cultural' | 'holiday' | 'meeting' | 'exam' | 'other'
          start_date?: string
          end_date?: string
          start_time?: string | null
          end_time?: string | null
          location?: string | null
          is_all_day?: boolean
          is_recurring?: boolean
          recurrence_pattern?: string | null
          target_audience?: string[]
          class_ids?: string[] | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error'
          is_read: boolean
          action_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error'
          is_read?: boolean
          action_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'success' | 'warning' | 'error'
          is_read?: boolean
          action_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      books: {
        Row: {
          id: string
          school_id: string
          title: string
          author: string | null
          isbn: string | null
          publisher: string | null
          publish_year: number | null
          category: string | null
          cover_url: string | null
          total_copies: number
          available_copies: number
          shelf_location: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          title: string
          author?: string | null
          isbn?: string | null
          publisher?: string | null
          publish_year?: number | null
          category?: string | null
          cover_url?: string | null
          total_copies?: number
          available_copies?: number
          shelf_location?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          title?: string
          author?: string | null
          isbn?: string | null
          publisher?: string | null
          publish_year?: number | null
          category?: string | null
          cover_url?: string | null
          total_copies?: number
          available_copies?: number
          shelf_location?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      book_issues: {
        Row: {
          id: string
          school_id: string
          book_id: string
          member_id: string
          member_type: string
          issue_date: string
          due_date: string
          return_date: string | null
          fine_amount: number
          fine_paid: boolean
          status: string
          issued_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          book_id: string
          member_id: string
          member_type?: string
          issue_date?: string
          due_date: string
          return_date?: string | null
          fine_amount?: number
          fine_paid?: boolean
          status?: string
          issued_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          book_id?: string
          member_id?: string
          member_type?: string
          issue_date?: string
          due_date?: string
          return_date?: string | null
          fine_amount?: number
          fine_paid?: boolean
          status?: string
          issued_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          school_id: string
          employee_number: string | null
          department: string | null
          position: string | null
          contract_type: string
          basic_salary: number
          allowances: any
          bank_name: string | null
          bank_account: string | null
          joining_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          employee_number?: string | null
          department?: string | null
          position?: string | null
          contract_type?: string
          basic_salary?: number
          allowances?: any
          bank_name?: string | null
          bank_account?: string | null
          joining_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          employee_number?: string | null
          department?: string | null
          position?: string | null
          contract_type?: string
          basic_salary?: number
          allowances?: any
          bank_name?: string | null
          bank_account?: string | null
          joining_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          school_id: string
          employee_id: string
          leave_type: string
          start_date: string
          end_date: string
          days: number
          reason: string
          status: string
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          employee_id: string
          leave_type?: string
          start_date: string
          end_date: string
          days: number
          reason: string
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          employee_id?: string
          leave_type?: string
          start_date?: string
          end_date?: string
          days?: number
          reason?: string
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payroll: {
        Row: {
          id: string
          school_id: string
          employee_id: string
          month: number
          year: number
          basic_salary: number
          allowances: any
          deductions: any
          gross_salary: number
          net_salary: number
          paid_date: string | null
          status: string
          notes: string | null
          processed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          employee_id: string
          month: number
          year: number
          basic_salary: number
          allowances?: any
          deductions?: any
          gross_salary: number
          net_salary: number
          paid_date?: string | null
          status?: string
          notes?: string | null
          processed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          employee_id?: string
          month?: number
          year?: number
          basic_salary?: number
          allowances?: any
          deductions?: any
          gross_salary?: number
          net_salary?: number
          paid_date?: string | null
          status?: string
          notes?: string | null
          processed_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
