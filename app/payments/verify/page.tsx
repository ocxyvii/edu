'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { verifyPayment } from '@/lib/actions/payment.actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function PaymentVerifyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const ref = searchParams.get('ref')
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!ref) {
      setStatus('error')
      setMessage('No transaction reference provided')
      return
    }

    verifyPayment(ref)
      .then(() => {
        setStatus('success')
        setMessage('Payment verified successfully! Your invoice has been updated.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message || 'Verification failed')
      })
  }, [ref])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {status === 'verifying' && <Loader2 className="h-16 w-16 animate-spin text-blue-500" />}
            {status === 'success' && <CheckCircle className="h-16 w-16 text-green-500" />}
            {status === 'error' && <XCircle className="h-16 w-16 text-red-500" />}
          </div>
          <CardTitle>
            {status === 'verifying' && 'Verifying Payment...'}
            {status === 'success' && 'Payment Successful'}
            {status === 'error' && 'Payment Verification Failed'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {status !== 'verifying' && (
            <>
              <Button className="w-full" asChild>
                <Link href="/parent/fees">View My Fees</Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
                Go to Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
