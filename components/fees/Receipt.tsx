'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Download, Loader2 } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { ReceiptPDF } from './ReceiptPDF'

interface ReceiptProps {
  invoice: any
  school?: { name?: string; address?: string; phone?: string; email?: string; logo_url?: string } | null
}

export function Receipt({ invoice, school }: ReceiptProps) {
  const [loading, setLoading] = useState(false)
  const student = invoice?.students
  const profile = student?.profiles
  const fee = invoice?.fee_structures
  const payments = invoice?.payments ?? []

  const handleDownload = async () => {
    setLoading(true)
    try {
      const blob = await pdf(<ReceiptPDF invoice={invoice} school={school} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${invoice?.invoice_number ?? 'unknown'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleDownload} variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Generating PDF...' : 'Download PDF'}
        </Button>
      </div>

      <div className="bg-white p-8 max-w-[210mm] mx-auto">
        <div className="text-center mb-6">
          {school?.logo_url && (
            <img src={school.logo_url} alt="School Logo" className="h-16 mx-auto mb-2" />
          )}
          <h1 className="text-xl font-bold">{school?.name ?? 'School Name'}</h1>
          <p className="text-sm text-gray-600">{school?.address}</p>
          <p className="text-sm text-gray-600">{school?.phone} · {school?.email}</p>
        </div>

        <Separator className="my-4" />

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold">OFFICIAL RECEIPT</h2>
            <p className="text-sm text-gray-500">Receipt: {invoice?.invoice_number}</p>
          </div>
          <Badge className="text-sm px-3 py-1">{invoice?.status}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-gray-500">Student Name</p>
            <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Admission No.</p>
            <p className="font-medium">{student?.admission_number}</p>
          </div>
          <div>
            <p className="text-gray-500">Fee Type</p>
            <p className="font-medium">{fee?.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Due Date</p>
            <p className="font-medium">{invoice?.due_date ?? 'N/A'}</p>
          </div>
        </div>

        <Separator className="my-4" />

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Description</th>
              <th className="text-right py-2 font-medium">Amount (KES)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3">{invoice?.description ?? fee?.name}</td>
              <td className="py-3 text-right">{Number(invoice?.amount).toLocaleString()}</td>
            </tr>
            {payments.map((p: any, i: number) => (
              <tr key={i} className="text-green-700">
                <td className="py-2">Payment via {p.payment_method} - {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : ''}</td>
                <td className="py-2 text-right">-{Number(p.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold text-base border-t-2">
              <td className="py-3">Balance</td>
              <td className="py-3 text-right">KES {Number(invoice?.balance).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
          <p>This is a computer-generated receipt. No signature required.</p>
          <p>Generated on {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
