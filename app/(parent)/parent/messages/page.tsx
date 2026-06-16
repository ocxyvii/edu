'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getParentMessages, getParentTeachers, sendParentMessage, markParentMessageRead, getParentAnnouncements } from '@/lib/actions/parent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Send, Inbox, SendHorizontal, Megaphone } from 'lucide-react'

export default function ParentMessagesPage() {
  const queryClient = useQueryClient()
  const [composeOpen, setComposeOpen] = useState(false)
  const [form, setForm] = useState({ recipient_id: '', subject: '', content: '' })

  const { data: messages, isLoading } = useQuery({
    queryKey: ['parent-messages'],
    queryFn: () => getParentMessages(),
  })

  const { data: teachers } = useQuery({
    queryKey: ['parent-teachers'],
    queryFn: () => getParentTeachers(),
  })

  const { data: announcements } = useQuery({
    queryKey: ['parent-announcements'],
    queryFn: () => getParentAnnouncements(),
  })

  const sendMutation = useMutation({
    mutationFn: () => sendParentMessage(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-messages'] })
      setComposeOpen(false)
      setForm({ recipient_id: '', subject: '', content: '' })
      toast.success('Message sent')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const readMutation = useMutation({
    mutationFn: (id: string) => markParentMessageRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parent-messages'] }),
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">Communicate with teachers</p>
        </div>
        <Button onClick={() => setComposeOpen(true)}><Send className="h-4 w-4 mr-2" /> Compose</Button>
      </div>

      {composeOpen && (
        <Card>
          <CardHeader><CardTitle>New Message</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Teacher</Label>
              <Select value={form.recipient_id} onValueChange={(v) => setForm(p => ({ ...p, recipient_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers?.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} {t.subject ? `(${t.subject})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Optional subject" />
            </div>
            <div>
              <Label>Message *</Label>
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
        <div className="space-y-3">{[...Array(5)].map((_: any, i: any) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <Tabs defaultValue="inbox">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-2"><Inbox className="h-4 w-4" /> Inbox ({messages?.received?.filter((m: any) => !m.is_read).length ?? 0})</TabsTrigger>
            <TabsTrigger value="sent" className="gap-2"><SendHorizontal className="h-4 w-4" /> Sent</TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2"><Megaphone className="h-4 w-4" /> Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-3 mt-4">
            {!messages?.received?.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No messages received</CardContent></Card>
            ) : messages.received.map((m: any) => (
              <Card key={m.id} className={`cursor-pointer ${!m.is_read ? 'border-l-4 border-l-emerald-500 bg-emerald-50/30' : ''}`}
                onClick={() => { if (!m.is_read) readMutation.mutate(m.id) }}>
                <CardContent className="flex items-start gap-4 py-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={m.profiles?.avatar_url ?? ''} />
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
                  {!m.is_read && <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sent" className="space-y-3 mt-4">
            {!messages?.sent?.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No messages sent</CardContent></Card>
            ) : messages.sent.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="flex items-start gap-4 py-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{m.profiles?.first_name?.[0]}{m.profiles?.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">To: {m.profiles?.first_name} {m.profiles?.last_name}</p>
                      <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
                    </div>
                    {m.subject && <p className="text-xs font-medium mt-0.5">{m.subject}</p>}
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.content}</p>
                  </div>
                  <Badge className={m.is_read ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>{m.is_read ? 'Read' : 'Sent'}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="announcements" className="space-y-3 mt-4">
            {!announcements?.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
            ) : announcements.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Megaphone className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{a.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
