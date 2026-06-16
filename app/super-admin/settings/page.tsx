'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Save, Loader2, Shield, Bell, Palette } from 'lucide-react'

const supabase = createClient()

export default function SuperAdminSettingsPage() {
  const [defaultPlanPrice, setDefaultPlanPrice] = useState('')

  const saveMutation = useMutation({
    mutationFn: async () => { /* persist settings to a platform_config table or similar */ },
    onSuccess: () => toast.success('Settings saved'),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Settings" subtitle="Configure EduCore platform defaults" />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general"><Palette className="mr-2 h-4 w-4" /> General</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" /> Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Platform Configuration</CardTitle>
              <CardDescription>Global settings for all schools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Default Subscription Price</Label>
                  <Input type="number" value={defaultPlanPrice} onChange={e => setDefaultPlanPrice(e.target.value)} placeholder="e.g. 9900" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default Currency</Label>
                  <Input defaultValue="KES" disabled className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Students per School</Label>
                  <Input type="number" defaultValue="500" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Teachers per School</Label>
                  <Input type="number" defaultValue="50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default Timezone</Label>
                  <Input defaultValue="Africa/Nairobi" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Trial Period (days)</Label>
                  <Input type="number" defaultValue="14" />
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Feature Toggles</CardTitle>
              <CardDescription>Enable or disable platform-wide features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Online Payments', key: 'online_payments', default: true },
                { label: 'Parent Portal', key: 'parent_portal', default: true },
                { label: 'LMS Module', key: 'lms', default: true },
                { label: 'Library Module', key: 'library', default: true },
                { label: 'HR & Payroll', key: 'hr_payroll', default: true },
                { label: 'Public Admissions', key: 'public_admissions', default: true },
                { label: 'SMS Notifications', key: 'sms', default: false },
                { label: 'Multi-language', key: 'multi_language', default: false },
              ].map((f: any) => (
                <div key={f.key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm">{f.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={f.default} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-edu-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-edu-blue-600" />
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Security Settings</CardTitle>
              <CardDescription>Authentication and access control</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Minimum Password Length</Label>
                  <Input type="number" defaultValue="8" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Session Duration (hours)</Label>
                  <Input type="number" defaultValue="24" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Login Attempts</Label>
                  <Input type="number" defaultValue="5" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lockout Duration (minutes)</Label>
                  <Input type="number" defaultValue="15" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="mfa" defaultChecked className="rounded" />
                <Label htmlFor="mfa" className="text-sm">Require MFA for super admins</Label>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notification Settings</CardTitle>
              <CardDescription>Configure platform-wide notification defaults</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Default From Email</Label>
                  <Input defaultValue="noreply@educore.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default From Name</Label>
                  <Input defaultValue="EduCore" />
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
