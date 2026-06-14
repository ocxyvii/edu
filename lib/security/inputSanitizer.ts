import { z } from 'zod'

const MAX_STRING_LENGTH = 5000
const MAX_TEXT_LENGTH = 50000

function sanitizeString(val: string): string {
  return val
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

export function sanitizedString(max = MAX_STRING_LENGTH) {
  return z.string().max(max).transform(v => sanitizeString(v))
}

export function sanitizedText(max = MAX_TEXT_LENGTH) {
  return z.string().max(max).transform(v => sanitizeString(v))
}

export function sanitizedEmail() {
  return z.string().email().max(255).transform(v => v.toLowerCase().trim())
}

export function sanitizedPhone() {
  return z.string().max(50).transform(v =>
    v.replace(/[^\d+\-() ]/g, '').trim()
  )
}

export function sanitizedName() {
  return z.string().min(1).max(100).transform(v =>
    v.replace(/<[^>]*>/g, '').replace(/[0-9<>]/g, '').trim()
  )
}

export function sanitizedNumeric() {
  return z.string().max(50).transform(v =>
    v.replace(/[^\d.]/g, '')
  ).pipe(z.coerce.number())
}

export const SanitizedStringSchema = z.string().max(MAX_STRING_LENGTH).transform(sanitizeString)
export const SanitizedTextSchema = z.string().max(MAX_TEXT_LENGTH).transform(sanitizeString)
export const SanitizedEmailSchema = z.string().email().max(255).transform(v => v.toLowerCase().trim())
export const SanitizedNameSchema = z.string().min(1).max(100).transform(v => v.replace(/<[^>]*>/g, '').replace(/[0-9<>]/g, '').trim())
export const SanitizedPhoneSchema = z.string().max(50).transform(v => v.replace(/[^\d+\-() ]/g, '').trim())
