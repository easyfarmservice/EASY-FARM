import crypto from 'crypto';

/**
 * Generates a cryptographically secure 4-digit numeric OTP.
 * Uses crypto.randomInt(1000, 10000), which guarantees an integer from 1000 to 9999 inclusive.
 */
export function generateDeliveryOtp(): string {
  const code = crypto.randomInt(1000, 10000);
  return code.toString();
}

/**
 * Produces a secure HMAC-SHA256 hash of the 4-digit OTP.
 * Plaintext OTP is NEVER stored in database, audit logs, or logs.
 */
export function hashDeliveryOtp(otp: string): string {
  const secret =
    process.env.DELIVERY_OTP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'easyfarm-delivery-operations-secure-key';

  return crypto
    .createHmac('sha256', secret)
    .update(otp.trim())
    .digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
export function verifyDeliveryOtpHash(submittedOtp: string, storedHash: string): boolean {
  if (!submittedOtp || !storedHash) return false;
  const computedHash = hashDeliveryOtp(submittedOtp);

  try {
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Calculates the expiration timestamp (1 hour from current server time).
 */
export function getDeliveryOtpExpiry(): string {
  const ONE_HOUR_MS = 60 * 60 * 1000;
  return new Date(Date.now() + ONE_HOUR_MS).toISOString();
}

/**
 * Normalizes Indian mobile number to MSG91 format (e.g., 919876543210).
 */
export function normalizeIndianMobile(raw: string): { valid: boolean; normalized: string; error?: string } {
  if (!raw) return { valid: false, normalized: '', error: 'Mobile number is required.' };

  // Strip all non-digit characters
  const digits = raw.replace(/\D/g, '');

  let mobile = digits;
  if (mobile.startsWith('0') && mobile.length === 11) {
    mobile = mobile.slice(1);
  }

  if (mobile.length === 10) {
    mobile = '91' + mobile;
  }

  // Valid Indian mobile in international format: 91 + 10 digits (starting with 6, 7, 8, or 9)
  const isValid = /^91[6-9]\d{9}$/.test(mobile);

  if (!isValid) {
    return {
      valid: false,
      normalized: mobile,
      error: 'Invalid Indian mobile number format. Expected 10-digit number starting with 6-9.',
    };
  }

  return { valid: true, normalized: mobile };
}
