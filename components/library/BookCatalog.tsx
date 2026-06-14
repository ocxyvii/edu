'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getBooks, getBookCategories } from '@/lib/actions/library.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Search, Grid3X3, List, Plus } from 'lucide-react'

interface BookCatalogProps {
  onAddBook: () => void
  onEditBook: (book: any) => void
}

export function BookCatalog({ onAddBook, onEditBook }: BookCatalogProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setTimeout(() => setDebouncedSearch(value), 300)
  }

  const { data: books, isLoading } = useQuery({
    queryKey: ['library-books', categoryFilter, availabilityFilter, debouncedSearch],
    queryFn: () => getBooks({
      category: categoryFilter || undefined,
      availability: availabilityFilter || undefined,
      search: debouncedSearch || undefined,
    }),
  })

  const { data: categories } = useQuery({
    queryKey: ['library-categories'],
    queryFn: getBookCategories,
  })

  const counts = useMemo(() => {
    if (!books) return { total: 0, available: 0 }
    return {
      total: books.length,
      available: books.filter((b: any) => b.available_copies > 0).length,
    }
  }, [books])

  if (isLoading) return <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, author, or ISBN..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Categories</SelectItem>
            {categories?.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Availability" /></SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Books</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Checked Out</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center border rounded-md">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="rounded-r-none" onClick={() => setViewMode('grid')}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="rounded-l-none" onClick={() => setViewMode('list')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={onAddBook} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Book
        </Button>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{counts.total} book{counts.total !== 1 ? 's' : ''}</span>
        <span className="text-green-600">{counts.available} available</span>
        <span className="text-orange-600">{counts.total - counts.available} checked out</span>
      </div>

      {books?.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No books found. Add your first book to the catalog.</CardContent></Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {books?.map((book: any) => (
            <Card key={book.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onEditBook(book)}>
              <CardContent className="p-4">
                <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-md mb-3 flex items-center justify-center">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover rounded-md" />
                  ) : (
                    <BookOpen className="h-10 w-10 text-blue-400" />
                  )}
                </div>
                <h3 className="font-medium text-sm line-clamp-2" title={book.title}>{book.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">{book.author || 'Unknown author'}</p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant={book.available_copies > 0 ? 'default' : 'secondary'} className="text-xs">
                    {book.available_copies}/{book.total_copies}
                  </Badge>
                  {book.category && <span className="text-[10px] text-muted-foreground capitalize">{book.category}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 font-medium">Title</th>
                <th className="text-left py-3 px-4 font-medium">Author</th>
                <th className="text-left py-3 px-4 font-medium">ISBN</th>
                <th className="text-left py-3 px-4 font-medium">Category</th>
                <th className="text-center py-3 px-4 font-medium">Copies</th>
                <th className="text-center py-3 px-4 font-medium">Available</th>
                <th className="text-left py-3 px-4 font-medium">Shelf</th>
              </tr>
            </thead>
            <tbody>
              {books?.map((book: any) => (
                <tr key={book.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => onEditBook(book)}>
                  <td className="py-3 px-4 font-medium">{book.title}</td>
                  <td className="py-3 px-4 text-muted-foreground">{book.author || '—'}</td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{book.isbn || '—'}</td>
                  <td className="py-3 px-4 capitalize">{book.category || '—'}</td>
                  <td className="py-3 px-4 text-center">{book.total_copies}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={book.available_copies > 0 ? 'default' : 'secondary'} className="text-xs">
                      {book.available_copies}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{book.shelf_location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
