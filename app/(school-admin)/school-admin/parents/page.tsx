'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EduCoreAvatar } from '@/components/ui/EduCoreAvatar'
import { Search, Users, UserCheck, Mail, Phone, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default function ParentsPage() {
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const { data: parents, isLoading } = useQuery({
    queryKey: ['school-parents'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
      if (!profile?.school_id) throw new Error('No school')

      const { data: parentRecords } = await supabase
        .from('parents')
        .select('id, relationship, is_primary_contact')
        .eq('school_id', profile.school_id)

      if (!parentRecords?.length) return []

      const parentIds = parentRecords.map((p: any) => p.id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, avatar_url')
        .in('id', parentIds)

      return parentRecords.map((p: any) => {
        const profile = profiles?.find((pr: any) => pr.id === p.id)
        return { ...p, profile }
      })
    },
  })

  const activeCount = parents?.length ?? 0
  const filtered = parents?.filter((p: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = `${p.profile?.first_name ?? ''} ${p.profile?.last_name ?? ''}`.toLowerCase()
    return name.includes(q) || (p.profile?.email ?? '').toLowerCase().includes(q) || (p.profile?.phone ?? '').includes(q)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parents"
        subtitle="View and manage parent/guardian accounts"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Parents" value={activeCount} variant="primary" />
        <StatCard icon={UserCheck} label="Primary Contacts" value={parents?.filter((p: any) => p.is_primary_contact).length ?? 0} variant="success" />
        <StatCard icon={Mail} label="With Email" value={parents?.filter((p: any) => p.profile?.email).length ?? 0} />
        <StatCard icon={Phone} label="With Phone" value={parents?.filter((p: any) => p.profile?.phone).length ?? 0} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parents..." className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : !filtered?.length ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {search ? 'No parents match your search.' : 'No parent accounts found. Parents are created when you add students with parent details.'}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Parent</th>
                <th className="text-left px-4 py-3 font-medium">Contact</th>
                <th className="text-center px-4 py-3 font-medium">Relationship</th>
                <th className="text-center px-4 py-3 font-medium">Primary</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => {
                const name = `${p.profile?.first_name ?? ''} ${p.profile?.last_name ?? ''}`.trim() || 'Unknown'
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <EduCoreAvatar name={name} avatarUrl={p.profile?.avatar_url} size="sm" />
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">ID: {p.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {p.profile?.email && <p className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> {p.profile.email}</p>}
                        {p.profile?.phone && <p className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> {p.profile.phone}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center capitalize">{p.relationship ?? 'guardian'}</td>
                    <td className="px-4 py-3 text-center">
                      {p.is_primary_contact ? <Badge variant="default" className="text-[10px]">Yes</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                          <Link href={`/school-admin/messages?parent=${p.id}`}>
                            <MessageSquare className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
