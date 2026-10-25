import { createAdminClient } from '@/lib/supabase/admin';

export type DeliveryAuditAction =
  | 'DELIVERY_STARTED'
  | 'DELIVERY_OTP_GENERATED'
  | 'DELIVERY_OTP_SENT'
  | 'DELIVERY_OTP_FAILED'
  | 'DELIVERY_OTP_VERIFICATION_FAILED'
  | 'DELIVERY_OTP_EXPIRED'
  | 'DELIVERY_OTP_RESENT'
  | 'DELIVERY_VERIFIED'
  | 'DELIVERY_FAILED'
  | 'DELIVERY_RESCHEDULED';

interface RecordAuditParams {
  adminId?: string;
  adminName?: string;
  action: DeliveryAuditAction;
  orderId: string;
  details?: Record<string, any>;
}

/**
 * Records an immutable audit log entry in the existing audit_logs table.
 * Strips all sensitive credentials, hashes, and OTPs.
 */
export async function recordDeliveryAuditLog({
  adminId,
  adminName = 'Founder / Admin',
  action,
  orderId,
  details = {},
}: RecordAuditParams): Promise<void> {
  try {
    // Sanitize details: strictly remove any key that could hold sensitive tokens or OTPs
    const sanitizedDetails: Record<string, any> = { ...details };
    delete sanitizedDetails.otp;
    delete sanitizedDetails.raw_otp;
    delete sanitizedDetails.delivery_otp;
    delete sanitizedDetails.delivery_otp_hash;
    delete sanitizedDetails.hash;
    delete sanitizedDetails.auth_key;
    delete sanitizedDetails.authkey;

    const supabase = createAdminClient();

    const { error } = await supabase.from('audit_logs').insert([
      {
        admin_id: adminId || 'founder-delivery',
        admin_name: adminName,
        action,
        entity_type: 'delivery',
        entity_id: orderId,
        details: sanitizedDetails,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.warn('[AuditLog] Failed to insert audit log entry:', error.message);
    }
  } catch (err: any) {
    console.warn('[AuditLog] Unexpected error logging delivery action:', err?.message);
  }
}
