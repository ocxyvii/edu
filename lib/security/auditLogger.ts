import { createClient, createServiceClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | '2FA_ENABLE' | '2FA_VERIFY' | 'EXPORT' | 'IMPORT' | 'PASSWORD_RESET'

interface AuditLogEntry {
  user_id: string | null
  action: AuditAction
  table_name: string
  record_id: string | null
  school_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
}

export async function logAction(
  userId: string | null,
  action: AuditAction,
  table: string,
  recordId: string | null = null,
  oldData: Record<string, unknown> | null = null,
  newData: Record<string, unknown> | null = null,
  schoolId: string | null = null,
): Promise<void> {
  try {
    const headerStore = await headers()
    const ipAddress = headerStore.get('x-forwarded-for') || headerStore.get('x-real-ip') || null
    const userAgent = headerStore.get('user-agent') || null

    const serviceClient = createServiceClient()

    const entry: AuditLogEntry = {
      user_id: userId,
      action,
      table_name: table,
      record_id: recordId,
      school_id: schoolId,
      old_data: oldData,
      new_data: newData,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: null,
    }

    const { error } = await serviceClient
      .from('audit_logs')
      .insert(entry)

    if (error) {
      console.error('Audit log insert failed:', error)
    }
  } catch (err) {
    console.error('Audit logging error:', err)
  }
}

export async function logCreate(
  userId: string,
  table: string,
  recordId: string,
  newData: Record<string, unknown>,
  schoolId: string | null = null,
): Promise<void> {
  return logAction(userId, 'CREATE', table, recordId, null, newData, schoolId)
}

export async function logUpdate(
  userId: string,
  table: string,
  recordId: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  schoolId: string | null = null,
): Promise<void> {
  return logAction(userId, 'UPDATE', table, recordId, oldData, newData, schoolId)
}

export async function logDelete(
  userId: string,
  table: string,
  recordId: string,
  oldData: Record<string, unknown> | null = null,
  schoolId: string | null = null,
): Promise<void> {
  return logAction(userId, 'DELETE', table, recordId, oldData, null, schoolId)
}
