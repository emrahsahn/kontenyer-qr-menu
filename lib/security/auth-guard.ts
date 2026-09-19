import { NextRequest } from "next/server"
import crypto from "crypto"

let runtimeDevSecret: string | null = null
const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSecret(): string {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim().length >= 16) {
    return process.env.AUTH_SECRET.trim()
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CRITICAL SECURITY CONFIGURATION ERROR: AUTH_SECRET environment variable is missing or too short in production! Set AUTH_SECRET with at least 16 random characters."
    )
  }

  // Development ephemeral secret generated at server boot (changes each server start, prevents static forgery)
  if (!runtimeDevSecret) {
    runtimeDevSecret = crypto.randomBytes(32).toString("hex")
  }
  return runtimeDevSecret
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeCompare(a: string, b: string): boolean {
  try {
    const aHash = crypto.createHash("sha256").update(a).digest()
    const bHash = crypto.createHash("sha256").update(b).digest()
    return crypto.timingSafeEqual(aHash, bHash)
  } catch {
    return false
  }
}

/**
 * Creates a tamper-proof HMAC-signed session token:
 * Format: `<username>.<timestamp>.<hmac_signature>`
 */
export function createSignedSessionToken(username: string): string {
  const secret = getSecret()
  const timestamp = Date.now().toString()
  const cleanUser = username.trim().toLowerCase()

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${cleanUser}:${timestamp}`)
    .digest("hex")

  return `${cleanUser}.${timestamp}.${signature}`
}

/**
 * Verifies the integrity, signature and expiration of a session token
 */
export function verifySessionToken(token: string): { valid: boolean; username?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false }
  }

  const parts = token.split(".")
  if (parts.length !== 3) {
    return { valid: false }
  }

  const [username, timestampStr, signature] = parts
  const timestamp = parseInt(timestampStr, 10)

  if (isNaN(timestamp)) {
    return { valid: false }
  }

  // Check expiration (7 days)
  const now = Date.now()
  if (now - timestamp > MAX_SESSION_AGE_MS || timestamp > now + 60000) {
    return { valid: false }
  }

  // Recompute expected HMAC signature with current active secret
  const secret = getSecret()
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${username}:${timestampStr}`)
    .digest("hex")

  if (!timingSafeCompare(signature, expected)) {
    return { valid: false }
  }

  return { valid: true, username }
}

/**
 * Checks if the incoming NextRequest carries a valid, authenticated staff session
 * either in the HttpOnly cookie (`yali_staff_auth`) or the `Authorization: Bearer <token>` header.
 */
export function verifyStaffSession(request: NextRequest): { authenticated: boolean; username?: string } {
  // 1. Check HttpOnly cookie
  const cookieToken =
    request.cookies.get("konteyner_staff_auth")?.value ||
    request.cookies.get("yali_staff_auth")?.value
  if (cookieToken) {
    const result = verifySessionToken(cookieToken)
    if (result.valid) {
      return { authenticated: true, username: result.username }
    }
  }

  // 2. Check Authorization Header fallback (e.g. Bearer token)
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.substring(7).trim()
    const result = verifySessionToken(bearerToken)
    if (result.valid) {
      return { authenticated: true, username: result.username }
    }
  }

  return { authenticated: false }
}
