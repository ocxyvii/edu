'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMessages, sendMessage, markMessageRead, getStudentsWithParents } from '@/lib/actions/teacher'
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
import { Send, Inbox, SendHorizontal, Users } from 'lucide-react'

export default function MessagesPage() {
  const queryClient = useQueryClient()
  const [composeOpen, setComposeOpen] = useState(false)
  const [form, setForm] = useState({ student_id: '', recipient_id: '', subject: '', content: '' })

  const { data: messages, isLoading } = useQuery({
    queryKey: ['teacher-messages'],
    queryFn: () => getMessages(),
  })

  const { data: studentsWithParents } = useQuery({
    queryKey: ['teacher-students-parents'],
    queryFn: () => getStudentsWithParents(),
  })

  const sendMutation = useMutation({
    mutationFn: () => sendMessage({ recipient_id: form.recipient_id, subject: form.subject, content: form.content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-messages'] })
      setComposeOpen(false)
      setForm({ student_id: '', recipient_id: '', subject: '', content: '' })
      toast.success('Message sent')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const readMutation = useMutation({
    mutationFn: (messageId: string) => markMessageRead(messageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-messages'] }),
  })

  const received = messages?.received ?? []
  const sent = messages?.sent ?? []

  const groupedStudents = useMemo(() => {
    if (!studentsWithParents?.length) return []
    const map = new Map<string, { class: string; students: any[] }>()
    studentsWithParents.forEach((s: any) => {
      const cls = s.sections?.classes
      if (!cls) return
      const key = `${cls.name}-${cls.level ?? ''}`
      if (!map.has(key)) {
        map.set(key, { class: `${cls.name}${cls.level ? ` (Level ${cls.level})` : ''}`, students: [] })
      }
      const parent = s.parent_student?.[0]
      map.get(key)!.students.push({
        id: s.id,
        name: `${s.profiles?.first_name} ${s.profiles?.last_name}`,
        admission: s.admission_number,
        parentId: parent?.parent_id ?? null,
        parentName: parent?.profiles
          ? `${parent.profiles.first_name} ${parent.profiles.last_name}`
          : null,
      })
    })
    return Array.from(map.values())
  }, [studentsWithParents])

  const selectedStudent = useMemo(() => {
    if (!form.student_id || !studentsWithParents) return null
    return studentsWithParents.find((s: any) => s.id === form.student_id) ?? null
  }, [form.student_id, studentsWithParents])

  const handleStudentSelect = (studentId: string) => {
    const student = studentsWithParents?.find((s: any) => s.id === studentId)
    const parent = student?.parent_student?.[0]
    setForm({
      student_id: studentId,
      recipient_id: parent?.parent_id ?? '',
      subject: '',
      content: '',
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">Communicate with parents and guardians</p>
        </div>
        <Button onClick={() => setComposeOpen(true)}><Send className="h-4 w-4 mr-2" /> Compose</Button>
      </div>

      {composeOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Student</Label>
              <Select value={form.student_id} onValueChange={handleStudentSelect}>
                <SelectTrigger><SelectValue placeholder="Choose student to message their parent" /></SelectTrigger>
                <SelectContent>
                  {groupedStudents.map((group: any) => (
                    <div key={group.class}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.class}
                      </div>
                      {group.students.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.admission})
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStudent && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Sending to parent of <strong>{selectedStudent.profiles?.first_name} {selectedStudent.profiles?.last_name}</strong></span>
                {form.recipient_id && (
                  <Badge variant="secondary" className="ml-auto">
                    {(() => {
                      const parent = selectedStudent.parent_student?.[0]
                      return parent?.profiles
                        ? `${parent.profiles.first_name} ${parent.profiles.last_name}`
                        : 'Parent'
                    })()}
                  </Badge>
                )}
              </div>
            )}
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
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <Tabs defaultValue="inbox">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="h-4 w-4" /> Inbox ({received.filter((m: any) => !m.is_read).length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <SendHorizontal className="h-4 w-4" /> Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-3 mt-4">
            {received.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No messages received</CardContent></Card>
            ) : received.map((m: any) => (
              <Card
                key={m.id}
                className={`cursor-pointer transition-shadow hover:shadow-sm ${!m.is_read ? 'border-l-4 border-l-edu-blue-500 bg-blue-50/30' : ''}`}
                onClick={() => { if (!m.is_read) readMutation.mutate(m.id) }}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={m.profiles?.avatar_url ?? ''} />
                    <AvatarFallback>
                      {m.profiles?.first_name?.[0]}{m.profiles?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {m.profiles?.first_name} {m.profiles?.last_name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {m.subject && <p className="text-xs font-medium mt-0.5">{m.subject}</p>}
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.content}</p>
                  </div>
                  {!m.is_read && (
                    <div className="h-2 w-2 rounded-full bg-edu-blue-500 flex-shrink-0 mt-2" />
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sent" className="space-y-3 mt-4">
            {sent.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No messages sent</CardContent></Card>
            ) : sent.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="flex items-start gap-4 py-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {m.profiles?.first_name?.[0]}{m.profiles?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        To: {m.profiles?.first_name} {m.profiles?.last_name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {m.subject && <p className="text-xs font-medium mt-0.5">{m.subject}</p>}
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.content}</p>
                  </div>
                  <Badge className={m.is_read ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                    {m.is_read ? 'Read' : 'Sent'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
