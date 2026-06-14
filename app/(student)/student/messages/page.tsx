'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudentMessages, markMessageRead, getStudentParents, sendMessage } from '@/lib/actions/student'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Send, Inbox } from 'lucide-react'

export default function StudentMessagesPage() {
  const queryClient = useQueryClient()
  const [composeOpen, setComposeOpen] = useState(false)
  const [form, setForm] = useState({ recipient_id: '', subject: '', content: '' })

  const { data: messages, isLoading } = useQuery({
    queryKey: ['student-messages'],
    queryFn: () => getStudentMessages(),
  })

  const { data: parents } = useQuery({
    queryKey: ['student-parents'],
    queryFn: () => getStudentParents(),
  })

  const sendMutation = useMutation({
    mutationFn: () => sendMessage(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-messages'] })
      setComposeOpen(false)
      setForm({ recipient_id: '', subject: '', content: '' })
      toast.success('Message sent')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const readMutation = useMutation({
    mutationFn: (id: string) => markMessageRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student-messages'] }),
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">Communicate with your parents</p>
        </div>
        <Button onClick={() => setComposeOpen(true)}><Send className="h-4 w-4 mr-2" /> Compose</Button>
      </div>

      {composeOpen && (
        <Card>
          <CardHeader><CardTitle>New Message</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Send to</Label>
              <Select value={form.recipient_id} onValueChange={(v) => setForm(p => ({ ...p, recipient_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select parent/guardian" /></SelectTrigger>
                <SelectContent>
                  {parents?.map((p: any) => (
                    <SelectItem key={p.parent_id} value={p.parent_id}>
                      {p.profiles?.first_name} {p.profiles?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Optional subject" />
            </div>
            <div>
              <Label>Message</Label>
              <textarea
                value={form.content}
                onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Type your message..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
              <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !form.content || !form.recipient_id}>
                {sendMutation.isPending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !messages?.received?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No messages yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {messages.received.map((m: any) => (
            <Card
              key={m.id}
              className={`cursor-pointer transition-shadow hover:shadow-sm ${!m.is_read ? 'border-l-4 border-l-edu-blue-500 bg-blue-50/30' : ''}`}
              onClick={() => { if (!m.is_read) readMutation.mutate(m.id) }}
            >
              <CardContent className="flex items-start gap-4 py-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{m.profiles?.first_name?.[0]}{m.profiles?.last_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{m.profiles?.first_name} {m.profiles?.last_name}</p>
                    <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                  {m.subject && <p className="text-xs font-medium mt-0.5">{m.subject}</p>}
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.content}</p>
                </div>
                {!m.is_read && <div className="h-2 w-2 rounded-full bg-edu-blue-500 flex-shrink-0 mt-2" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
