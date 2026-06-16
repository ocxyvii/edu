'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Check, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateSchoolSubscription } from '@/lib/actions/super-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const supabase = createClient()

const planTiers = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    color: 'bg-gray-100 text-gray-700',
    schools: 0,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '$49/mo',
    color: 'bg-blue-100 text-blue-700',
    schools: 0,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$149/mo',
    color: 'bg-purple-100 text-purple-700',
    schools: 0,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$499/mo',
    color: 'bg-amber-100 text-amber-700',
    schools: 0,
  },
]

async function fetchSubscriptions() {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, subscription_plan, is_active, created_at, email')
    .order('name')

  if (error) throw error

  const schools = data ?? []
  const counts: Record<string, number> = {}
  schools.forEach((s: any) => {
    const tier = s.subscription_plan || 'free'
    counts[tier] = (counts[tier] || 0) + 1
  })

  return { schools: schools as any[], counts }
}

export default function SubscriptionsPage() {
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editPlan, setEditPlan] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions,
  })

  const mutation = useMutation({
    mutationFn: async ({
      schoolId,
      plan,
    }: {
      schoolId: string
      plan: string
    }) => updateSchoolSubscription(schoolId, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscription updated')
      setEditId(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const counts = data?.counts ?? {}
  const plans = planTiers.map((p: any) => ({
    ...p,
    schools: counts[p.id] ?? 0,
  }))

  const filtered = (data?.schools ?? []).filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-edu-blue-600 p-2">
          <CreditCard className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Subscriptions
          </h1>
          <p className="text-sm text-gray-500">
            Manage plan tiers and school subscriptions
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan: any) => (
          <Card key={plan.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{plan.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-edu-blue-600">
                {plan.price}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {plan.schools} school{plan.schools !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              School Subscriptions
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search schools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_: any, i: any) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((school: any) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">
                        {school.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            school.subscription_plan === 'enterprise'
                              ? 'default'
                              : school.subscription_plan === 'pro'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="capitalize"
                        >
                          {school.subscription_plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            school.is_active ? 'default' : 'destructive'
                          }
                        >
                          {school.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog
                          open={editId === school.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setEditId(school.id)
                              setEditPlan(school.subscription_plan)
                            } else {
                              setEditId(null)
                            }
                          }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditId(school.id)
                              setEditPlan(school.subscription_plan)
                            }}
                          >
                            Change Plan
                          </Button>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change Plan</DialogTitle>
                              <DialogDescription>
                                Update subscription for {school.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Select
                                value={editPlan}
                                onValueChange={setEditPlan}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select plan" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="basic">Basic</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                  <SelectItem value="enterprise">
                                    Enterprise
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setEditId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() =>
                                  mutation.mutate({
                                    schoolId: school.id,
                                    plan: editPlan,
                                  })
                                }
                                disabled={mutation.isPending}
                              >
                                {mutation.isPending
                                  ? 'Updating...'
                                  : 'Update'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-gray-500"
                    >
                      No schools found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
