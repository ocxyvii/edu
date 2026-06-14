'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { approveStudent, rejectStudent } from '@/lib/actions/pending-students'
import { CheckCircle2, XCircle, Clock, UserCheck, BookOpen, Building2, Calendar, Loader2 } from 'lucide-react'

interface PendingStudent {
  id: string
  user_id: string
  school_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  program_type: string
  status: string
  created_at: string
  updated_at: string
}

export function PendingStudentsClient({
  pending,
  approved,
  schoolId,
}: {
  pending: PendingStudent[]
  approved: PendingStudent[]
  schoolId: string
}) {
  const [processing, setProcessing] = useState<Record<string, 'approve' | 'reject' | null>>({})
  const [localPending, setLocalPending] = useState(pending)

  const handleApprove = async (id: string) => {
    setProcessing((prev) => ({ ...prev, [id]: 'approve' }))
    try {
      await approveStudent(id)
      toast.success('Student approved successfully')
      setLocalPending((prev) => prev.filter((p) => p.id !== id))
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve student')
    } finally {
      setProcessing((prev) => ({ ...prev, [id]: null }))
    }
  }

  const handleReject = async (id: string) => {
    setProcessing((prev) => ({ ...prev, [id]: 'reject' }))
    try {
      await rejectStudent(id)
      toast.success('Student registration rejected')
      setLocalPending((prev) => prev.filter((p) => p.id !== id))
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject student')
    } finally {
      setProcessing((prev) => ({ ...prev, [id]: null }))
    }
  }

  const programLabel = (type: string) => {
    const labels: Record<string, string> = {
      junior: 'Junior School',
      major: 'Major / Senior School',
      bachelors: 'Bachelors / Degree',
    }
    return labels[type] ?? type
  }

  const isProcessing = (id: string) => processing[id] !== null && processing[id] !== undefined

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-edu-blue-600" />
          Pending Student Registrations
        </h1>
        <p className="text-gray-500 mt-1">
          Review and approve self-registered student accounts
        </p>
      </div>

      {localPending.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">All Clear</h3>
            <p className="text-sm text-gray-500">No pending student registrations</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {localPending.map((student) => (
            <Card key={student.id} className="border-l-4 border-l-amber-400">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {student.first_name} {student.last_name}
                      </h3>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{student.email}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {student.school_id === schoolId ? 'Your School' : 'Other'}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {programLabel(student.program_type)}
                      </span>
                      {student.phone && (
                        <span className="flex items-center gap-1">
                          {student.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(student.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleApprove(student.id)}
                      disabled={isProcessing(student.id)}
                    >
                      {processing[student.id] === 'approve' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleReject(student.id)}
                      disabled={isProcessing(student.id)}
                    >
                      {processing[student.id] === 'reject' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-1" />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {approved.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Recently Approved
          </h2>
          <div className="grid gap-2">
            {approved.map((student) => (
              <Card key={student.id} className="border-l-4 border-l-green-400">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Approved
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
