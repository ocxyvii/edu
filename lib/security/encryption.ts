import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || (() => { throw new Error('ENCRYPTION_KEY env var required') })(), 'hex')
const IV_LENGTH = 16
const TAG_LENGTH = 16

export function encryptPII(value: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  let encrypted = cipher.update(value, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${tag}:${encrypted}`
}

export function decryptPII(encrypted: string): string {
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted format')
  const [ivHex, tagHex, data] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(data, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export async function hashBackupCode(code: string): Promise<string> {
  const { hash } = await import('bcryptjs')
  return hash(code, 10)
}

export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  const { compare } = await import('bcryptjs')
  return compare(code, hash)
}

export function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code.match(/.{4}/g)!.join('-'))
  }
  return codes
}
