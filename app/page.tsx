'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Users, BookOpen, Shield, ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const portals = [
  {
    id: 'student',
    title: 'Student Portal',
    description: 'View your classes, assignments, grades, attendance, and timetable',
    icon: GraduationCap,
    gradient: 'from-blue-500 to-blue-600',
    hoverGradient: 'from-blue-600 to-blue-700',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  {
    id: 'parent',
    title: 'Parent Portal',
    description: 'Monitor your child\'s academic progress, attendance, fees, and school activities',
    icon: Users,
    gradient: 'from-emerald-500 to-emerald-600',
    hoverGradient: 'from-emerald-600 to-emerald-700',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  {
    id: 'teacher',
    title: 'Teacher Portal',
    description: 'Manage classes, assignments, attendance, exams, and communicate with parents',
    icon: BookOpen,
    gradient: 'from-purple-500 to-purple-600',
    hoverGradient: 'from-purple-600 to-purple-700',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const [clicks, setClicks] = useState(0)
  const [showAdmin, setShowAdmin] = useState(false)

  const handleLogoClick = () => {
    const next = clicks + 1
    setClicks(next)
    if (next >= 5) {
      setShowAdmin(true)
      setClicks(0)
    }
  }

  const handlePortalClick = (role: string) => {
    if (role === 'parent') {
      router.push('/parent-login')
    } else {
      router.push(`/login?role=${role}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-edu-blue-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={handleLogoClick} className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-edu-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">EduCore</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => router.push('/register')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-edu-blue-50 border border-edu-blue-100 text-sm text-edu-blue-700 font-medium mb-6">
          <Shield className="h-4 w-4" />
          Multi-Tenant School Management System
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-edu-blue-600 to-edu-blue-800 bg-clip-text text-transparent">
            EduCore
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-4">
          Your comprehensive school management platform. Choose your portal below to get started.
        </p>
        <p className="text-sm text-gray-400">Select your role to sign in or create your account</p>
      </section>

      {/* Portal Cards */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {portals.map((portal) => {
            const Icon = portal.icon
            return (
              <Card
                key={portal.id}
                className="group cursor-pointer border-2 border-gray-100 hover:border-edu-blue-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                onClick={() => handlePortalClick(portal.id)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${portal.bgLight} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${portal.textColor}`} />
                  </div>
                  <CardTitle className="text-xl">{portal.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {portal.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`inline-flex items-center gap-1 text-sm font-medium ${portal.textColor} group-hover:gap-2 transition-all`}>
                    Enter Portal <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Staff Access — subtle */}
        <div className="mt-10 text-center">
          <div className="border-t border-gray-100 pt-8">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              Staff & Administration Access
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <section className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Schools Managed', value: '50+' },
              { label: 'Active Students', value: '25,000+' },
              { label: 'Teachers', value: '2,000+' },
              { label: 'Parents Connected', value: '15,000+' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-edu-blue-600">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <GraduationCap className="h-4 w-4" />
            &copy; {new Date().getFullYear()} EduCore. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Contact Support</span>
            {showAdmin && (
              <button onClick={() => router.push('/login')} className="text-red-400 hover:text-red-600 font-medium transition-colors">
                Super Admin
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
