'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getInvoices, getInvoice } from '@/lib/actions/fees.actions'
import { getClasses } from '@/lib/actions/school-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, Filter, Download, Eye, Receipt } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-800',
  overdue: 'bg-red-100 text-red-800',
}

export function InvoiceTable() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['fee-invoices', classFilter, statusFilter],
    queryFn: () => getInvoices({ class_id: classFilter || undefined, status: statusFilter || undefined }),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: getClasses,
  })

  const { data: invoiceDetail } = useQuery({
    queryKey: ['invoice-detail', selectedInvoice?.id],
    queryFn: () => getInvoice(selectedInvoice!.id),
    enabled: !!selectedInvoice?.id,
  })

  const filtered = useMemo(() => {
    if (!search) return invoices
    const q = search.toLowerCase()
    return invoices?.filter((inv: any) =>
      `${inv.students?.profiles?.first_name} ${inv.students?.profiles?.last_name}`.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.fee_structures?.name?.toLowerCase().includes(q)
    )
  }, [invoices, search])

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, invoice #, or fee type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" /> <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Classes</SelectItem>
            {classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered?.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No invoices match your filters</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Fee Type</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Due</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((inv: any) => (
                <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-gray-600">{inv.invoice_number}</td>
                  <td className="py-3 px-4 font-medium">{inv.students?.profiles?.first_name} {inv.students?.profiles?.last_name}</td>
                  <td className="py-3 px-4 text-gray-600">{inv.fee_structures?.name ?? '-'}</td>
                  <td className="py-3 px-4">KES {Number(inv.amount).toLocaleString()}</td>
                  <td className="py-3 px-4">KES {Number(inv.paid_amount).toLocaleString()}</td>
                  <td className="py-3 px-4 font-semibold">KES {Number(inv.balance).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <Badge className={`text-xs ${STATUS_COLORS[inv.status] ?? ''}`}>{inv.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{inv.due_date ?? '-'}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedInvoice(inv)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.print()}>
                      <Receipt className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selectedInvoice} onOpenChange={(o) => { if (!o) setSelectedInvoice(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {invoiceDetail && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Invoice #</p>
                  <p className="font-mono font-medium">{invoiceDetail.invoice_number}</p>
                </div>
                <div className="text-right">
                  <Badge className={STATUS_COLORS[invoiceDetail.status]}>{invoiceDetail.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Student</p>
                  <p className="font-medium">{invoiceDetail.students?.profiles?.first_name} {invoiceDetail.students?.profiles?.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Class</p>
                  <p>{invoiceDetail.students?.classes?.name} - {invoiceDetail.students?.sections?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fee</p>
                  <p className="font-medium">{invoiceDetail.fee_structures?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p>{invoiceDetail.due_date ?? 'N/A'}</p>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Description</th>
                    <th className="text-right py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">{invoiceDetail.description ?? invoiceDetail.fee_structures?.name}</td>
                    <td className="py-2 text-right">KES {Number(invoiceDetail.amount).toLocaleString()}</td>
                  </tr>
                  {invoiceDetail.payments?.map((p: any) => (
                    <tr key={p.id} className="text-green-700">
                      <td className="py-2">Payment - {p.payment_method} ({p.transaction_ref ?? 'N/A'})</td>
                      <td className="py-2 text-right">-KES {Number(p.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2">Balance</td>
                    <td className="py-2 text-right">KES {Number(invoiceDetail.balance).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
