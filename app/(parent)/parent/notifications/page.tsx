'use client'

import { useQuery } from '@tanstack/react-query'
import { getParentAnnouncements } from '@/lib/actions/parent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Megaphone, Bell } from 'lucide-react'
import { format } from 'date-fns'

export default function NotificationsPage() {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['parent-announcements'],
    queryFn: () => getParentAnnouncements(),
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-600 mt-1">School announcements and updates</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !announcements?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No notifications yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <Card key={a.id}>
              <CardContent className="flex items-start gap-4 py-5">
                <div className="p-2.5 rounded-full bg-emerald-100 flex-shrink-0">
                  <Megaphone className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base">{a.title}</p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(a.created_at), 'MMM d, yyyy')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
