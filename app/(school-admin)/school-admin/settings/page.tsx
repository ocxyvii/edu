'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSchool, updateSchool, getAcademicYears, createAcademicYear, setCurrentAcademicYear, getCurrentAcademicYear, getCurrentTerm, getTerms, createTerm, setCurrentTerm } from '@/lib/actions/school-admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Save, Loader2, Plus, School, Calendar, Settings as SettingsIcon } from 'lucide-react'

export default function AdminSettingsPage() {
  const queryClient = useQueryClient()

  const { data: school, isLoading: schoolLoading } = useQuery({ queryKey: ['school'], queryFn: getSchool })
  const { data: academicYears } = useQuery({ queryKey: ['academic-years'], queryFn: getAcademicYears })
  const { data: currentAcademicYear } = useQuery({ queryKey: ['current-academic-year'], queryFn: getCurrentAcademicYear })
  const { data: currentTerm } = useQuery({ queryKey: ['current-term'], queryFn: getCurrentTerm })
  const { data: terms } = useQuery({
    queryKey: ['terms', currentAcademicYear?.id],
    queryFn: () => currentAcademicYear?.id ? getTerms(currentAcademicYear.id) : Promise.resolve([]),
    enabled: !!currentAcademicYear?.id,
  })

  const [schoolForm, setSchoolForm] = useState<Record<string, string>>({})
  const [newYearForm, setNewYearForm] = useState({ name: '', start_date: '', end_date: '' })
  const [newTermForm, setNewTermForm] = useState({ name: '', start_date: '', end_date: '' })
  const [showNewYear, setShowNewYear] = useState(false)
  const [showNewTerm, setShowNewTerm] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateSchool(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school'] })
      toast.success('School updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createYearMutation = useMutation({
    mutationFn: () => createAcademicYear(newYearForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] })
      setShowNewYear(false)
      setNewYearForm({ name: '', start_date: '', end_date: '' })
      toast.success('Academic year created')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createTermMutation = useMutation({
    mutationFn: () => createTerm({ ...newTermForm, academic_year_id: currentAcademicYear?.id ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] })
      setShowNewTerm(false)
      setNewTermForm({ name: '', start_date: '', end_date: '' })
      toast.success('Term created')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (schoolLoading) return <div className="space-y-4">{[...Array(4)].map((_: any, i: any) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage school configuration and academic calendar" />

      <Tabs defaultValue="school">
        <TabsList>
          <TabsTrigger value="school"><School className="mr-2 h-4 w-4" /> School Info</TabsTrigger>
          <TabsTrigger value="academic"><Calendar className="mr-2 h-4 w-4" /> Academic Calendar</TabsTrigger>
          <TabsTrigger value="preferences"><SettingsIcon className="mr-2 h-4 w-4" /> Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="school">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">School Information</CardTitle>
              <CardDescription>Update your school&apos;s profile details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['name', 'email', 'phone', 'address', 'city', 'state', 'country', 'postal_code', 'website'].map((field: any) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs capitalize">{field.replace(/_/g, ' ')}</Label>
                    <Input
                      defaultValue={(school as any)?.[field] ?? ''}
                      onChange={e => setSchoolForm(f => ({ ...f, [field]: e.target.value }))}
                      placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                    />
                  </div>
                ))}
              </div>
              <Button className="mt-6" onClick={() => updateMutation.mutate(schoolForm)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Academic Years</CardTitle>
                  <CardDescription>Current: {currentAcademicYear?.name ?? 'None set'}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowNewYear(!showNewYear)}><Plus className="mr-2 h-4 w-4" /> New Year</Button>
              </CardHeader>
              <CardContent>
                {showNewYear && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 border rounded-lg bg-muted/30">
                    <Input value={newYearForm.name} onChange={e => setNewYearForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 2025-2026" />
                    <Input type="date" value={newYearForm.start_date} onChange={e => setNewYearForm(f => ({ ...f, start_date: e.target.value }))} />
                    <Input type="date" value={newYearForm.end_date} onChange={e => setNewYearForm(f => ({ ...f, end_date: e.target.value }))} />
                    <Button onClick={() => createYearMutation.mutate()} disabled={!newYearForm.name || createYearMutation.isPending}>
                      {createYearMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Create
                    </Button>
                  </div>
                )}
                {!academicYears?.length ? (
                  <p className="text-sm text-muted-foreground">No academic years created.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Name</th>
                        <th className="text-left py-2 font-medium">Start</th>
                        <th className="text-left py-2 font-medium">End</th>
                        <th className="text-center py-2 font-medium">Status</th>
                        <th className="text-center py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {academicYears.map((y: any) => (
                        <tr key={y.id} className="border-b">
                          <td className="py-2 font-medium">{y.name}</td>
                          <td className="py-2 text-muted-foreground">{y.start_date}</td>
                          <td className="py-2 text-muted-foreground">{y.end_date}</td>
                          <td className="py-2 text-center">{y.is_current ? <span className="text-green-600 font-medium">Current</span> : '-'}</td>
                          <td className="py-2 text-center">
                            {!y.is_current && (
                              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setCurrentAcademicYear(y.id); toast.success('Updated') }}>
                                Set Current
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Terms</CardTitle>
                  <CardDescription>Current: {currentTerm?.name ?? 'None set'} ({currentAcademicYear?.name ?? 'N/A'})</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowNewTerm(!showNewTerm)} disabled={!currentAcademicYear}><Plus className="mr-2 h-4 w-4" /> New Term</Button>
              </CardHeader>
              <CardContent>
                {showNewTerm && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 border rounded-lg bg-muted/30">
                    <Input value={newTermForm.name} onChange={e => setNewTermForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Term 1" />
                    <Input type="date" value={newTermForm.start_date} onChange={e => setNewTermForm(f => ({ ...f, start_date: e.target.value }))} />
                    <Input type="date" value={newTermForm.end_date} onChange={e => setNewTermForm(f => ({ ...f, end_date: e.target.value }))} />
                    <Button onClick={() => createTermMutation.mutate()} disabled={!newTermForm.name || createTermMutation.isPending}>
                      {createTermMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Create
                    </Button>
                  </div>
                )}
                {!terms?.length ? (
                  <p className="text-sm text-muted-foreground">No terms for this academic year.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Name</th>
                        <th className="text-left py-2 font-medium">Start</th>
                        <th className="text-left py-2 font-medium">End</th>
                        <th className="text-center py-2 font-medium">Status</th>
                        <th className="text-center py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {terms.map((t: any) => (
                        <tr key={t.id} className="border-b">
                          <td className="py-2 font-medium">{t.name}</td>
                          <td className="py-2 text-muted-foreground">{t.start_date}</td>
                          <td className="py-2 text-muted-foreground">{t.end_date}</td>
                          <td className="py-2 text-center">{t.is_active ? <span className="text-green-600 font-medium">Active</span> : '-'}</td>
                          <td className="py-2 text-center">
                            {!t.is_active && (
                              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setCurrentTerm(t.id); toast.success('Updated') }}>
                                Set Active
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">School Preferences</CardTitle>
              <CardDescription>Configure default settings for your school</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Default Currency</Label>
                  <Select defaultValue={(school as any)?.settings?.fee_structure?.currency ?? 'KES'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                      <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Late Fee (%)</Label>
                  <Input defaultValue={(school as any)?.settings?.fee_structure?.late_fee_percentage ?? '5'} type="number" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Required Attendance %</Label>
                  <Input defaultValue={(school as any)?.settings?.attendance_policy?.required_attendance_percentage ?? '80'} type="number" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Allowed Absences per Term</Label>
                  <Input defaultValue={(school as any)?.settings?.attendance_policy?.allowed_absences_per_term ?? '10'} type="number" />
                </div>
              </div>
              <Button className="mt-6">
                <Save className="mr-2 h-4 w-4" /> Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
