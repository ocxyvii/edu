'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recordPayment, getInvoices } from '@/lib/actions/fees.actions'
import { initiateMpesaPayment } from '@/lib/actions/payment.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Smartphone, CreditCard, Building2, Banknote } from 'lucide-react'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'mpesa', label: 'M-Pesa', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'cheque', label: 'Cheque', icon: Building2 },
]

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentModal({ open, onOpenChange }: PaymentModalProps) {
  const queryClient = useQueryClient()
  const [invoiceId, setInvoiceId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [amount, setAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [transactionRef, setTransactionRef] = useState('')
  const [notes, setNotes] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState('')

  const { data: invoices } = useQuery({
    queryKey: ['fee-invoices'],
    queryFn: () => getInvoices(),
  })

  const unpaidInvoices = invoices?.filter((i: any) => i.status !== 'paid') ?? []

  const recordMutation = useMutation({
    mutationFn: () => recordPayment({
      invoice_id: invoiceId,
      student_id: studentId,
      amount,
      payment_method: paymentMethod as any,
      transaction_ref: transactionRef || undefined,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['fee-summary'] })
      queryClient.invalidateQueries({ queryKey: ['fee-dashboard'] })
      reset()
      toast.success('Payment recorded successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const mpesaMutation = useMutation({
    mutationFn: () => initiateMpesaPayment({ invoice_id: invoiceId, phone: mpesaPhone, amount }),
    onSuccess: (data) => {
      toast.success(data.message)
      setTransactionRef(data.transactionRef)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reset = () => {
    onOpenChange(false)
    setInvoiceId('')
    setStudentId('')
    setAmount(0)
    setPaymentMethod('cash')
    setTransactionRef('')
    setNotes('')
    setMpesaPhone('')
  }

  const selectInvoice = (id: string) => {
    const inv = unpaidInvoices.find((i: any) => i.id === id)
    setInvoiceId(id)
    setStudentId(inv?.student_id ?? '')
    setAmount(Number(inv?.balance ?? 0))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Record a payment against an invoice</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Invoice</Label>
            <Select value={invoiceId} onValueChange={selectInvoice}>
              <SelectTrigger><SelectValue placeholder="Select unpaid invoice" /></SelectTrigger>
              <SelectContent>
                {unpaidInvoices.map((inv: any) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoice_number} - {inv.students?.profiles?.first_name} {inv.students?.profiles?.last_name} (Balance: KES {Number(inv.balance).toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Amount (KES)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} />
          </div>

          <div>
            <Label>Payment Method</Label>
            <div className="grid grid-cols-5 gap-2 mt-1">
              {PAYMENT_METHODS.map((m: any) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMethod(m.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                    paymentMethod === m.value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <m.icon className="h-5 w-5" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'mpesa' && (
            <div>
              <Label>Phone Number (M-Pesa)</Label>
              <Input
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="e.g., 254712345678"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => mpesaMutation.mutate()}
                disabled={mpesaMutation.isPending || !mpesaPhone || !amount}
              >
                {mpesaMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send STK Push
              </Button>
            </div>
          )}

          <div>
            <Label>Transaction Ref (optional)</Label>
            <Input value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="External reference" />
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this payment" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={reset}>Cancel</Button>
          <Button
            onClick={() => recordMutation.mutate()}
            disabled={recordMutation.isPending || !invoiceId || !amount}
          >
            {recordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
