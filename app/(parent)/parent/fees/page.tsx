'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getParentFees, processPayment } from '@/lib/actions/parent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { DollarSign, CreditCard, CheckCircle2, Receipt } from 'lucide-react'
import { format } from 'date-fns'

const statusStyles: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-amber-100 text-amber-800',
  pending: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default function ParentFeesPage() {
  const queryClient = useQueryClient()
  const [payDialog, setPayDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('mpesa')
  const [transactionRef, setTransactionRef] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['parent-fees'],
    queryFn: () => getParentFees(),
  })

  const payMutation = useMutation({
    mutationFn: () => processPayment({
      invoice_id: selectedInvoice?.id,
      student_id: selectedInvoice?.student_id,
      amount: Number(payAmount),
      payment_method: payMethod,
      transaction_ref: transactionRef,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-fees'] })
      setPayDialog(false)
      setSelectedInvoice(null)
      setPayAmount('')
      setTransactionRef('')
      toast.success('Payment recorded successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const invoices = data?.invoices ?? []
  const payments = data?.payments ?? []
  const children = data?.children ?? []

  const totalOutstanding = invoices.reduce((s, i) => s + Number(i.balance), 0)

  const openPayDialog = (inv: any) => {
    setSelectedInvoice(inv)
    setPayAmount(String(Number(inv.balance)))
    setPayMethod('mpesa')
    setTransactionRef('')
    setPayDialog(true)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Fees & Payments</h1>
        <p className="text-gray-600 mt-1">View and pay school fees for your children</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Invoiced</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">KES {invoices.reduce((s, i) => s + Number(i.amount), 0).toLocaleString()}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Paid</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">KES {payments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Outstanding</CardTitle></CardHeader>
              <CardContent><div className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>KES {totalOutstanding.toLocaleString()}</div></CardContent>
            </Card>
          </div>

          {children.map((child: any) => {
            const studentId = (child as any).students?.id
            const studentName = `${(child as any).students?.profiles?.first_name} ${(child as any).students?.profiles?.last_name}`
            const childInvoices = invoices.filter(i => i.student_id === studentId)

            if (childInvoices.length === 0) return null

            return (
              <Card key={studentId}>
                <CardHeader>
                  <CardTitle className="text-lg">{studentName}</CardTitle>
                  <CardDescription>Fee invoices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {childInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium">{inv.description || inv.fee_structures?.name || 'Fee Invoice'}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.fee_structures?.fee_type ? `${inv.fee_structures.fee_type} · ` : ''}
                          Due: {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : 'Not set'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">KES {Number(inv.amount).toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-1 justify-end">
                          <Badge className={statusStyles[inv.status] || ''}>{inv.status}</Badge>
                          {Number(inv.balance) > 0 && (
                            <Button size="sm" variant="outline" onClick={() => openPayDialog(inv)}>
                              <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay KES {Number(inv.balance).toLocaleString()}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}

          {payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.map(p => {
                    const inv = invoices.find(i => i.id === p.invoice_id)
                    const child = (child: any) => (child as any).students?.id === inv?.student_id
                    const childName = children.find(child) as any
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">KES {Number(p.amount).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.payment_method} · {childName?.students?.profiles?.first_name} {childName?.students?.profiles?.last_name}
                              {p.transaction_ref && ` · Ref: ${p.transaction_ref}`}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{format(new Date(p.paid_at), 'MMM d, yyyy')}</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogDescription>
              {selectedInvoice && (
                <>Invoice: {selectedInvoice.description || selectedInvoice.fee_structures?.name || 'Fee'} · Balance: KES {Number(selectedInvoice.balance).toLocaleString()}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (KES)</Label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="card">Card Payment</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction Reference (optional)</Label>
              <Input value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="M-Pesa code or ref" />
            </div>
            <Button
              className="w-full"
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending || !payAmount || Number(payAmount) <= 0}
            >
              {payMutation.isPending ? 'Processing...' : <><CreditCard className="h-4 w-4 mr-2" /> Pay KES {Number(payAmount).toLocaleString()}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
