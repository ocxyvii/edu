'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudentProfile, updateStudentProfile, changeStudentPassword } from '@/lib/actions/student'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Save, Key } from 'lucide-react'

export default function StudentProfilePage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => getStudentProfile(),
  })

  const profile = data?.profile

  const profileMutation = useMutation({
    mutationFn: () => updateStudentProfile({ phone, avatar_url: avatarUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile'] })
      setEditing(false)
      toast.success('Profile updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const passwordMutation = useMutation({
    mutationFn: () => changeStudentPassword(currentPw, newPw),
    onSuccess: () => {
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      toast.success('Password changed')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const startEditing = () => {
    setPhone(profile?.phone ?? '')
    setAvatarUrl(profile?.avatar_url ?? '')
    setEditing(true)
  }

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : ''

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account settings</p>
      </div>

      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : (
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Personal Info</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile?.avatar_url ?? ''} />
                    <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">{profile?.first_name} {profile?.last_name}</CardTitle>
                    <CardDescription>{profile?.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Role</span>
                    <p className="font-medium capitalize">{profile?.role}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <p className="font-medium">{profile?.phone ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender</span>
                    <p className="font-medium capitalize">{profile?.gender ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date of Birth</span>
                    <p className="font-medium">{profile?.date_of_birth ?? '—'}</p>
                  </div>
                </div>
                {!editing && <Button onClick={startEditing} className="mt-4">Edit Profile</Button>}
              </CardContent>
            </Card>

            {editing && (
              <Card>
                <CardHeader><CardTitle>Edit Profile</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
                  </div>
                  <div>
                    <Label>Avatar URL</Label>
                    <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
                      {profileMutation.isPending ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="security" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>New Password</Label>
                  <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Enter new password" />
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm new password" />
                </div>
                <Button
                  onClick={() => passwordMutation.mutate()}
                  disabled={passwordMutation.isPending || !newPw || newPw !== confirmPw || newPw.length < 6}
                >
                  {passwordMutation.isPending ? 'Changing...' : <><Key className="h-4 w-4 mr-2" /> Change Password</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
