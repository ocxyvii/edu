'use client'

import { useQuery } from '@tanstack/react-query'
import { getLibraryStats } from '@/lib/actions/library.actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users, Clock, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16']

export function LibraryReports() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['library-stats'],
    queryFn: getLibraryStats,
    refetchInterval: 60000,
  })

  if (isLoading) return <div className="space-y-4">{[...Array(4)].map((_: any, i: any) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  if (!stats) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBooks}</div>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.availableBooks}</div>
            <p className="text-xs text-muted-foreground">{stats.totalBooks > 0 ? Math.round((stats.availableBooks / stats.totalBooks) * 100) : 0}% of catalog</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Checked Out</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.issuedBooks}</div>
            <p className="text-xs text-muted-foreground">Currently issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueBooks}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Fines Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.totalFinesCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total from late returns</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Most Borrowed Books</CardTitle>
            <CardDescription>Top 10 most frequently issued books</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.mostBorrowed.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No borrowing data yet</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.mostBorrowed} layout="vertical">
                    <XAxis type="number" fontSize={12} />
                    <YAxis type="category" dataKey="title" width={150} fontSize={11} tickFormatter={(v) => v.length > 20 ? `${v.slice(0, 20)}...` : v} />
                    <Tooltip formatter={(value: number, _: any, props: any) => [value, props.payload.title]} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Books by Category</CardTitle>
            <CardDescription>Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.booksByCategory.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No categories defined</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.booksByCategory}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {stats.booksByCategory.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, _: any, props: any) => [value, props.payload.name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Library Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-blue-50">
              <p className="text-sm text-blue-700 font-medium">{stats.activeMembers}</p>
              <p className="text-xs text-blue-600">Active Borrowers</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <p className="text-sm text-green-700 font-medium">{stats.totalBooks > 0 ? Math.round((stats.availableBooks / stats.totalBooks) * 100) : 0}%</p>
              <p className="text-xs text-green-600">Availability Rate</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50">
              <p className="text-sm text-amber-700 font-medium">{stats.totalBooks > 0 ? Math.round((stats.issuedBooks / stats.totalBooks) * 100) : 0}%</p>
              <p className="text-xs text-amber-600">Utilization Rate</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <p className="text-sm text-purple-700 font-medium">{stats.mostBorrowed[0]?.title || 'N/A'}</p>
              <p className="text-xs text-purple-600">Most Popular Book</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
