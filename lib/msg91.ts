import { normalizeIndianMobile } from './delivery-otp';

interface SendOtpParams {
  mobile: string;
  otp: string;
  orderId: string;
}

interface SendOtpResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

/**
 * Server-only service to dispatch delivery OTP SMS via MSG91 Flow API.
 * API Endpoint: POST https://control.msg91.com/api/v5/flow
 *
 * Requirements:
 * - Never log auth key
 * - Never log plaintext OTP
 * - Never expose auth key to client
 */
export async function sendDeliveryOTP({
  mobile,
  otp,
  orderId,
}: SendOtpParams): Promise<SendOtpResult> {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const templateId = process.env.MSG91_TEMPLATE_ID?.trim();
  const senderId = process.env.MSG91_SENDER_ID?.trim() || 'EZFARM';

  // 1. Validate and normalize mobile number
  const { valid, normalized, error: mobileError } = normalizeIndianMobile(mobile);
  if (!valid) {
    return {
      success: false,
      error: mobileError || 'INVALID_MOBILE_NUMBER',
    };
  }

  // 2. Check for missing credentials
  if (!authKey || !templateId) {
    // If running in development or when MSG91 credentials are not yet added,
    // log a safe notification (WITHOUT plaintext OTP or auth key)
    console.warn(
      `[MSG91] Credentials not configured (MSG91_AUTH_KEY or MSG91_TEMPLATE_ID missing). ` +
      `Delivery OTP SMS dispatch simulated for Order: ${orderId}, Recipient: ${normalized.slice(0, 4)}****${normalized.slice(-2)}`
    );

    return {
      success: true,
      simulated: true,
      messageId: `sim-${Date.now()}`,
    };
  }

  // 3. Dispatch to MSG91 Flow API
  try {
    const payload = {
      template_id: templateId,
      short_url: '0',
      ...(senderId ? { sender: senderId } : {}),
      recipients: [
        {
          mobiles: normalized,
          // Support multiple standard template variable naming conventions
          VAR1: otp,
          otp: otp,
          order_id: orderId,
        },
      ],
    };

    const response = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: {
        'authkey': authKey,
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resJson = await response.json().catch(() => null);

    if (!response.ok || (resJson && resJson.type === 'error')) {
      const errMsg = resJson?.message || `MSG91 HTTP ${response.status}`;
      console.error(`[MSG91] SMS dispatch failed for order ${orderId}: ${errMsg}`);
      return {
        success: false,
        error: `MSG91_DISPATCH_FAILED: ${errMsg}`,
      };
    }

    return {
      success: true,
      messageId: resJson?.message || 'sent',
    };
  } catch (err: any) {
    console.error(`[MSG91] Network error dispatching OTP for order ${orderId}`);
    return {
      success: false,
      error: 'MSG91_NETWORK_ERROR: ' + (err.message || 'Unable to connect to SMS gateway.'),
    };
  }
}
