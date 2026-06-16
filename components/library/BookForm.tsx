'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addBook, updateBook, uploadBookCover } from '@/lib/actions/library.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Upload, X } from 'lucide-react'

const BOOK_CATEGORIES = [
  'Textbook', 'Fiction', 'Non-Fiction', 'Science', 'Mathematics',
  'History', 'Geography', 'Literature', 'Reference', 'Dictionary',
  'Encyclopedia', 'Biography', 'Art', 'Music', 'Religion',
  'Technology', 'Engineering', 'Medical', 'Law', 'Business',
]

interface BookFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: any
}

export function BookForm({ open, onOpenChange, initialData }: BookFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!initialData
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [author, setAuthor] = useState(initialData?.author ?? '')
  const [isbn, setIsbn] = useState(initialData?.isbn ?? '')
  const [publisher, setPublisher] = useState(initialData?.publisher ?? '')
  const [publishYear, setPublishYear] = useState(initialData?.publish_year?.toString() ?? '')
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [totalCopies, setTotalCopies] = useState(initialData?.total_copies?.toString() ?? '1')
  const [shelfLocation, setShelfLocation] = useState(initialData?.shelf_location ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [coverUrl, setCoverUrl] = useState(initialData?.cover_url ?? '')
  const [uploading, setUploading] = useState(false)

  const createMutation = useMutation({
    mutationFn: () => addBook({
      title, author: author || undefined, isbn: isbn || undefined,
      publisher: publisher || undefined, publish_year: publishYear ? parseInt(publishYear) : undefined,
      category: category || undefined, cover_url: coverUrl || undefined,
      total_copies: parseInt(totalCopies) || 1, shelf_location: shelfLocation || undefined,
      description: description || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] })
      queryClient.invalidateQueries({ queryKey: ['library-categories'] })
      queryClient.invalidateQueries({ queryKey: ['library-stats'] })
      reset()
      toast.success('Book added to catalog')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateBook(initialData.id, {
      title, author: author || undefined, isbn: isbn || undefined,
      publisher: publisher || undefined, publish_year: publishYear ? parseInt(publishYear) : undefined,
      category: category || undefined, cover_url: coverUrl || undefined,
      total_copies: parseInt(totalCopies) || 1, shelf_location: shelfLocation || undefined,
      description: description || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] })
      queryClient.invalidateQueries({ queryKey: ['library-categories'] })
      queryClient.invalidateQueries({ queryKey: ['library-stats'] })
      reset()
      toast.success('Book updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const url = await uploadBookCover(fd)
      setCoverUrl(url)
      toast.success('Cover uploaded')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    onOpenChange(false)
    if (!isEditing) {
      setTitle(''); setAuthor(''); setIsbn(''); setPublisher('')
      setPublishYear(''); setCategory(''); setTotalCopies('1')
      setShelfLocation(''); setDescription(''); setCoverUrl('')
    }
  }

  const handleSubmit = () => {
    if (!title.trim()) { toast.error('Title is required'); return }
    if (!totalCopies || parseInt(totalCopies) < 1) { toast.error('At least 1 copy required'); return }
    if (isEditing) updateMutation.mutate()
    else createMutation.mutate()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Book' : 'Add Book to Catalog'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update book details' : 'Enter the details of the book to add to the library'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-28 h-36 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-md flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden">
                {coverUrl ? (
                  <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleCoverUpload} />
              <div className="flex gap-1 mt-2">
                <Button variant="outline" size="sm" className="text-xs w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                  Upload
                </Button>
                {coverUrl && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCoverUrl('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Author</Label>
                  <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" />
                </div>
                <div>
                  <Label>ISBN</Label>
                  <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="ISBN number" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Publisher</Label>
              <Input value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Publisher" />
            </div>
            <div>
              <Label>Publish Year</Label>
              <Input type="number" value={publishYear} onChange={(e) => setPublishYear(e.target.value)} placeholder="e.g. 2024" min={1000} max={9999} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BOOK_CATEGORIES.map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Copies *</Label>
              <Input type="number" value={totalCopies} onChange={(e) => setTotalCopies(e.target.value)} min={1} />
            </div>
            <div>
              <Label>Shelf Location</Label>
              <Input value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} placeholder="e.g. A-12" />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={reset}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Update' : 'Add Book'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
