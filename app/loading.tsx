import { Skeleton } from '@/components/ui/skeleton'

export default function RootLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-edu-blue-600">
          <span className="text-lg font-bold text-white">E</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-edu-blue-600" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-edu-blue-600" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-edu-blue-600" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
