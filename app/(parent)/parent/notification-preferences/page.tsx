'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/actions/parent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Bell, Mail, Smartphone, BellRing, DollarSign, GraduationCap, Megaphone, MegaphoneOff, Moon, CalendarCheck } from 'lucide-react'

interface NotificationPrefs {
  email_notifications: boolean
  sms_notifications: boolean
  push_notifications: boolean
  attendance_alerts: boolean
  fee_reminders: boolean
  exam_results: boolean
  announcements: boolean
  marketing_emails: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export default function NotificationPreferencesPage() {
  const queryClient = useQueryClient()

  const { data: prefs, isLoading } = useQuery<NotificationPrefs>({
    queryKey: ['notification-preferences'],
    queryFn: () => getNotificationPreferences() as Promise<NotificationPrefs>,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<NotificationPrefs>) => updateNotificationPreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      toast.success('Preferences saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggle = (key: keyof NotificationPrefs) => {
    if (!prefs) return
    updateMutation.mutate({ [key]: !prefs[key] })
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="text-gray-500 mt-1">Control how and when we send you updates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellRing className="h-5 w-5 text-emerald-600" />
            Delivery Channels
          </CardTitle>
          <CardDescription>Choose which channels we use to reach you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <Label htmlFor="email_notifications" className="font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
            </div>
            <Switch id="email_notifications" checked={prefs?.email_notifications ?? true} onCheckedChange={() => toggle('email_notifications')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <Label htmlFor="sms_notifications" className="font-medium">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive important alerts via SMS</p>
              </div>
            </div>
            <Switch id="sms_notifications" checked={prefs?.sms_notifications ?? false} onCheckedChange={() => toggle('sms_notifications')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <Label htmlFor="push_notifications" className="font-medium">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive in-app notifications and browser alerts</p>
              </div>
            </div>
            <Switch id="push_notifications" checked={prefs?.push_notifications ?? true} onCheckedChange={() => toggle('push_notifications')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellRing className="h-5 w-5 text-emerald-600" />
            Alert Types
          </CardTitle>
          <CardDescription>Choose which types of notifications to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <CalendarCheck className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <Label htmlFor="attendance_alerts" className="font-medium">Attendance Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when your child is marked absent or late</p>
              </div>
            </div>
            <Switch id="attendance_alerts" checked={prefs?.attendance_alerts ?? true} onCheckedChange={() => toggle('attendance_alerts')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <Label htmlFor="fee_reminders" className="font-medium">Fee Reminders</Label>
                <p className="text-sm text-muted-foreground">Receive reminders about upcoming and overdue fees</p>
              </div>
            </div>
            <Switch id="fee_reminders" checked={prefs?.fee_reminders ?? true} onCheckedChange={() => toggle('fee_reminders')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <Label htmlFor="exam_results" className="font-medium">Exam Results</Label>
                <p className="text-sm text-muted-foreground">Get notified when exam results are published</p>
              </div>
            </div>
            <Switch id="exam_results" checked={prefs?.exam_results ?? true} onCheckedChange={() => toggle('exam_results')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Megaphone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <Label htmlFor="announcements" className="font-medium">School Announcements</Label>
                <p className="text-sm text-muted-foreground">Receive general announcements from the school</p>
              </div>
            </div>
            <Switch id="announcements" checked={prefs?.announcements ?? true} onCheckedChange={() => toggle('announcements')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <MegaphoneOff className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <Label htmlFor="marketing_emails" className="font-medium">Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">Receive promotional and marketing communications</p>
              </div>
            </div>
            <Switch id="marketing_emails" checked={prefs?.marketing_emails ?? false} onCheckedChange={() => toggle('marketing_emails')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Moon className="h-5 w-5 text-emerald-600" />
            Quiet Hours
          </CardTitle>
          <CardDescription>Suppress notifications during specific hours</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Quiet hours allow you to mute non-critical notifications during your preferred times.
            Configure start and end times to avoid late-night alerts.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="quiet_start">Quiet Hours Start</Label>
              <input
                id="quiet_start"
                type="time"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prefs?.quiet_hours_start ?? ''}
                onChange={(e) => updateMutation.mutate({ quiet_hours_start: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet_end">Quiet Hours End</Label>
              <input
                id="quiet_end"
                type="time"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prefs?.quiet_hours_end ?? ''}
                onChange={(e) => updateMutation.mutate({ quiet_hours_end: e.target.value || null })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        Preferences are saved automatically when you toggle any option.
      </div>
    </div>
  )
}


