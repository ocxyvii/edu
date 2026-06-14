'use client'

export interface QueueItem {
  id: string
  type: 'attendance' | 'message' | 'submission' | 'payment'
  url: string
  data: any
  createdAt: string
  retries: number
  lastError?: string
}

const DB_NAME = 'educore-offline'
const DB_VERSION = 1
const STORE_NAME = 'offline_queue'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function addToQueue(item: Omit<QueueItem, 'id' | 'createdAt' | 'retries'>): Promise<string> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  const id = generateId()
  store.add({
    ...item,
    id,
    createdAt: new Date().toISOString(),
    retries: 0,
  } as QueueItem)

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  db.close()

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      await (registration as any).sync.register('sync-attendance')
    } catch (err) {
      console.warn('Background sync registration failed:', err)
    }
  }

  return id
}

export async function getQueueItems(): Promise<QueueItem[]> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const items = await new Promise<QueueItem[]>((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return items
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.delete(id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function clearQueue(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.clear()
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function updateRetryCount(id: string, error: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const item = await new Promise<QueueItem | undefined>((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  if (item) {
    store.put({ ...item, retries: item.retries + 1, lastError: error })
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function processQueue(
  handler: (item: QueueItem) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  const items = await getQueueItems()
  let processed = 0
  let failed = 0

  for (const item of items) {
    try {
      const success = await handler(item)
      if (success) {
        await removeFromQueue(item.id)
        processed++
      } else {
        await updateRetryCount(item.id, 'Handler returned false')
        failed++
      }
    } catch (err: any) {
      await updateRetryCount(item.id, err?.message ?? String(err))
      failed++
    }
  }

  return { processed, failed }
}

export async function getQueueCount(): Promise<number> {
  const items = await getQueueItems()
  return items.length
}
