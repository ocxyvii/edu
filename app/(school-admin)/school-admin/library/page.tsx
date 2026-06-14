'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookCatalog } from '@/components/library/BookCatalog'
import { BookForm } from '@/components/library/BookForm'
import { IssueBookModal } from '@/components/library/IssueBookModal'
import { ActiveIssues } from '@/components/library/ActiveIssues'
import { LibraryReports } from '@/components/library/LibraryReports'
import { Button } from '@/components/ui/button'
import { BookOpen, Plus } from 'lucide-react'

export default function LibraryPage() {
  const [showBookForm, setShowBookForm] = useState(false)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [editingBook, setEditingBook] = useState<any>(null)

  const handleEditBook = (book: any) => {
    setEditingBook(book)
    setShowBookForm(true)
  }

  const handleAddBook = () => {
    setEditingBook(null)
    setShowBookForm(true)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Library Management</h1>
          <p className="text-gray-600 mt-1">Manage your school library catalog, issues, and reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowIssueModal(true)} variant="outline">
            <BookOpen className="h-4 w-4 mr-2" /> Issue Book
          </Button>
          <Button onClick={handleAddBook}>
            <Plus className="h-4 w-4 mr-2" /> Add Book
          </Button>
        </div>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Book Catalog</TabsTrigger>
          <TabsTrigger value="issues">Active Issues</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-6">
          <BookCatalog onAddBook={handleAddBook} onEditBook={handleEditBook} />
        </TabsContent>

        <TabsContent value="issues" className="mt-6">
          <ActiveIssues />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <LibraryReports />
        </TabsContent>
      </Tabs>

      <BookForm
        open={showBookForm}
        onOpenChange={(o) => { if (!o) setEditingBook(null); setShowBookForm(o) }}
        initialData={editingBook}
      />

      <IssueBookModal
        open={showIssueModal}
        onOpenChange={setShowIssueModal}
      />
    </div>
  )
}
