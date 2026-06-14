'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getParentEmailByAdmissionNumber } from '@/lib/actions/parent-auth.actions'
import { Users, Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function ParentLoginPage() {
  const router = useRouter()
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!admissionNumber.trim()) {
      setError("Please enter your child's admission number")
      return
    }
    if (!password) {
      setError('Please enter your password')
      return
    }

    setLoading(true)

    try {
      const lookup = await getParentEmailByAdmissionNumber(admissionNumber)

      if (!lookup.found) {
        setError(lookup.error ?? 'Student not found')
        return
      }

      const supabase = createClient()

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: lookup.parentEmail!,
        password,
      })

      if (authError) {
        if (
          authError.message.includes('Invalid login credentials')
        ) {
          setError('Incorrect password. Please try again.')
        } else {
          setError('Login failed. Please try again.')
        }
        return
      }

      router.push('/parent')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Parent Portal
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Monitor your child&apos;s academic journey
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="admissionNumber"
                className="text-sm font-medium text-gray-700"
              >
                Child&apos;s Admission Number
              </label>
              <input
                id="admissionNumber"
                type="text"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                placeholder="e.g. GFA-2025-0001"
                autoCapitalize="characters"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400 font-mono"
                required
              />
              <p className="text-xs text-gray-400">
                Enter the admission number shown on your child&apos;s
                enrollment letter
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Your Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-400">
                Use the password provided in your child&apos;s
                enrollment letter
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white rounded-lg py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              Your login details were provided in your child&apos;s
              enrollment letter from the school.
              Contact the school office if you need help.
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Return to portal selection
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          EduCore School Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
