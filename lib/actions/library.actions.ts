'use server'

import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const getSchoolId = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase.from('profiles').select('school_id, role').eq('id', user.id).single()
  if (!data?.school_id) throw new Error('No school assigned')
  return { schoolId: data.school_id as string, userId: user.id, role: data.role }
}

const BookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().optional(),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  publish_year: z.coerce.number().int().min(1000).max(9999).optional(),
  category: z.string().optional(),
  cover_url: z.string().optional(),
  total_copies: z.coerce.number().int().min(1, 'At least 1 copy required'),
  shelf_location: z.string().optional(),
  description: z.string().optional(),
})

const IssueSchema = z.object({
  book_id: z.string().uuid(),
  member_id: z.string().uuid(),
  member_type: z.enum(['student', 'teacher', 'staff']),
  due_date: z.string().min(1, 'Due date required'),
  notes: z.string().optional(),
})

export async function addBook(data: z.infer<typeof BookSchema>) {
  const parsed = BookSchema.parse(data)
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  const { error } = await supabase.from('books').insert({
    ...parsed,
    school_id: schoolId,
    available_copies: parsed.total_copies,
    author: parsed.author ?? null,
    isbn: parsed.isbn ?? null,
    publisher: parsed.publisher ?? null,
    publish_year: parsed.publish_year ?? null,
    category: parsed.category ?? null,
    cover_url: parsed.cover_url ?? null,
    shelf_location: parsed.shelf_location ?? null,
    description: parsed.description ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/library')
}

export async function updateBook(id: string, data: z.infer<typeof BookSchema>) {
  const parsed = BookSchema.parse(data)
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('books').select('total_copies, available_copies').eq('id', id).eq('school_id', schoolId).single()
  if (!current) throw new Error('Book not found')

  const diff = parsed.total_copies - current.total_copies
  const newAvailable = Math.max(0, current.available_copies + diff)

  const { error } = await supabase.from('books').update({
    ...parsed,
    available_copies: newAvailable,
    author: parsed.author ?? null,
    isbn: parsed.isbn ?? null,
    publisher: parsed.publisher ?? null,
    publish_year: parsed.publish_year ?? null,
    category: parsed.category ?? null,
    cover_url: parsed.cover_url ?? null,
    shelf_location: parsed.shelf_location ?? null,
    description: parsed.description ?? null,
  }).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/library')
}

export async function deleteBook(id: string) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { error } = await supabase.from('books').update({ is_active: false }).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/library')
}

export async function getBooks(filters?: {
  category?: string
  availability?: string
  search?: string
}) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  let query = supabase
    .from('books')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('title')

  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.availability === 'available') query = query.gt('available_copies', 0)
  if (filters?.availability === 'unavailable') query = query.eq('available_copies', 0)
  if (filters?.search) {
    const s = `%${filters.search}%`
    query = query.or(`title.ilike.${s},author.ilike.${s},isbn.ilike.${s}`)
  }

  const { data } = await query
  return data ?? []
}

export async function getBook(id: string) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { data } = await supabase.from('books').select('*').eq('id', id).eq('school_id', schoolId).single()
  return data
}

export async function getBookCategories() {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { data } = await supabase
    .from('books')
    .select('category')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .not('category', 'is', null)
  const categories = [...new Set(data?.map(b => b.category).filter(Boolean) as string[])]
  return categories.sort()
}

export async function issueBook(data: z.infer<typeof IssueSchema>) {
  const parsed = IssueSchema.parse(data)
  const { schoolId, userId } = await getSchoolId()
  const supabase = await createClient()

  const { data: book } = await supabase
    .from('books').select('id, title, available_copies').eq('id', parsed.book_id).eq('school_id', schoolId).single()
  if (!book) throw new Error('Book not found')
  if (book.available_copies <= 0) throw new Error('No copies available')

  const { error } = await supabase.from('book_issues').insert({
    school_id: schoolId,
    book_id: parsed.book_id,
    member_id: parsed.member_id,
    member_type: parsed.member_type,
    due_date: parsed.due_date,
    issued_by: userId,
    notes: parsed.notes ?? null,
  })
  if (error) {
    if (error.message.includes('No copies available')) throw new Error('No copies available')
    throw new Error(error.message)
  }
  revalidatePath('/school-admin/library')
}

export async function returnBook(issueId: string, fineAmount?: number) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  const { data: issue } = await supabase
    .from('book_issues').select('*').eq('id', issueId).eq('school_id', schoolId).single()
  if (!issue) throw new Error('Issue not found')
  if (issue.return_date) throw new Error('Book already returned')

  const { error } = await supabase.from('book_issues').update({
    return_date: new Date().toISOString().split('T')[0],
    fine_amount: fineAmount ?? 0,
    status: fineAmount && fineAmount > 0 ? 'returned' : 'returned',
  }).eq('id', issueId).eq('school_id', schoolId)
  if (error) throw new Error(error.message)

  revalidatePath('/school-admin/library')
}

export async function calculateFine(issueId: string) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  const { data: issue } = await supabase
    .from('book_issues').select('*').eq('id', issueId).eq('school_id', schoolId).single()
  if (!issue) throw new Error('Issue not found')

  const dueDate = new Date(issue.due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (today <= dueDate) return { fine: 0, daysOverdue: 0 }

  const diffTime = today.getTime() - dueDate.getTime()
  const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const { data: school } = await supabase.from('schools').select('settings').eq('id', schoolId).single()
  const finePerDay = (school?.settings as any)?.library_fine_per_day ?? 5

  return { fine: daysOverdue * finePerDay, daysOverdue, finePerDay }
}

export async function getBookIssues(filters?: {
  status?: string
  member_id?: string
  book_id?: string
  overdue_only?: boolean
}) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  let query = supabase
    .from('book_issues')
    .select('*, books(title, author, isbn, category), profiles!member_id(first_name, last_name)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.member_id) query = query.eq('member_id', filters.member_id)
  if (filters?.book_id) query = query.eq('book_id', filters.book_id)
  if (filters?.overdue_only) {
    const today = new Date().toISOString().split('T')[0]
    query = query.lt('due_date', today).in('status', ['issued', 'overdue'])
  }

  const { data } = await query
  return data ?? []
}

export async function getBookIssue(issueId: string) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { data } = await supabase
    .from('book_issues')
    .select('*, books(*), profiles!member_id(first_name, last_name, email, phone)')
    .eq('id', issueId)
    .eq('school_id', schoolId)
    .single()
  return data
}

export async function getOverdueIssues() {
  return getBookIssues({ overdue_only: true })
}

export async function getMemberHistory(memberId: string) {
  return getBookIssues({ member_id: memberId })
}

export async function getMembers(search: string) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  const s = `%${search}%`
  const [students, teachers] = await Promise.all([
    supabase
      .from('students')
      .select('id, profiles!inner(id, first_name, last_name, email), admission_number')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .or(`profiles.first_name.ilike.${s},profiles.last_name.ilike.${s},admission_number.ilike.${s}`)
      .limit(10),
    supabase
      .from('teachers')
      .select('id, profiles!inner(id, first_name, last_name, email), employee_number')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .or(`profiles.first_name.ilike.${s},profiles.last_name.ilike.${s},employee_number.ilike.${s}`)
      .limit(10),
  ])

  const results: { id: string; name: string; type: 'student' | 'teacher'; identifier: string }[] = []

  students.data?.forEach(s => {
    results.push({
      id: s.id,
      name: `${(s.profiles as any)?.first_name ?? ''} ${(s.profiles as any)?.last_name ?? ''}`.trim(),
      type: 'student',
      identifier: s.admission_number ?? '',
    })
  })

  teachers.data?.forEach(t => {
    results.push({
      id: t.id,
      name: `${(t.profiles as any)?.first_name ?? ''} ${(t.profiles as any)?.last_name ?? ''}`.trim(),
      type: 'teacher',
      identifier: t.employee_number ?? '',
    })
  })

  return results
}

export async function getLibraryStats() {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  const { count: totalBooks } = await supabase
    .from('books').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true)

  const { count: issuedBooks } = await supabase
    .from('book_issues').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).in('status', ['issued', 'overdue'])

  const { count: overdueBooks } = await supabase
    .from('book_issues').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).in('status', ['issued', 'overdue'])
    .lt('due_date', new Date().toISOString().split('T')[0])

  const { data: fineData } = await supabase
    .from('book_issues').select('fine_amount').eq('school_id', schoolId).eq('status', 'returned')
  const totalFinesCollected = fineData?.reduce((s, i) => s + Number(i.fine_amount), 0) ?? 0

  const { data: borrowedData } = await supabase
    .from('book_issues')
    .select('book_id, books!inner(title, author)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(500)

  const bookCounts: Record<string, { title: string; author: string; count: number }> = {}
  borrowedData?.forEach(issue => {
    const bid = issue.book_id
    if (!bookCounts[bid]) {
      bookCounts[bid] = { title: (issue.books as any)?.title ?? 'Unknown', author: (issue.books as any)?.author ?? '', count: 0 }
    }
    bookCounts[bid].count++
  })
  const mostBorrowed = Object.values(bookCounts).sort((a, b) => b.count - a.count).slice(0, 10)

  const { data: activeMembers } = await supabase
    .from('book_issues')
    .select('member_id')
    .eq('school_id', schoolId)
    .in('status', ['issued', 'overdue'])

  const uniqueMemberIds = new Set(activeMembers?.map(m => m.member_id) ?? [])

  const { data: categoryData } = await supabase
    .from('books')
    .select('category')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .not('category', 'is', null)

  const categoryCounts: Record<string, number> = {}
  categoryData?.forEach(b => {
    const cat = b.category ?? 'Uncategorized'
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
  })
  const booksByCategory = Object.entries(categoryCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

  return {
    totalBooks: totalBooks ?? 0,
    issuedBooks: issuedBooks ?? 0,
    overdueBooks: overdueBooks ?? 0,
    availableBooks: (totalBooks ?? 0) - (issuedBooks ?? 0),
    totalFinesCollected,
    activeMembers: uniqueMemberIds.size,
    mostBorrowed,
    booksByCategory,
  }
}

export async function uploadBookCover(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')

  const supabase = await createClient()
  const ext = file.name.split('.').pop()
  const fileName = `book-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from('book-covers')
    .upload(fileName, file, { upsert: false })

  if (error) throw new Error(error.message)

  const { data: { publicUrl } } = supabase.storage.from('book-covers').getPublicUrl(data.path)
  return publicUrl
}
