import { create } from 'zustand'
import { School } from '@/types'

interface SchoolState {
  currentSchool: School | null
  schools: School[]
  setCurrentSchool: (school: School | null) => void
  setSchools: (schools: School[]) => void
  addSchool: (school: School) => void
  updateSchool: (id: string, updates: Partial<School>) => void
  removeSchool: (id: string) => void
}

export const useSchoolStore = create<SchoolState>((set) => ({
  currentSchool: null,
  schools: [],
  setCurrentSchool: (school) => set({ currentSchool: school }),
  setSchools: (schools) => set({ schools }),
  addSchool: (school) => set((state) => ({ schools: [...state.schools, school] })),
  updateSchool: (id, updates) =>
    set((state) => ({
      schools: state.schools.map((school) =>
        school.id === id ? { ...school, ...updates } : school
      ),
      currentSchool:
        state.currentSchool?.id === id
          ? { ...state.currentSchool, ...updates }
          : state.currentSchool,
    })),
  removeSchool: (id) =>
    set((state) => ({
      schools: state.schools.filter((school) => school.id !== id),
      currentSchool: state.currentSchool?.id === id ? null : state.currentSchool,
    })),
}))
