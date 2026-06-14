import { createClient, createServiceClient } from '@/lib/supabase/server'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const MAX_API_REQUESTS = 100

interface RateLimitEntry {
  count: number
  windowStart: number
}

const memoryStore = new Map<string, RateLimitEntry>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memoryStore.entries()) {
    if (now - entry.windowStart > WINDOW_MS) {
      memoryStore.delete(key)
    }
  }
}, 60_000)

export async function checkLoginRateLimit(email: string, ip: string): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const key = `login:${ip}:${email.toLowerCase()}`
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    memoryStore.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetIn: WINDOW_MS }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const resetIn = WINDOW_MS - (now - entry.windowStart)
    return { allowed: false, remaining: 0, resetIn }
  }

  entry.count++
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count, resetIn: WINDOW_MS - (now - entry.windowStart) }
}

export async function checkApiRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `api:${userId}`
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now - entry.windowStart > 60_000) {
    memoryStore.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: MAX_API_REQUESTS - 1 }
  }

  if (entry.count >= MAX_API_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: MAX_API_REQUESTS - entry.count }
}

export async function recordFailedAttempt(email: string, ip: string): Promise<void> {
  const key = `login:${ip}:${email.toLowerCase()}`
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    memoryStore.set(key, { count: 1, windowStart: now })
  } else {
    entry.count++
  }
}

export async function resetLoginRateLimit(email: string, ip: string): Promise<void> {
  const key = `login:${ip}:${email.toLowerCase()}`
  memoryStore.delete(key)
}
