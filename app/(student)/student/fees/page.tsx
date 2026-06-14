'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStudentFees, getStudentPaymentReceipt } from '@/lib/actions/student'

import { Receipt } from '@/components/fees/Receipt'
import { DollarSign, Download, Receipt as ReceiptIcon, AlertTriangle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const statusStyles: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-amber-100 text-amber-800',
  pending: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default function StudentFeesPage() {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['student-fees'],
    queryFn: () => getStudentFees(),
  })

  const { data: receiptData } = useQuery({
    queryKey: ['student-receipt', selectedPaymentId],
    queryFn: () => getStudentPaymentReceipt(selectedPaymentId!),
    enabled: !!selectedPaymentId,
  })

  const invoices = data?.invoices ?? []
  const payments = data?.payments ?? []
  const scholarships = data?.scholarships ?? []
  const summary = data?.summary ?? { totalBilled: 0, totalPaid: 0, totalBalance: 0, scholarshipPercent: 0 }
  const arrears = data?.arrears ?? { count: 0, total: 0, invoices: [] }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Fees & Payments</h1>
        <p className="text-gray-600 mt-1">View your fee invoices, payment history, and download receipts</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Billed</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {summary.totalBilled.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Paid</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">KES {summary.totalPaid.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{payments.length} payments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.totalBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  KES {summary.totalBalance.toLocaleString()}
                </div>
                {summary.scholarshipPercent > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{summary.scholarshipPercent}% scholarship applied</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Arrears</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${arrears.count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {arrears.count > 0 ? `KES ${arrears.total.toLocaleString()}` : 'KES 0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {arrears.count > 0 ? `${arrears.count} overdue invoice${arrears.count > 1 ? 's' : ''}` : 'All clear'}
                </p>
              </CardContent>
            </Card>
          </div>

          {arrears.count > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" /> Overdue Invoices
                </CardTitle>
                <CardDescription className="text-red-600">
                  You have {arrears.count} overdue invoice{arrears.count > 1 ? 's' : ''}. Please clear them to avoid penalties.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {arrears.invoices.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded bg-white border border-red-200">
                      <div>
                        <p className="font-medium text-sm">{inv.fee_structures?.name || 'Fee'}</p>
                        <p className="text-xs text-red-600">
                          {inv.invoice_number} · Due: {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">KES {Number(inv.balance).toLocaleString()}</p>
                        <Badge className="bg-red-100 text-red-800 text-xs">Overdue</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {scholarships.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Scholarships & Discounts</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scholarships.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded bg-blue-50">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.reason || 'No reason specified'}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">{s.percentage}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Fee Invoices</CardTitle>
              <CardDescription>All fee invoices and their payment status</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No fee invoices found.</p>
              ) : (
                <div className="space-y-3">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{inv.fee_structures?.name || inv.description || 'Fee Invoice'}</p>
                          {inv.status === 'paid' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {inv.invoice_number && <span className="font-mono">{inv.invoice_number} · </span>}
                          {inv.fee_structures?.fee_type && <span className="capitalize">{inv.fee_structures.fee_type} · </span>}
                          Due: {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : 'Not set'}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold">KES {Number(inv.amount).toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-1 justify-end">
                          <Badge className={statusStyles[inv.status] || ''}>{inv.status}</Badge>
                          {Number(inv.balance) > 0 && (
                            <span className="text-xs font-medium text-red-600">- KES {Number(inv.balance).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Record of all payments made</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                          <ReceiptIcon className="h-4 w-4 text-green-700" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">KES {Number(p.amount).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.payment_method} · Ref: {p.transaction_ref || '—'}
                            {p.invoice?.invoice_number && <span> · {p.invoice.invoice_number}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-muted-foreground">{format(new Date(p.paid_at), 'MMM d, yyyy')}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setSelectedPaymentId(p.id)}
                        >
                          <Download className="h-3 w-3 mr-1" /> Receipt
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!selectedPaymentId} onOpenChange={(o) => { if (!o) setSelectedPaymentId(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <Receipt
              invoice={receiptData.payment?.invoice}
              school={receiptData.school}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
