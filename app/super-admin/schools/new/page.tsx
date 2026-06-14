'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react'
import { createSchool } from '@/lib/actions/super-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const steps = [
  { id: 1, title: 'School Info' },
  { id: 2, title: 'Admin Account' },
  { id: 3, title: 'Subscription Plan' },
  { id: 4, title: 'Review' },
]

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    students: 100,
    teachers: 10,
    features: ['Basic analytics', 'Up to 100 students', 'Email support'],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '$49',
    period: 'per month',
    students: 500,
    teachers: 50,
    features: [
      'Advanced analytics',
      'Up to 500 students',
      'Priority email support',
      'Custom branding',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$149',
    period: 'per month',
    students: 2000,
    teachers: 200,
    features: [
      'All Basic features',
      'Up to 2000 students',
      'Phone & email support',
      'API access',
      'Bulk operations',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$499',
    period: 'per month',
    students: 10000,
    teachers: 1000,
    features: [
      'All Pro features',
      'Unlimited students',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'On-premise option',
    ],
  },
]

export default function NewSchoolPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'United States',
    postalCode: '',
    logoUrl: '',
    subscriptionPlan: 'free',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
  })

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await createSchool(form)
      toast.success('School created successfully')
      router.push('/super-admin/schools')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-edu-blue-600 p-2">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create New School
          </h1>
          <p className="text-sm text-gray-500">
            Set up a new school on the platform
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  s.id < step
                    ? 'bg-edu-blue-600 text-white'
                    : s.id === step
                      ? 'border-2 border-edu-blue-600 text-edu-blue-600'
                      : 'border-2 border-gray-300 text-gray-400'
                }`}
              >
                {s.id < step ? (
                  <Check className="h-4 w-4" />
                ) : (
                  s.id
                )}
              </div>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  s.id <= step ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {s.title}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-8 sm:w-16 ${
                  s.id < step ? 'bg-edu-blue-600' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[step - 1].title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>School Name *</Label>
                  <Input
                    placeholder="e.g. Springfield Elementary"
                    value={form.name}
                    onChange={(e) => {
                      update('name', e.target.value)
                      update(
                        'slug',
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-|-$/g, '')
                      )
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input
                    placeholder="springfield-elementary"
                    value={form.slug}
                    onChange={(e) => update('slug', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={form.logoUrl}
                  onChange={(e) => update('logoUrl', e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="admin@school.com"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address *</Label>
                <Input
                  placeholder="123 Main Street"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    placeholder="New York"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Input
                    placeholder="NY"
                    value={form.state}
                    onChange={(e) => update('state', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code *</Label>
                  <Input
                    placeholder="10001"
                    value={form.postalCode}
                    onChange={(e) => update('postalCode', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Input
                    placeholder="United States"
                    value={form.country}
                    onChange={(e) => update('country', e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-gray-500">
                Create the school administrator account
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    placeholder="John"
                    value={form.adminFirstName}
                    onChange={(e) => update('adminFirstName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    placeholder="Doe"
                    value={form.adminLastName}
                    onChange={(e) => update('adminLastName', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="john.doe@school.com"
                    value={form.adminEmail}
                    onChange={(e) => update('adminEmail', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+1 (555) 987-6543"
                    value={form.adminPhone}
                    onChange={(e) => update('adminPhone', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={form.adminPassword}
                  onChange={(e) => update('adminPassword', e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-gray-500">
                Choose a subscription plan for the school
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => update('subscriptionPlan', plan.id)}
                    className={`rounded-lg border-2 p-4 text-left transition-all ${
                      form.subscriptionPlan === plan.id
                        ? 'border-edu-blue-600 bg-edu-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg font-bold">{plan.name}</div>
                    <div className="mt-1 text-2xl font-bold text-edu-blue-600">
                      {plan.price}
                    </div>
                    <div className="text-xs text-gray-500">{plan.period}</div>
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Students</span>
                        <span className="font-medium">{plan.students}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Teachers</span>
                        <span className="font-medium">{plan.teachers}</span>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <ul className="space-y-1">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-1 text-xs text-gray-600"
                        >
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900">
                  School Information
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>{' '}
                    {form.name}
                  </div>
                  <div>
                    <span className="text-gray-500">Slug:</span>{' '}
                    {form.slug}
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>{' '}
                    {form.email}
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>{' '}
                    {form.phone}
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Address:</span>{' '}
                    {form.address}, {form.city}, {form.state}{' '}
                    {form.postalCode}, {form.country}
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Admin Account
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>{' '}
                    {form.adminFirstName} {form.adminLastName}
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>{' '}
                    {form.adminEmail}
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>{' '}
                    {form.adminPhone}
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Subscription Plan
                </h3>
                <p className="mt-1 text-sm capitalize">
                  {form.subscriptionPlan}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={step === 1}
          onClick={() => setStep(step - 1)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => {
              if (step === 1 && !form.name) {
                toast.error('School name is required')
                return
              }
              if (step === 2 && (!form.adminFirstName || !form.adminEmail || !form.adminPassword)) {
                toast.error('Please fill in all required admin fields')
                return
              }
              setStep(step + 1)
            }}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create School'}
          </Button>
        )}
      </div>
    </div>
  )
}
