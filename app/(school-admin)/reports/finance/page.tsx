'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getFeeCollectionReport } from '@/lib/actions/reports.actions'
import { ChartWrapper } from '@/components/reports/ChartWrapper'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, DollarSign, AlertTriangle, TrendingUp, PiggyBank, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function FinanceReportPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: report, isLoading } = useQuery({
    queryKey: ['fee-collection-report', dateFrom, dateTo],
    queryFn: () => getFeeCollectionReport({
      dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
    }),
  })

  const exportCsv = () => {
    if (!report?.defaulters?.length) {
      toast.error('No data to export')
      return
    }
    const headers = ['Name', 'Admission No', 'Invoice No', 'Amount', 'Paid', 'Outstanding', 'Due Date', 'Days Overdue', 'Status']
    const rows = report.defaulters.map((d: any) => [
      d.name, d.admission_number, d.invoice_number, d.amount, d.paid, d.outstanding, d.due_date, d.days_overdue, d.status,
    ])
    const csv = [headers, ...rows].map((r: any) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fee-collection-report-${dateFrom || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fee Collection Report</h1>
          <p className="text-muted-foreground mt-1">Collection trends, fee type breakdown, and defaulters list</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!report?.defaulters?.length}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_: any, i: any) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">KES {report.summary.expected.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Expected Revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <PiggyBank className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">KES {report.summary.collected.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Collected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <ArrowUpRight className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-600">KES {report.summary.outstanding.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Outstanding</p>
              </CardContent>
            </Card>
            <Card className={cn(report.summary.overdue > 0 ? 'border-red-300 bg-red-50/50' : '')}>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className={cn('h-6 w-6 mx-auto mb-2', report.summary.overdue > 0 ? 'text-red-600' : 'text-gray-400')} />
                <p className={cn('text-2xl font-bold', report.summary.overdue > 0 ? 'text-red-600' : '')}>{report.summary.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue Invoices</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartWrapper
              title="Monthly Collection vs Target"
              type="bar"
              data={report.monthlyTrend}
              xKey="month"
              yKey={['collected', 'target']}
              colors={['#16a34a', '#2563eb']}
              height={280}
              loading={isLoading}
              emptyMessage="No monthly collection data"
            />
            <ChartWrapper
              title="Fee Type Breakdown"
              type="pie"
              data={report.feeTypeBreakdown}
              xKey="type"
              yKey={['amount']}
              colors={['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899']}
              height={280}
              loading={isLoading}
              emptyMessage="No fee type data"
            />
          </div>

          {/* Collection Rate Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Collection Rate</span>
                <span className="text-sm font-bold">{report.summary.collectionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    report.summary.collectionRate >= 80 ? 'bg-green-500' :
                    report.summary.collectionRate >= 50 ? 'bg-amber-500' : 'bg-red-500',
                  )}
                  style={{ width: `${report.summary.collectionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Defaulters Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Top Defaulters
              </CardTitle>
              <CardDescription>Students with outstanding fee balances, sorted by amount owed</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Adm No</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Paid</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Outstanding</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Overdue</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.defaulters.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No defaulters — all invoices are paid</td></tr>
                    ) : (
                      report.defaulters.slice(0, 50).map((d: any) => (
                        <tr key={d.invoice_id} className="border-b last:border-0 hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium">{d.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{d.admission_number}</td>
                          <td className="px-4 py-3 text-muted-foreground">{d.invoice_number}</td>
                          <td className="px-4 py-3 text-right">KES {d.amount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">KES {d.paid.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">KES {d.outstanding.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground text-xs">{d.due_date ?? '-'}</td>
                          <td className="px-4 py-3 text-center">
                            {d.days_overdue > 0 ? (
                              <Badge variant="destructive" className="text-[10px]">{d.days_overdue}d</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={
                              d.status === 'overdue' ? 'destructive' :
                              d.status === 'partial' ? 'secondary' :
                              'outline'
                            } className="text-[10px]">
                              {d.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
