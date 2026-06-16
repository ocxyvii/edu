'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAssignments } from '@/lib/actions/teacher'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Eye, ClipboardList } from 'lucide-react'

export default function AssignmentsPage() {
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: () => getAssignments(),
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-600 mt-1">Manage and grade student assignments</p>
        </div>
        <Button asChild>
          <Link href="/teacher/assignments/new"><Plus className="h-4 w-4 mr-2" /> Create Assignment</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_: any, i: any) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : assignments?.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No assignments yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {assignments?.map((a: any) => (
            <Link key={a.id} href={`/teacher/assignments/${a.id}`}>
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-edu-blue-600 flex-shrink-0" />
                    <p className="font-medium text-gray-900 truncate">{a.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {a.classes?.name} · {a.subjects?.name}
                    {a.sections?.name && ` · ${a.sections.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right text-xs text-gray-500">
                    <p>Due {new Date(a.due_date).toLocaleDateString()}</p>
                    <p>Max {a.max_marks} marks</p>
                  </div>
                  <Badge className={new Date(a.due_date) < new Date() ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                    {new Date(a.due_date) < new Date() ? 'Overdue' : 'Active'}
                  </Badge>
                  <Eye className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
