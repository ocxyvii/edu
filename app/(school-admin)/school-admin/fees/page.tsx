'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFeeSummary, generateInvoices, getFeeStructures, getFeeDashboard } from '@/lib/actions/fees.actions'
import { getClasses } from '@/lib/actions/school-admin'
import { FeeStructureBuilder } from '@/components/fees/FeeStructureBuilder'
import { InvoiceTable } from '@/components/fees/InvoiceTable'
import { PaymentModal } from '@/components/fees/PaymentModal'
import { FinanceDashboard } from '@/components/fees/FinanceDashboard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Receipt, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'

export default function FeesPage() {
  const queryClient = useQueryClient()
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({ fee_structure_id: '', class_id: '', due_date: '', description: '' })

  const { data: summary } = useQuery({
    queryKey: ['fee-summary'],
    queryFn: getFeeSummary,
    refetchInterval: 30000,
  })

  const { data: dashboard } = useQuery({
    queryKey: ['fee-dashboard'],
    queryFn: getFeeDashboard,
    refetchInterval: 60000,
  })

  const { data: structures } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: getFeeStructures,
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: getClasses,
  })

  const generateInvMutation = useMutation({
    mutationFn: () => generateInvoices({
      ...invoiceForm,
      fee_structure_id: invoiceForm.fee_structure_id,
      class_id: invoiceForm.class_id,
      due_date: invoiceForm.due_date,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['fee-summary'] })
      queryClient.invalidateQueries({ queryKey: ['fee-dashboard'] })
      setShowInvoiceDialog(false)
      setInvoiceForm({ fee_structure_id: '', class_id: '', due_date: '', description: '' })
      toast.success('Invoices generated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fee & Finance Management</h1>
          <p className="text-gray-600 mt-1">Manage fee structures, invoices, payments, and collections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPaymentDialog(true)}>
            <DollarSign className="h-4 w-4 mr-2" /> Record Payment
          </Button>
          <Button variant="outline" onClick={() => setShowInvoiceDialog(true)}>
            <Receipt className="h-4 w-4 mr-2" /> Generate Invoices
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Billed</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {summary?.total.toLocaleString() ?? 0}</div>
            <p className="text-xs text-muted-foreground">{summary?.count ?? 0} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Collected</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">KES {summary?.collected.toLocaleString() ?? 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {summary?.collectionRate ?? 0}% rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Outstanding</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">KES {summary?.outstanding.toLocaleString() ?? 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Paid</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{dashboard?.paidCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Fully paid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Overdue</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboard?.overdueCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Overdue invoices</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <FinanceDashboard />
        </TabsContent>

        <TabsContent value="structures" className="mt-6">
          <FeeStructureBuilder />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <InvoiceTable />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Record Payment</CardTitle>
              <CardDescription>Record a payment against an existing invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button size="lg" onClick={() => setShowPaymentDialog(true)}>
                  <DollarSign className="h-5 w-5 mr-2" /> Open Payment Form
                </Button>
                <p className="text-sm text-muted-foreground">Select an invoice, enter amount, and record the payment</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoices</DialogTitle>
            <DialogDescription>Bulk generate invoices for an entire class</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Fee Structure</Label>
              <Select value={invoiceForm.fee_structure_id} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, fee_structure_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select fee" /></SelectTrigger>
                <SelectContent>
                  {structures?.filter((s: any) => s.is_active).map((fee: any) => (
                    <SelectItem key={fee.id} value={fee.id}>{fee.name} - KES {Number(fee.amount).toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class</Label>
              <Select value={invoiceForm.class_id} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, class_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} placeholder="Invoice description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>Cancel</Button>
            <Button onClick={() => generateInvMutation.mutate()} disabled={!invoiceForm.fee_structure_id || !invoiceForm.class_id || !invoiceForm.due_date}>
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentModal open={showPaymentDialog} onOpenChange={setShowPaymentDialog} />
    </div>
  )
}
