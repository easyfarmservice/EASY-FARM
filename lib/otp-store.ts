/**
 * In-memory OTP store with 5-minute TTL.
 * Stores pending 6-digit public OTP mapped to Supabase auth token.
 */

import crypto from 'crypto';

interface OtpEntry {
  otp: string; // 6-digit public code sent to user email
  supabaseOtp?: string; // Internal Supabase auth token for session generation
  expiresAt: number; // epoch ms
}

// Module-level singleton
const otpStore = new Map<string, OtpEntry>();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Generate a cryptographically secure 6-digit numeric OTP string */
export function generateOtp(): string {
  // Random number 100000–999999
  const num = crypto.randomInt(100_000, 1_000_000);
  return num.toString();
}

/** Store a new 6-digit OTP for the given email (overwrites any existing one) */
export function setOtp(email: string, otp: string, supabaseOtp?: string): void {
  otpStore.set(email.toLowerCase(), {
    otp: otp.trim(),
    supabaseOtp: supabaseOtp ? supabaseOtp.trim() : undefined,
    expiresAt: Date.now() + OTP_TTL_MS,
  });
}

/**
 * Verify OTP for an email.
 * - Returns status and underlying supabaseOtp on success
 */
export function verifyOtp(
  email: string,
  otp: string
): { status: 'ok' | 'expired' | 'invalid' | 'not_found'; supabaseOtp?: string } {
  const key = email.toLowerCase();
  const entry = otpStore.get(key);

  if (!entry) return { status: 'not_found' };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return { status: 'expired' };
  }
  if (entry.otp !== otp.trim()) {
    return { status: 'invalid' };
  }

  // Correct — consume the OTP
  const supabaseOtp = entry.supabaseOtp;
  otpStore.delete(key);
  return { status: 'ok', supabaseOtp };
}

/** Remove a pending OTP (e.g. when resending a new one) */
export function clearOtp(email: string): void {
  otpStore.delete(email.toLowerCase());
}
