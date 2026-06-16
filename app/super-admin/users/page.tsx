'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Users, Mail, Shield, Calendar, Search, Loader2, Ban, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

const supabase = createClient()

export default function SuperAdminUsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showDetail, setShowDetail] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ['super-admin-users'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*, schools!inner(name)')
        .order('created_at', { ascending: false })
        .limit(200)

      return (profiles ?? []).map((p: any) => ({
        ...p,
        school_name: p.schools?.name ?? 'N/A',
      }))
    },
  })

  const filtered = users?.filter((u: any) =>
    !search || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const roleColors: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-700',
    school_admin: 'bg-blue-100 text-blue-700',
    teacher: 'bg-purple-100 text-purple-700',
    student: 'bg-green-100 text-green-700',
    parent: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Manage platform users across all schools" />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
        </div>
        <Badge variant="secondary" className="text-xs">{filtered?.length ?? 0} users</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(8)].map((_: any, i: any) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : !filtered?.length ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No users found.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">User</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Role</th>
                  <th className="text-left py-3 px-4 font-medium">School</th>
                  <th className="text-left py-3 px-4 font-medium">Joined</th>
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => (
                  <tr key={u.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => { setSelectedUser(u); setShowDetail(true) }}>
                    <td className="py-3 px-4 font-medium">{u.first_name} {u.last_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge className={`${roleColors[u.role] ?? ''} capitalize`} variant="secondary">{u.role?.replace('_', ' ')}</Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{u.school_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '-'}</td>
                    <td className="py-3 px-4 text-center">
                      {u.is_active !== false ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <Ban className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-edu-blue-600 text-white font-bold text-lg">
                  {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                </div>
                <div>
                  <p className="font-medium">{selectedUser.first_name} {selectedUser.last_name}</p>
                  <Badge className={`${roleColors[selectedUser.role] ?? ''} capitalize text-xs`} variant="secondary">{selectedUser.role?.replace('_', ' ')}</Badge>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{selectedUser.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{selectedUser.phone ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">School</span><span>{selectedUser.school_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{selectedUser.created_at ? format(new Date(selectedUser.created_at), 'MMM d, yyyy') : '-'}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={selectedUser.is_active !== false ? 'default' : 'destructive'} className="text-[10px]">
                    {selectedUser.is_active !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1"><Mail className="mr-2 h-4 w-4" /> Email User</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
