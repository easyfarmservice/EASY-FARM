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

export interface ResolvedCustomerContact {
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  fullAddress: string;
  orderNumber: string;
}

/**
 * Robust customer contact resolver:
 * Checks notes metadata -> relational profiles -> direct profiles table -> auth.users
 */
export async function resolveOrderCustomer(
  supabase: any,
  order: any,
  meta: any
): Promise<ResolvedCustomerContact> {
  const metaAddr = typeof meta?.address === 'object' && meta?.address !== null ? meta.address : null;

  // 1. Relational profiles join - ALWAYS prioritize customer's registered profile credentials
  const profile = Array.isArray(order?.profiles) ? order.profiles[0] : order?.profiles;

  let customerEmail = '';
  let customerPhone = '';
  let customerName = '';

  // Registered profile email is the primary source of truth
  if (profile?.email && !profile.email.endsWith('@guest.easyfarm.in')) {
    customerEmail = profile.email.trim().toLowerCase();
  }
  if (profile?.phone) {
    customerPhone = profile.phone.trim();
  }
  if (profile?.full_name && profile.full_name !== 'Customer' && profile.full_name !== 'Easy Farm Member') {
    customerName = profile.full_name.trim();
  }

  const customerId = order?.customer_id || profile?.id;

  // 2. Query profiles table directly if email or phone is missing from join
  if ((!customerEmail || !customerPhone || !customerName) && customerId) {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone')
        .eq('id', customerId)
        .maybeSingle();

      if (prof?.email && !prof.email.endsWith('@guest.easyfarm.in') && !customerEmail) {
        customerEmail = prof.email.trim().toLowerCase();
      }
      if (!customerPhone && prof?.phone) {
        customerPhone = prof.phone.trim();
      }
      if (!customerName && prof?.full_name && prof.full_name !== 'Customer' && prof.full_name !== 'Easy Farm Member') {
        customerName = prof.full_name.trim();
      }
    } catch {}
  }

  // 3. Fallback to Supabase Auth admin users if email is still missing
  if (!customerEmail && customerId && supabase.auth?.admin) {
    try {
      const { data: authData } = await supabase.auth.admin.getUserById(customerId);
      if (authData?.user?.email) {
        customerEmail = authData.user.email.trim().toLowerCase();
      }
      if (!customerName && authData?.user?.user_metadata?.full_name) {
        customerName = authData.user.user_metadata.full_name.trim();
      }
      if (!customerPhone && (authData?.user?.phone || authData?.user?.user_metadata?.phone)) {
        customerPhone = (authData.user.phone || authData.user.user_metadata.phone).trim();
      }
    } catch {}
  }

  // 4. Fallback to metadata / notes only if database has no registered contact
  if (!customerEmail) {
    customerEmail = (meta?.customerEmail || metaAddr?.customerEmail || '').trim().toLowerCase();
  }
  if (!customerPhone) {
    customerPhone = (meta?.customerPhone || metaAddr?.customerPhone || '').trim();
  }
  if (!customerName) {
    customerName = (meta?.customerName || metaAddr?.customerName || profile?.full_name || 'Resident').trim();
  }

  // 4. Resolve delivery address (handles top-level, nested meta.address, customer_addresses relation)
  const addrObj = Array.isArray(order?.customer_addresses)
    ? order.customer_addresses[0]
    : order?.customer_addresses;

  const flatNo = meta?.flatNo || metaAddr?.flatNo || '';
  const apartment = meta?.apartment || metaAddr?.apartment || addrObj?.apartment || '';
  const locality = meta?.locality || metaAddr?.locality || addrObj?.locality || '';
  const pincode = meta?.pincode || metaAddr?.pincode || addrObj?.pincode || '';

  const fullAddress =
    meta?.fullAddress ||
    metaAddr?.fullAddress ||
    (typeof meta?.address === 'string' ? meta.address : '') ||
    addrObj?.full_address ||
    [flatNo, apartment, locality, pincode ? `PIN ${pincode}` : ''].filter(Boolean).join(', ') ||
    [addrObj?.apartment, addrObj?.locality].filter(Boolean).join(', ') ||
    'Ghatkesar & Pocharam, Hyderabad';

  const orderNumber =
    meta?.orderNumber || (order?.id ? `EF${order.id.slice(0, 4).toUpperCase()}` : 'EF-ORDER');

  if (!customerName) customerName = 'Valued Customer';

  return {
    customerEmail,
    customerPhone,
    customerName,
    fullAddress,
    orderNumber,
  };
}

