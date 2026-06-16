'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { issueBook, getMembers, getBook } from '@/lib/actions/library.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Search, BookOpen, User, Calendar, Printer } from 'lucide-react'

interface IssueBookModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedBookId?: string
}

export function IssueBookModal({ open, onOpenChange, selectedBookId }: IssueBookModalProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [bookId, setBookId] = useState(selectedBookId ?? '')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState<'book' | 'member' | 'confirm'>('book')

  const { data: book } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => getBook(bookId),
    enabled: !!bookId,
  })

  const { data: members } = useQuery({
    queryKey: ['library-members', debouncedSearch],
    queryFn: () => getMembers(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  })

  const issueMutation = useMutation({
    mutationFn: () => issueBook({
      book_id: bookId,
      member_id: selectedMember.id,
      member_type: selectedMember.type,
      due_date: dueDate,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] })
      queryClient.invalidateQueries({ queryKey: ['library-issues'] })
      queryClient.invalidateQueries({ queryKey: ['library-stats'] })
      queryClient.invalidateQueries({ queryKey: ['book', bookId] })
      reset()
      toast.success(`Book issued to ${selectedMember.name}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reset = () => {
    onOpenChange(false)
    setSearchQuery('')
    setDebouncedSearch('')
    setSelectedMember(null)
    setBookId('')
    setNotes('')
    setStep('book')
    const d = new Date()
    d.setDate(d.getDate() + 14)
    setDueDate(d.toISOString().split('T')[0])
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setTimeout(() => setDebouncedSearch(value), 300)
  }

  const handlePrintSlip = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>Issue Slip</title>
      <script src="https://cdn.tailwindcss.com"></script>
      </head><body class="p-8 max-w-md mx-auto">
        <h1 class="text-xl font-bold text-center mb-6">LIBRARY ISSUE SLIP</h1>
        <div class="border rounded-lg p-4 space-y-2 text-sm">
          <p><strong>Book:</strong> ${book?.title}</p>
          <p><strong>Author:</strong> ${book?.author || 'N/A'}</p>
          <p><strong>ISBN:</strong> ${book?.isbn || 'N/A'}</p>
          <hr class="my-2"/>
          <p><strong>Member:</strong> ${selectedMember?.name}</p>
          <p><strong>Type:</strong> ${selectedMember?.type}</p>
          <p><strong>ID:</strong> ${selectedMember?.identifier || 'N/A'}</p>
          <hr class="my-2"/>
          <p><strong>Issue Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
        </div>
        <p class="text-xs text-center mt-6 text-gray-400">Computer generated slip</p>
        <script>window.onload=function(){window.print();window.close()}</script>
      </body></html>
    `)
    w.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue Book</DialogTitle>
          <DialogDescription>Select a book and member to issue the book to</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {step === 'book' && (
            <div className="space-y-3">
              <Label>Book</Label>
              {selectedBookId ? (
                <div className="p-3 rounded-lg border bg-blue-50">
                  {book && (
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">{book.title}</p>
                        <p className="text-xs text-muted-foreground">{book.author} · {book.available_copies} available</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Input
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  placeholder="Enter book ID or search in catalog"
                />
              )}
              <Button onClick={() => setStep('member')} disabled={!bookId} className="w-full">
                Continue to Member Selection
              </Button>
            </div>
          )}

          {step === 'member' && (
            <div className="space-y-3">
              <Label>Search Member</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by student/teacher name or ID..."
                  className="pl-9"
                />
              </div>

              {selectedMember ? (
                <div className="p-3 rounded-lg border bg-green-50">
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-medium">{selectedMember.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{selectedMember.type} · {selectedMember.identifier}</p>
                    </div>
                    <Badge className="ml-auto">Selected</Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {members?.map((m: any) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer border"
                      onClick={() => setSelectedMember(m)}
                    >
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{m.type} · {m.identifier}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{m.type}</Badge>
                    </div>
                  ))}
                  {debouncedSearch.length >= 2 && members?.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No members found</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedMember(null)} disabled={!selectedMember}>
                  Change
                </Button>
                <Button onClick={() => setStep('confirm')} disabled={!selectedMember} className="flex-1">
                  Continue to Confirm
                </Button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{book?.title}</p>
                    <p className="text-xs text-muted-foreground">{book?.author} · {book?.isbn}</p>
                  </div>
                  <Badge>{book?.available_copies} available</Badge>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{selectedMember?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{selectedMember?.type} · {selectedMember?.identifier}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label>Due Date</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('member')}>Back</Button>
                <Button
                  className="flex-1"
                  onClick={() => issueMutation.mutate()}
                  disabled={issueMutation.isPending}
                >
                  {issueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirm Issue
                </Button>
                <Button variant="outline" onClick={handlePrintSlip}>
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {step !== 'confirm' && (
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Cancel</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
