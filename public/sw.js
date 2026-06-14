const CACHE = 'educore-v2'
const STATIC_CACHE = 'educore-static-v2'
const DYNAMIC_CACHE = 'educore-dynamic-v2'

const PRECACHE_URLS = [
  '/',
  '/login',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-192-maskable.svg',
  '/icons/icon-512-maskable.svg',
]

const STATIC_EXTENSIONS = /\.(svg|png|jpg|jpeg|gif|ico|woff2?|ttf|eot)$/

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE && k !== CACHE)
          .map((k) => caches.delete(k))
      )
    }).then(() => self.clients.claim())
  )
})

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
    url.hostname !== self.location.hostname ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.includes('/supabase/rest')
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api/')) {
    return
  }

  if (event.request.method !== 'GET') {
    return
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirstWithFallback(event.request))
  } else if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request))
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithFallback(event.request))
  } else {
    event.respondWith(networkFirstWithFallback(event.request))
  }
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    return await caches.match('/offline')
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    const cached = await caches.match(request)
    if (cached) return cached

    if (request.headers.get('Accept')?.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: 'offline', message: 'You are offline. Data will sync when connection is restored.' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    return await caches.match('/offline')
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    return await caches.match('/offline')
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendanceQueue())
  }
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessageQueue())
  }
})

async function syncAttendanceQueue() {
  try {
    const keys = await self.registration.indexedDB.databases()
    const db = await openDB('educore-offline', 1)
    const tx = db.transaction('offline_queue', 'readwrite')
    const store = tx.objectStore('offline_queue')
    const all = await store.getAll()

    for (const item of all) {
      if (item.type === 'attendance' || item.type === 'message') {
        try {
          await fetch(item.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          })
          await store.delete(item.id)
        } catch (err) {
          console.error('Sync failed for', item.id, err)
        }
      }
    }
  } catch (e) {
    console.error('Sync queue error:', e)
  }
}

async function syncMessageQueue() {
}

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()

    const options = {
      body: data.body || '',
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192-maskable.svg',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/',
        id: data.id,
      },
      actions: data.actions || [],
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: true,
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'EduCore', options)
    )
  } catch (e) {
    const title = event.data.text()
    event.waitUntil(
      self.registration.showNotification(title, {
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192-maskable.svg',
      })
    )
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      const matchingClient = clientsList.find((c) => {
        return c.url === urlToOpen || c.url.startsWith(urlToOpen)
      })

      if (matchingClient) {
        return matchingClient.focus()
      }

      return clients.openWindow(urlToOpen)
    })
  )
})
