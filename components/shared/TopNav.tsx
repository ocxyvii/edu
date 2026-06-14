'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { EduCoreAvatar } from '@/components/ui/EduCoreAvatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Bell, Search, LogOut, User, Settings, ChevronDown, Menu, X,
  Command, MessageSquare,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopNavProps {
  schoolName?: string
  userName?: string
  userAvatar?: string | null
  userEmail?: string
  unreadCount?: number
  notificationsHref?: string
  profileHref?: string
  settingsHref?: string
  onMenuToggle?: () => void
  onCommandOpen?: () => void
  showMobileMenu?: boolean
}

export function TopNav({
  schoolName,
  userName,
  userAvatar,
  userEmail,
  unreadCount = 0,
  notificationsHref = '/notifications',
  profileHref = '/profile',
  settingsHref = '/settings',
  onMenuToggle,
  onCommandOpen,
  showMobileMenu,
}: TopNavProps) {
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onCommandOpen?.()
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onCommandOpen])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/login')
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
      {onMenuToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-10 w-10"
          onClick={onMenuToggle}
        >
          {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {schoolName && (
        <span className="text-sm font-bold text-gray-900 truncate lg:hidden">
          {schoolName}
        </span>
      )}

      <div className="hidden sm:flex flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <button
          onClick={onCommandOpen}
          className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-9 text-sm text-muted-foreground text-left hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Search pages, students...
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground opacity-100">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden h-10 w-10 ml-auto"
        onClick={onCommandOpen}
      >
        <Search className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="relative h-10 w-10" asChild>
          <Link href={notificationsHref}>
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        </Button>

        <Button variant="ghost" size="icon" className="relative h-10 w-10 hidden sm:flex">
          <MessageSquare className="h-5 w-5 text-gray-600" />
        </Button>

        {userName && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-10 px-2 ml-1"
              >
                <EduCoreAvatar name={userName} avatarUrl={userAvatar} size="sm" />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium leading-tight text-gray-900 truncate max-w-[120px]">
                    {userName}
                  </p>
                  {userEmail && (
                    <p className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                      {userEmail}
                    </p>
                  )}
                </div>
                <ChevronDown className="hidden md:block h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(profileHref)}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(settingsHref)}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!userName && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-600"
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        )}
      </div>
    </header>
  )
}
