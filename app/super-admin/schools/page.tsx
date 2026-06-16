'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Plus,
  Search,
  Edit3,
  Ban,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toggleSchoolStatus, deleteSchool } from '@/lib/actions/super-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import Link from 'next/link'

const supabase = createClient()
const PAGE_SIZE = 10

async function fetchSchools(page: number, search: string, status: string) {
  let query = supabase
    .from('schools')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, count, error } = await query.range(from, to)
  if (error) throw error
  return { schools: data ?? [], total: count ?? 0 }
}

function SchoolRow({
  school,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  school: any
  onEdit: () => void
  onToggleStatus: () => void
  onDelete: () => void
}) {
  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/super-admin/schools/${school.id}`}
          className="font-medium text-edu-blue-600 hover:underline"
        >
          {school.name}
        </Link>
      </TableCell>
      <TableCell className="capitalize">{school.city || '—'}</TableCell>
      <TableCell>{school.email}</TableCell>
      <TableCell>
        <Badge
          variant={
            school.subscription_plan === 'enterprise'
              ? 'default'
              : school.subscription_plan === 'pro'
                ? 'secondary'
                : 'outline'
          }
          className="capitalize"
        >
          {school.subscription_plan}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={school.is_active ? 'default' : 'destructive'}>
          {school.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-gray-500">
        {formatDate(school.created_at)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onToggleStatus}>
            <Ban className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function EditSchoolDialog({
  school,
  open,
  onOpenChange,
}: {
  school: any
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(school.name)
  const [email, setEmail] = useState(school.email)
  const [phone, setPhone] = useState(school.phone)

  const mutation = useMutation({
    mutationFn: async () => {
      const { updateSchool } = await import('@/lib/actions/super-admin')
      return updateSchool(school.id, { name, email, phone })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      toast.success('School updated')
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit School</DialogTitle>
          <DialogDescription>Update school information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SchoolsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [editSchool, setEditSchool] = useState<any | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['schools', page, search, status],
    queryFn: () => fetchSchools(page, search, status),
  })

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string
      isActive: boolean
    }) => toggleSchoolStatus(id, !isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      toast.success('School status updated')
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteSchool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      toast.success('School deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-edu-blue-600 p-2">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
            <p className="text-sm text-gray-500">
              Manage all schools on the platform
            </p>
          </div>
        </div>
        <Link href="/super-admin/schools/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create School
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">All Schools</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search schools..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_: any, i: any) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.schools?.length ? (
                    data.schools.map((school: any) => (
                      <SchoolRow
                        key={school.id}
                        school={school}
                        onEdit={() => setEditSchool(school)}
                        onToggleStatus={() =>
                          toggleMutation.mutate({
                            id: school.id,
                            isActive: school.is_active,
                          })
                        }
                        onDelete={() => {
                          if (confirm('Delete this school?'))
                            deleteMutation.mutate(school.id)
                        }}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center text-gray-500"
                      >
                        No schools found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} ({data?.total ?? 0} total)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {editSchool && (
        <EditSchoolDialog
          school={editSchool}
          open={!!editSchool}
          onOpenChange={(open) => {
            if (!open) setEditSchool(null)
          }}
        />
      )}
    </div>
  )
}
