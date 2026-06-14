'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pdf } from '@react-pdf/renderer'
import { ReportCardPDF } from './ReportCardPDF'

interface SubjectResult {
  subject: string
  code: string
  maxMarks: number
  passMarks: number
  marksObtained: number | null
  grade: string
  remarks: string
}

interface ReportCardData {
  exam: { name: string; type: string; start_date: string | null; end_date: string | null }
  term: string
  className: string
  student: { name: string; admissionNumber: string; section: string }
  subjects: SubjectResult[]
  summary: {
    totalMarks: number
    totalMaxMarks: number
    average: number
    percentage: number
    overallGrade: string
    passed: number
    totalSubjects: number
    position: number
    totalStudents: number
  }
}

interface ReportCardProps {
  data: ReportCardData
  schoolName?: string
}

export function ReportCard({ data, schoolName = 'EduCore School' }: ReportCardProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const blob = await pdf(<ReportCardPDF data={data} schoolName={schoolName} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-card-${data.student.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = data.subjects.every(s => s.marksObtained === null)

  if (isEmpty) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No results data available for report card generation
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleDownload} variant="outline" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Generating PDF...' : 'Download PDF'}
        </Button>
      </div>

      <div className="bg-white border rounded-lg p-8" style={{ maxWidth: '210mm' }}>
        <div className="text-center mb-6 border-b-2 border-gray-900 pb-4">
          <h2 className="text-2xl font-bold uppercase tracking-widest">{schoolName}</h2>
          <h3 className="text-lg font-bold mt-1">STUDENT REPORT CARD</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {data.exam.name} · {data.term} · {data.className}
          </p>
        </div>

        <table className="w-full mb-5 text-sm">
          <tbody>
            <tr>
              <td className="font-semibold w-32 py-1">Student Name:</td>
              <td className="py-1">{data.student.name}</td>
              <td className="font-semibold w-32 py-1">Admission No:</td>
              <td className="py-1">{data.student.admissionNumber}</td>
            </tr>
            <tr>
              <td className="font-semibold py-1">Class:</td>
              <td className="py-1">{data.className}</td>
              <td className="font-semibold py-1">Section:</td>
              <td className="py-1">{data.student.section}</td>
            </tr>
            <tr>
              <td className="font-semibold py-1">Exam:</td>
              <td className="py-1">{data.exam.name} ({data.exam.type})</td>
              <td className="font-semibold py-1">Term:</td>
              <td className="py-1">{data.term}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse mb-5 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2 text-center">Code</th>
              <th className="border px-3 py-2 text-left">Subject</th>
              <th className="border px-3 py-2 text-center">Max</th>
              <th className="border px-3 py-2 text-center">Score</th>
              <th className="border px-3 py-2 text-center">Grade</th>
              <th className="border px-3 py-2 text-center">Status</th>
              <th className="border px-3 py-2 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {data.subjects.map(s => {
              const passed = s.marksObtained !== null && s.marksObtained >= s.passMarks
              return (
                <tr key={s.code}>
                  <td className="border px-3 py-2 text-center">{s.code}</td>
                  <td className="border px-3 py-2">{s.subject}</td>
                  <td className="border px-3 py-2 text-center">{s.maxMarks}</td>
                  <td className={cn('border px-3 py-2 text-center font-medium', s.marksObtained === null && 'text-gray-400')}>
                    {s.marksObtained ?? '-'}
                  </td>
                  <td className={cn('border px-3 py-2 text-center font-bold', {
                    'text-green-600': s.grade === 'A',
                    'text-blue-600': s.grade === 'B',
                    'text-yellow-600': s.grade === 'C',
                    'text-orange-600': s.grade === 'D',
                    'text-red-600': s.grade === 'F',
                  })}>
                    {s.grade}
                  </td>
                  <td className={cn('border px-3 py-2 text-center font-medium', {
                    'text-green-600': passed,
                    'text-red-600': !passed && s.marksObtained !== null,
                  })}>
                    {s.marksObtained === null ? '-' : passed ? 'PASS' : 'FAIL'}
                  </td>
                  <td className="border px-3 py-2">{s.remarks || '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <table className="w-full border-collapse mb-6 text-sm">
          <tbody>
            <tr>
              <td className="border px-3 py-2 font-semibold bg-gray-50 w-36">Total Marks</td>
              <td className="border px-3 py-2">{data.summary.totalMarks} / {data.summary.totalMaxMarks}</td>
              <td className="border px-3 py-2 font-semibold bg-gray-50 w-36">Percentage</td>
              <td className={cn('border px-3 py-2 font-bold', {
                'text-green-600': data.summary.overallGrade === 'A',
                'text-blue-600': data.summary.overallGrade === 'B',
                'text-yellow-600': data.summary.overallGrade === 'C',
                'text-orange-600': data.summary.overallGrade === 'D',
                'text-red-600': data.summary.overallGrade === 'F',
              })}>
                {data.summary.percentage}%
              </td>
            </tr>
            <tr>
              <td className="border px-3 py-2 font-semibold bg-gray-50">Average</td>
              <td className="border px-3 py-2">{data.summary.average}</td>
              <td className="border px-3 py-2 font-semibold bg-gray-50">Overall Grade</td>
              <td className={cn('border px-3 py-2 font-bold', {
                'text-green-600': data.summary.overallGrade === 'A',
                'text-blue-600': data.summary.overallGrade === 'B',
                'text-yellow-600': data.summary.overallGrade === 'C',
                'text-orange-600': data.summary.overallGrade === 'D',
                'text-red-600': data.summary.overallGrade === 'F',
              })}>
                {data.summary.overallGrade}
              </td>
            </tr>
            <tr>
              <td className="border px-3 py-2 font-semibold bg-gray-50">Passed Subjects</td>
              <td className="border px-3 py-2">{data.summary.passed} / {data.summary.totalSubjects}</td>
              <td className="border px-3 py-2 font-semibold bg-gray-50">Class Position</td>
              <td className="border px-3 py-2 font-bold">{data.summary.position} / {data.summary.totalStudents}</td>
            </tr>
          </tbody>
        </table>

        <div className="mb-5">
          <p className="font-semibold mb-1 text-sm">Teacher's Remarks:</p>
          <div className="border min-h-[50px] rounded p-2 text-sm" />
        </div>

        <div className="flex justify-between mt-8">
          <div className="text-center">
            <div className="border-t border-gray-900 w-44 pt-1 mt-8 text-xs">Class Teacher</div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-900 w-44 pt-1 mt-8 text-xs">Principal</div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-900 w-44 pt-1 mt-8 text-xs">Parent/Guardian</div>
          </div>
        </div>
      </div>
    </div>
  )
}
