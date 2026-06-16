'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Bell, Send, CheckCircle, XCircle, Info, AlertTriangle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

const TYPE_ICONS: Record<string, React.ElementType> = { info: Info, success: CheckCircle, warning: AlertTriangle, error: XCircle }
const TYPE_COLORS: Record<string, string> = { info: 'bg-blue-50 border-blue-200', success: 'bg-emerald-50 border-emerald-200', warning: 'bg-amber-50 border-amber-200', error: 'bg-red-50 border-red-200' }

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [showSend, setShowSend] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', type: 'info' as const })

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['school-notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
      if (!profile?.school_id) return []

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false })
        .limit(50)
      return data ?? []
    },
    refetchInterval: 30000,
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()

      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('school_id', profile?.school_id)

      if (!allUsers?.length) throw new Error('No users found')

      const notificationsData = allUsers.map((u: any) => ({
        user_id: u.id,
        school_id: profile?.school_id,
        title: form.title,
        message: form.message,
        type: form.type,
      }))

      const { error } = await supabase.from('notifications').insert(notificationsData)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-notifications'] })
      setShowSend(false)
      setForm({ title: '', message: '', type: 'info' })
      toast.success(`Notification sent to all users`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread · ${notifications?.length ?? 0} total`}
        actions={<Button onClick={() => setShowSend(true)}><Send className="mr-2 h-4 w-4" /> Send Notification</Button>}
      />

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_: any, i: any) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : !notifications?.length ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No notifications yet. Send your first notification.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => {
            const Icon = TYPE_ICONS[n.type] ?? Info
            return (
              <div key={n.id} className={`rounded-lg border p-4 transition-colors ${TYPE_COLORS[n.type] ?? ''} ${!n.is_read ? 'ring-1 ring-primary/20' : ''}`}>
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{n.title}</p>
                      {!n.is_read && <Badge className="text-[10px]">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{format(new Date(n.created_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <CardDescription>Send to all users in your school</CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Type</label>
              <div className="flex gap-2 mt-1">
                {(['info', 'success', 'warning', 'error'] as const).map((t: any) => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                      form.type === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-white hover:bg-muted'
                    }`}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title" />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Notification message..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSend(false)}>Cancel</Button>
            <Button onClick={() => sendMutation.mutate()} disabled={!form.title || !form.message || sendMutation.isPending}>
              {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send to All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
