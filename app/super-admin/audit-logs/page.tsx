'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Search, Download, ChevronLeft, ChevronRight, Eye, ExternalLink, Diff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const supabase = createClient()
const PAGE_SIZE = 15

const ACTIONS = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', '2FA_ENABLE', '2FA_VERIFY', 'EXPORT', 'PASSWORD_RESET']
const TABLES = ['schools', 'profiles', 'students', 'teachers', 'classes', 'sections', 'attendance', 'exams', 'results', 'fee_invoices', 'payments', 'library', 'payroll', 'employees', 'applications']

function getActionBadge(action: string) {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    INSERT: { variant: 'default', label: 'CREATE' },
    UPDATE: { variant: 'secondary', label: 'UPDATE' },
    DELETE: { variant: 'destructive', label: 'DELETE' },
    LOGIN: { variant: 'outline', label: 'LOGIN' },
    LOGOUT: { variant: 'outline', label: 'LOGOUT' },
    '2FA_ENABLE': { variant: 'outline', label: '2FA EN' },
    '2FA_VERIFY': { variant: 'outline', label: '2FA OK' },
    EXPORT: { variant: 'outline', label: 'EXPORT' },
    PASSWORD_RESET: { variant: 'outline', label: 'RESET' },
  }
  const m = map[action] ?? { variant: 'outline' as const, label: action }
  return <Badge variant={m.variant}>{m.label}</Badge>
}

export default function AuditLogsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [tableFilter, setTableFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [showDiff, setShowDiff] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, search, actionFilter, tableFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (search) query = query.or(`user_id.ilike.%${search}%,table_name.ilike.%${search}%,action.ilike.%${search}%,ip_address.ilike.%${search}%`)
      if (actionFilter && actionFilter !== 'all') query = query.eq('action', actionFilter)
      if (tableFilter && tableFilter !== 'all') query = query.eq('table_name', tableFilter)
      if (dateFrom) query = query.gte('created_at', dateFrom)
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)

      const from = (page - 1) * PAGE_SIZE
      const { data, count } = await query.range(from, from + PAGE_SIZE - 1)
      return { logs: data ?? [], total: count ?? 0 }
    },
  })

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))

  const exportMutation = useMutation({
    mutationFn: async () => {
      let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false })
      if (actionFilter !== 'all') query = query.eq('action', actionFilter)
      if (tableFilter !== 'all') query = query.eq('table_name', tableFilter)
      if (dateFrom) query = query.gte('created_at', dateFrom)
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)
      const { data: allLogs } = await query
      return allLogs ?? []
    },
    onSuccess: (logs) => {
      if (!logs.length) { toast.error('No data to export'); return }
      const headers = ['Timestamp', 'Action', 'Table', 'Record ID', 'User ID', 'School ID', 'IP Address', 'User Agent']
      const rows = logs.map((l: any) => [
        l.created_at, l.action, l.table_name, l.record_id || '',
        l.user_id || '', l.school_id || '', l.ip_address || '', (l.user_agent || '').replace(/,/g, ' '),
      ])
      const csv = [headers.join(','), ...rows.map((r: any) => r.map((v: any) => `"${v}"`).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success(`Exported ${logs.length} entries`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const formatJSON = (data: any) => {
    if (!data) return '—'
    try {
      const obj = typeof data === 'string' ? JSON.parse(data) : data
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(data)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-edu-blue-600 p-2">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-500">Track all system activity with full audit trail</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Activity Logs
            {data?.total !== undefined && <span className="ml-2 text-sm font-normal text-gray-500">({data.total} entries)</span>}
          </CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search user, table, IP..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
            </div>
            <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1) }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTIONS.map((a: any) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={v => { setTableFilter(v); setPage(1) }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Table" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {TABLES.map((t: any) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="w-36" />
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="w-36" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Record ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead className="w-20">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.logs?.length ? data.logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-gray-500 text-xs">{formatDateTime(log.created_at)}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-600">{log.table_name}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-400">
                          {log.record_id ? `${log.record_id.slice(0, 8)}...` : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-400">
                          {log.user_id ? `${log.user_id.slice(0, 8)}...` : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-400">{log.ip_address || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(log.old_data || log.new_data) && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedLog(log); setShowDiff(true) }}>
                                <Diff className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedLog(log); setShowDiff(false) }}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={7} className="py-12 text-center text-gray-500">No audit logs found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getActionBadge(selectedLog.action)}
                  <span className="font-mono text-sm">{selectedLog.table_name}</span>
                  <span className="text-xs text-muted-foreground font-mono">#{selectedLog.record_id?.slice(0, 12) ?? 'N/A'}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-xs">{selectedLog.user_id || '—'}</span></div>
                  <div><span className="text-muted-foreground">School ID:</span> <span className="font-mono text-xs">{selectedLog.school_id || '—'}</span></div>
                  <div><span className="text-muted-foreground">IP Address:</span> <code className="text-xs">{selectedLog.ip_address || '—'}</code></div>
                  <div><span className="text-muted-foreground">User Agent:</span> <span className="text-xs truncate block">{selectedLog.user_agent || '—'}</span></div>
                  <div><span className="text-muted-foreground">Timestamp:</span> <span>{formatDateTime(selectedLog.created_at)}</span></div>
                </div>

                {showDiff && (selectedLog.old_data || selectedLog.new_data) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-red-600 mb-1">Old Data</h4>
                        <pre className="bg-red-50 border border-red-200 rounded p-2 text-xs overflow-x-auto max-h-60">
                          {formatJSON(selectedLog.old_data)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-green-600 mb-1">New Data</h4>
                        <pre className="bg-green-50 border border-green-200 rounded p-2 text-xs overflow-x-auto max-h-60">
                          {formatJSON(selectedLog.new_data)}
                        </pre>
                      </div>
                    </div>
                  </>
                )}

                {!showDiff && (selectedLog.old_data || selectedLog.new_data) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-xs font-semibold mb-1">Full Data</h4>
                      <pre className="bg-muted rounded p-2 text-xs overflow-x-auto max-h-60">
                        {formatJSON(selectedLog.new_data || selectedLog.old_data)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
