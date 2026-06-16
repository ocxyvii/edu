'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from './table'
import { Button } from './button'
import { Input } from './input'
import { Skeleton } from './skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import {
  ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight,
  Search,
} from 'lucide-react'

export interface DataTableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  hideable?: boolean
  hidden?: boolean
  render?: (value: any, row: T, index: number) => React.ReactNode
  cellClassName?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyPreset?: 'noStudents' | 'noResults' | 'noData' | 'error'
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }
  paginated?: boolean
  pageSize?: number
  sortable?: boolean
  selectable?: boolean
  onRowClick?: (row: T) => void
  keyExtractor: (row: T) => string
  className?: string
  page?: number
  total?: number
  onPageChange?: (page: number) => void
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  searchQuery?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyPreset = 'noData',
  emptyTitle,
  emptyDescription,
  emptyAction,
  paginated = false,
  pageSize = 10,
  sortable = false,
  selectable = false,
  onRowClick,
  keyExtractor,
  className,
  page: externalPage,
  total: externalTotal,
  onPageChange,
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  searchQuery,
}: DataTableProps<T>) {
  const [internalPage, setInternalPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [internalSearch, setInternalSearch] = useState('')

  const isControlled = externalPage !== undefined
  const currentPage = isControlled ? externalPage! : internalPage
  const totalPages = externalTotal ? Math.ceil(externalTotal / pageSize) : Math.ceil(data.length / pageSize)

  const visibleColumns = useMemo(
    () => columns.filter((c: any) => !c.hidden),
    [columns],
  )

  const processedData = useMemo(() => {
    const search = (onSearch ? searchQuery : internalSearch) || ''
    let filtered = data
    if (search && !onSearch) {
      const q = search.toLowerCase()
      filtered = data.filter((row: any) =>
        columns.some((col: any) => {
          const val = row[col.key as keyof T]
          return val != null && String(val).toLowerCase().includes(q)
        })
      )
    }

    if (sortKey && sortable) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortKey as keyof T]
        const bVal = b[sortKey as keyof T]
        if (aVal == null) return 1
        if (bVal == null) return -1
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    if (!paginated) return filtered
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [data, columns, sortKey, sortDir, sortable, paginated, currentPage, pageSize, internalSearch, onSearch, searchQuery])

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedRows.size === processedData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(processedData.map((r: any) => keyExtractor(r))))
    }
  }

  const goToPage = (page: number) => {
    if (!isControlled) setInternalPage(page)
    onPageChange?.(page)
  }

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {searchable && <Skeleton className="h-10 w-64 rounded-md" />}
        <div className="rounded-md border">
          <div className="border-b bg-muted/50 p-4">
            <div className="flex gap-4">
              {visibleColumns.map((col: any, i: any) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
          </div>
          {[...Array(5)].map((_: any, i: any) => (
            <div key={i} className="border-b p-4">
              <div className="flex gap-4">
                {visibleColumns.map((col: any, j: any) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!processedData.length) {
    return (
      <div className={cn(className)}>
        {searchable && renderSearchBar()}
        <EmptyState
          preset={emptyPreset}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyAction?.label}
          onAction={emptyAction?.onClick}
        />
      </div>
    )
  }

  function renderSearchBar() {
    return (
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={onSearch ? searchQuery : internalSearch}
          onChange={e => onSearch ? onSearch(e.target.value) : setInternalSearch(e.target.value)}
          className="h-10 w-full max-w-xs pl-9"
        />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {searchable && renderSearchBar()}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === processedData.length && processedData.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
              )}
              {visibleColumns.map((col: any) => (
                <TableHead
                  key={String(col.key)}
                  className={cn(
                    'whitespace-nowrap text-xs font-semibold uppercase tracking-wider',
                    col.sortable && sortable ? 'cursor-pointer select-none' : '',
                    col.headerClassName,
                  )}
                  onClick={() => col.sortable && sortable && toggleSort(String(col.key))}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortable && (
                      sortKey === col.key ? (
                        sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                      )
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.map((row, rowIndex) => {
              const id = keyExtractor(row)
              return (
                <TableRow
                  key={id}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-muted/50',
                    selectable && selectedRows.has(id) && 'bg-primary/5',
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <TableCell className="w-10" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(id)}
                        onChange={() => toggleRow(id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                  )}
                  {visibleColumns.map((col: any) => (
                    <TableCell key={String(col.key)} className={cn('whitespace-nowrap', col.cellClassName)}>
                      {col.render
                        ? col.render(row[col.key as keyof T], row, rowIndex)
                        : (row[col.key as keyof T] ?? '-') as React.ReactNode}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
            {externalTotal !== undefined && ` (${externalTotal} total)`}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, currentPage - 2)
              const pageNum = start + i
              if (pageNum > totalPages) return null
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
