import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-edu-blue-100">
          <svg className="h-10 w-10 text-edu-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re Offline</h1>
        <p className="text-gray-500 mb-8">
          Please check your internet connection. Some features may be limited until you&apos;re back online.
        </p>
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-edu-blue-600 px-6 text-sm font-medium text-white hover:bg-edu-blue-700 transition-colors"
        >
          Try Again
        </Link>
      </div>
    </div>
  )
}
