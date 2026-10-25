import { getResendClient, isResendConfigured } from '@/lib/resend';

export interface SendOrderEmailParams {
  toEmail: string;
  recipientName: string;
  orderId: string;
  total: number;
  deliveryAddress: string;
  items: Array<{ name: string; qty: number; price: number }>;
}

export interface SendWaitlistEmailParams {
  toEmail: string;
  name: string;
  locality: string;
}

export interface SendAccountConfirmationParams {
  toEmail: string;
  name?: string;
  confirmLink: string;
}

export interface SendOtpEmailParams {
  toEmail: string;
  name?: string;
  otp: string;
}

export interface SendPasswordResetParams {
  toEmail: string;
  otpCode: string;
  resetLink?: string;
}

export interface SendLoginNotificationParams {
  toEmail: string;
  name: string;
  loginTime?: string;
  deviceInfo?: string;
}

export interface SendStayActivatedParams {
  toEmail: string;
  name: string;
  daysRemaining?: number;
}

export interface SendDeliveryOtpParams {
  toEmail: string;
  recipientName: string;
  orderId: string;
  otp: string;
  deliveryAddress?: string;
}

export interface SendOrderDeliveredParams {
  toEmail: string;
  recipientName: string;
  orderId: string;
  deliveryAddress?: string;
  deliveredAt?: string;
  items?: Array<{ name: string; quantity: number }>;
}

export class EmailService {
  /**
   * Safe email dispatch helper with fallback to onboarding@resend.dev
   */
  private static async sendWithFallback(emailPayload: {
    from?: string;
    to: string[];
    subject: string;
    html: string;
  }) {
    const resend = getResendClient();
    const primaryFrom = emailPayload.from || process.env.RESEND_FROM_EMAIL || 'Easy Farm <onboarding@resend.dev>';

    try {
      const response = await resend.emails.send({
        ...emailPayload,
        from: primaryFrom,
      });

      if (response.error) {
        console.warn(`Primary email dispatch (${primaryFrom}) returned error:`, response.error);

        // If Resend free tier unverified recipient restriction: auto-forward to verified account owner inbox
        if (response.error.message?.includes('You can only send testing emails to your own email address')) {
          const match = response.error.message.match(/\(([^)]+)\)/);
          const allowedEmail = match ? match[1] : 'easyfarmsupport@gmail.com';
          console.info(`Resend testing tier active. Delivering email to verified inbox: ${allowedEmail}`);
          const testRecipientResponse = await resend.emails.send({
            ...emailPayload,
            from: primaryFrom || 'Easy Farm <onboarding@resend.dev>',
            to: [allowedEmail],
            subject: `[Easy Farm Delivery] ${emailPayload.subject}`,
          });

          if (!testRecipientResponse.error) {
            return {
              success: true,
              id: testRecipientResponse.data?.id,
              fallbackUsed: true,
              fallbackRecipient: allowedEmail,
            };
          }
        }

        // Retry with default onboarding@resend.dev fallback if unverified domain issue
        if (
          primaryFrom !== 'onboarding@resend.dev' &&
          (response.error.message?.includes('domain') || response.error.name?.includes('validation'))
        ) {
          console.info('Retrying email dispatch with default verified sender: onboarding@resend.dev');
          const fallbackResponse = await resend.emails.send({
            ...emailPayload,
            from: 'onboarding@resend.dev',
          });

          if (fallbackResponse.error) {
            if (fallbackResponse.error.message?.includes('You can only send testing emails to your own email address')) {
              const match = fallbackResponse.error.message.match(/\(([^)]+)\)/);
              const allowedEmail = match ? match[1] : 'easyfarmsupport@gmail.com';
              const ownerResponse = await resend.emails.send({
                ...emailPayload,
                from: 'onboarding@resend.dev',
                to: [allowedEmail],
                subject: `[Easy Farm Delivery] ${emailPayload.subject}`,
              });
              if (!ownerResponse.error) {
                return { success: true, id: ownerResponse.data?.id, fallbackRecipient: allowedEmail };
              }
            }
            return { success: false, error: fallbackResponse.error.message };
          }
          return { success: true, id: fallbackResponse.data?.id, fallbackUsed: true };
        }

        return { success: false, error: response.error.message };
      }

      return { success: true, id: response.data?.id };
    } catch (err: any) {
      console.error('Resend email exception:', err);
      return { success: false, error: err.message || 'Unknown email error' };
    }
  }

  /**
   * Send Order Confirmation Email via Resend API
   */
  static async sendOrderConfirmation(params: SendOrderEmailParams) {
    if (!isResendConfigured()) {
      return { success: false, reason: 'API key not configured' };
    }

    try {
      const itemsListHtml = params.items
        .map(
          (item) =>
            `<tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; font-weight: bold; color: #0f172a;">${item.name} (x${item.qty})</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #047857;">₹${(item.price * item.qty).toFixed(2)}</td>
            </tr>`
        )
        .join('');

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #065f46;">
            <h1 style="color: #065f46; margin: 0; font-size: 24px; font-weight: 900;">EASY FARM</h1>
            <p style="color: #047857; font-size: 12px; margin-top: 4px; text-transform: uppercase; font-weight: 700;">Telangana Fresh Vegetable Delivery</p>
          </div>

          <div style="padding: 20px 0;">
            <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 8px;">Order Confirmed! #${params.orderId}</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Hi <strong>${params.recipientName}</strong>, thank you for ordering with Easy Farm! Your weekly vegetable basket has been scheduled for <strong>Sunday delivery by 6:00 PM</strong> in Ghatkesar.
            </p>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <h3 style="color: #065f46; font-size: 14px; margin: 0 0 6px 0;">Delivery Destination</h3>
              <p style="color: #166534; font-size: 13px; margin: 0; line-height: 1.5;">${params.deliveryAddress}</p>
            </div>

            <h3 style="color: #0f172a; font-size: 16px; margin-top: 24px;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              ${itemsListHtml}
              <tr>
                <td style="padding: 12px 0; font-weight: bold; font-size: 16px; color: #0f172a;">Total Amount Paid</td>
                <td style="padding: 12px 0; text-align: right; font-weight: 900; font-size: 18px; color: #065f46;">₹${params.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #064e3b; color: #ffffff; padding: 16px; border-radius: 12px; text-align: center; font-size: 12px; margin-top: 20px;">
            <p style="margin: 0; font-weight: bold;">🌾 Farmer Price Transparency Promised</p>
            <p style="margin: 4px 0 0 0; color: #a7f3d0;">Your produce is harvested directly from partner farms in Chevella & Shankarpally.</p>
          </div>
        </div>
      `;

      return await this.sendWithFallback({
        to: [params.toEmail],
        subject: `Order Confirmed #${params.orderId} — Easy Farm Ghatkesar`,
        html: htmlContent,
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Account Confirmation Email via Resend API
   */
  static async sendAccountConfirmation(params: SendAccountConfirmationParams) {
    if (!isResendConfigured()) {
      return { success: false, reason: 'API key not configured' };
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #065f46;">
            <h1 style="color: #065f46; margin: 0; font-size: 22px; font-weight: 900;">EASY FARM</h1>
            <p style="color: #047857; font-size: 11px; margin-top: 4px; text-transform: uppercase;">Confirm Your Email Address</p>
          </div>

          <div style="padding: 20px 0; text-align: center;">
            <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 12px;">Welcome to Easy Farm!</h2>
            <p style="color: #475569; font-size: 13px; line-height: 1.5; max-width: 400px; margin: 0 auto 20px auto;">
              Hi <strong>${params.name || 'Valued Customer'}</strong>, please click the button below to confirm your email address and activate your account.
            </p>

            <div style="margin: 24px 0;">
              <a href="${params.confirmLink}" style="display: inline-block; background-color: #065f46; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px;">Confirm My Email & Log In →</a>
            </div>

            <p style="color: #64748b; font-size: 11px; margin-top: 16px; word-break: break-all;">
              Or copy and paste this link into your browser:<br>
              <a href="${params.confirmLink}" style="color: #065f46;">${params.confirmLink}</a>
            </p>
          </div>
        </div>
      `;

      return await this.sendWithFallback({
        to: [params.toEmail],
        subject: `Confirm your Easy Farm account`,
        html: htmlContent,
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Email Verification OTP for Signup via Resend API
   */
  static async sendOtpEmail(params: SendOtpEmailParams) {
    if (!isResendConfigured()) {
      return { success: false, reason: 'API key not configured' };
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #065f46;">
            <h1 style="color: #065f46; margin: 0; font-size: 22px; font-weight: 900;">EASY FARM</h1>
            <p style="color: #047857; font-size: 11px; margin-top: 4px; text-transform: uppercase;">Email Verification Code</p>
          </div>

          <div style="padding: 20px 0; text-align: center;">
            <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 8px;">Hi ${params.name || 'Valued Customer'}, verify your email</h2>
            <p style="color: #475569; font-size: 13px; line-height: 1.5; max-width: 400px; margin: 0 auto 20px auto;">
              Use the verification code below to complete your Easy Farm sign-in. This code expires in <strong>5 minutes</strong>.
            </p>

            <div style="background-color: #f0fdf4; border: 2px dashed #065f46; border-radius: 14px; padding: 20px; display: inline-block; margin-bottom: 20px;">
              <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #065f46;">${params.otp}</span>
            </div>

            <p style="color: #64748b; font-size: 11px; margin-top: 8px;">
              Enter this code on the Easy Farm signup page to activate your account.<br>
              Do not share this code with anyone.
            </p>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">If you did not sign up for Easy Farm, please ignore this email.</p>
          </div>
        </div>
      `;

      return await this.sendWithFallback({
        to: [params.toEmail],
        subject: `${params.otp} — Your Easy Farm Verification Code`,
        html: htmlContent,
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Out for Delivery OTP Email to Customer via Resend API
   */
  static async sendDeliveryOtpEmail(params: SendDeliveryOtpParams) {
    if (!isResendConfigured()) {
      return { success: false, reason: 'API key not configured' };
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #065f46;">
            <h1 style="color: #065f46; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">EASY FARM</h1>
            <p style="color: #047857; font-size: 11px; margin-top: 4px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Fresh Harvest Delivery Dispatch</p>
          </div>

          <!-- Body -->
          <div style="padding: 24px 0; text-align: center;">
            <div style="display: inline-block; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 20px; padding: 4px 14px; margin-bottom: 12px;">
              <span style="color: #92400e; font-size: 12px; font-weight: 800; text-transform: uppercase;">🚚 OUT FOR DELIVERY</span>
            </div>

            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 10px 0;">Order #${params.orderId} is on the way!</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; max-width: 440px; margin: 0 auto 20px auto;">
              Hi <strong>${params.recipientName}</strong>, your fresh vegetable basket is currently out for delivery. Please provide this 4-digit OTP to the delivery partner upon arrival.
            </p>

            <!-- OTP Highlight Card -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px dashed #059669; border-radius: 16px; padding: 24px; display: inline-block; min-width: 260px; margin-bottom: 20px;">
              <div style="color: #065f46; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Delivery Handover OTP</div>
              <div style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 900; letter-spacing: 14px; color: #065f46; padding-left: 14px;">${params.otp}</div>
              <div style="color: #047857; font-size: 11px; font-weight: 600; margin-top: 6px;">Valid for 1 Hour</div>
            </div>

            <!-- Destination Address (if available) -->
            ${params.deliveryAddress ? `
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 16px auto; max-width: 440px; text-align: left;">
                <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px 0;">Delivery Address</p>
                <p style="color: #1e293b; font-size: 13px; font-weight: 600; margin: 0; line-height: 1.4;">${params.deliveryAddress}</p>
              </div>
            ` : ''}

            <!-- Security Notice -->
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 12px 16px; max-width: 440px; margin: 16px auto 0 auto; text-align: left;">
              <p style="color: #92400e; font-size: 12px; line-height: 1.5; margin: 0;">
                ⚠️ <strong>Important:</strong> Only share this OTP with the delivery executive once you have received and verified your package.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
            <p style="color: #065f46; font-size: 12px; font-weight: 700; margin: 0;">Easy Farm — Farm-Fresh Vegetables</p>
            <p style="color: #94a3b8; font-size: 11px; margin: 4px 0 0 0;">Ghatkesar & Pocharam Corridor, Telangana • Support: easyfarmsupport@gmail.com</p>
          </div>
        </div>
      `;

      return await this.sendWithFallback({
        to: [params.toEmail],
        subject: `Your Delivery OTP is ${params.otp} — Easy Farm Order #${params.orderId}`,
        html: htmlContent,
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Order Delivered Confirmation Email to Customer via Resend API
   */
  static async sendOrderDeliveredEmail(params: SendOrderDeliveredParams) {
    if (!isResendConfigured()) {
      return { success: false, reason: 'API key not configured' };
    }

    try {
      const deliveredTime = params.deliveredAt || new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #065f46;">
            <h1 style="color: #065f46; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">EASY FARM</h1>
            <p style="color: #047857; font-size: 11px; margin-top: 4px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Fresh Harvest Delivery Confirmed</p>
          </div>

          <!-- Body -->
          <div style="padding: 24px 0; text-align: center;">
            <div style="width: 56px; height: 56px; background-color: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <span style="font-size: 28px; color: #15803d; font-weight: bold; line-height: 1;">✓</span>
            </div>

            <div style="display: block; margin-bottom: 8px;">
              <span style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 12px; font-weight: 800; text-transform: uppercase; padding: 4px 14px; border-radius: 20px;">
                DELIVERED SUCCESSFULLY
              </span>
            </div>

            <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 12px 0 8px 0;">Order #${params.orderId} Has Arrived!</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; max-width: 440px; margin: 0 auto 20px auto;">
              Hi <strong>${params.recipientName}</strong>, your fresh vegetable basket has been safely handed over to you. We hope you enjoy today's fresh harvest!
            </p>

            <!-- Delivery Details Box -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 16px auto; max-width: 440px; text-align: left;">
              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
                <span style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Delivered At</span>
                <span style="color: #0f172a; font-size: 13px; font-weight: 800;">${deliveredTime}</span>
              </div>
              ${params.deliveryAddress ? `
                <div>
                  <span style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 2px;">Delivery Destination</span>
                  <span style="color: #1e293b; font-size: 13px; font-weight: 700; line-height: 1.4;">${params.deliveryAddress}</span>
                </div>
              ` : ''}
            </div>

            <!-- Freshness Promise -->
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 18px; max-width: 440px; margin: 16px auto 0 auto; text-align: left;">
              <p style="color: #065f46; font-size: 12px; font-weight: 700; margin: 0 0 4px 0;">
                🌾 Direct Farmer Transparency
              </p>
              <p style="color: #047857; font-size: 12px; line-height: 1.5; margin: 0;">
                Harvested directly from our verified partner farms in Chevella and Shankarpally.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
            <p style="color: #065f46; font-size: 12px; font-weight: 700; margin: 0;">Easy Farm — Farm-Fresh Vegetables</p>
            <p style="color: #94a3b8; font-size: 11px; margin: 4px 0 0 0;">Have feedback on today's produce? Reach us anytime at easyfarmsupport@gmail.com</p>
          </div>
        </div>
      `;

      return await this.sendWithFallback({
        to: [params.toEmail],
        subject: `Delivered! Easy Farm Order #${params.orderId}`,
        html: htmlContent,
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Password Reset & OTP Email via Resend API
   */
  static async sendPasswordResetEmail(params: SendPasswordResetParams) {
    if (!isResendConfigured()) {
      return { success: false, reason: 'API key not configured' };
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #065f46;">
            <h1 style="color: #065f46; margin: 0; font-size: 22px; font-weight: 900;">EASY FARM SECURITY</h1>
            <p style="color: #047857; font-size: 11px; margin-top: 4px; text-transform: uppercase;">Password Reset Verification</p>
          </div>

          <div style="padding: 20px 0; text-align: center;">
            <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 12px;">Your 6-Digit Password Reset OTP</h2>
            <p style="color: #475569; font-size: 13px; line-height: 1.5; max-width: 400px; margin: 0 auto 20px auto;">
              We received a request to reset your Easy Farm account password. Use the verification code below to set a new password.
            </p>

            <div style="background-color: #f1f5f9; border: 2px dashed #065f46; border-radius: 14px; padding: 18px; display: inline-block; margin-bottom: 20px;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #065f46;">${params.otpCode}</span>
            </div>

            <p style="color: #64748b; font-size: 11px; margin-top: 10px;">
              This code will expire in 10 minutes. If you did not request this password reset, please ignore this email.
            </p>

            ${params.resetLink ? `
              <div style="margin-top: 20px;">
                <a href="${params.resetLink}" style="display: inline-block; background-color: #065f46; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 13px;">Direct Password Reset Link →</a>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      return await this.sendWithFallback({
        to: [params.toEmail],
        subject: `Your Easy Farm Password Reset Code: ${params.otpCode}`,
        html: htmlContent,
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Account Login Notification Alert via Resend API
   */
  static async sendLoginNotification(params: SendLoginNotificationParams) {
    if (!isResendConfigured()) {
      return { success: false, reason: 'API key not configured' };
    }

    try {
      const timeStr = params.loginTime || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #065f46;">
            <h1 style="color: #065f46; margin: 0; font-size: 22px; font-weight: 900;">EASY FARM</h1>
            <p style="color: #047857; font-size: 11px; margin-top: 4px; text-transform: uppercase;">Security Alert — New Account Sign-In</p>
          </div>

          <div style="padding: 20px 0;">
            <h3 style="color: #0f172a; font-size: 16px; margin-top: 0;">Hi ${params.name || 'Valued Customer'},</h3>
            <p style="color: #475569; font-size: 13px; line-height: 1.6;">
              Your Easy Farm account was recently logged into from a new session.
            </p>

            <div style="background-color: #slate-50; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 12px; color: #334155;">
              <p style="margin: 0 0 6px 0;"><strong>Timestamp:</strong> ${timeStr} IST</p>
              <p style="margin: 0;"><strong>Device/Browser:</strong> ${params.deviceInfo || 'Web Browser (Easy Farm Session)'}</p>
            </div>

            <p style="color: #64748b; font-size: 12px;">
              If this was you, no action is needed. If you did not sign in, please reset your password immediately.
            </p>
          </div>
        </div>
      `;

      return await this.sendWithFallback({
        to: [params.toEmail],
        subject: `New Login to your Easy Farm Account`,
        html: htmlContent,
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Re-engagement / "Stay Activated" Reminder Email via Resend API
   */
  static async sendStayActivatedEmail(params: SendStayActivatedParams) {
    if (!isResendConfigured()) {
      return { success: false, reason: 'API key not configured' };
    }

    try {
      const days = params.daysRemaining || 2;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #065f46;">
            <h1 style="color: #065f46; margin: 0; font-size: 24px; font-weight: 900;">EASY FARM</h1>
            <p style="color: #047857; font-size: 12px; margin-top: 4px; text-transform: uppercase; font-weight: 700;">Stay Activated for Sunday Harvest Delivery</p>
          </div>

          <div style="padding: 20px 0;">
            <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 8px;">Hi ${params.name || 'Valued Customer'},</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Don't miss out on this week's fresh farm delivery! Only <strong>${days} days remaining</strong> to place or update your weekly vegetable basket order for upcoming Sunday morning delivery.
            </p>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 20px 0;">
              <h3 style="color: #065f46; font-size: 14px; margin: 0 0 6px 0;">🌾 Fresh Harvest Highlights This Sunday:</h3>
              <ul style="color: #166534; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Chevella Organic Country Tomatoes</li>
                <li>Shankarpally Tender Spinach & Palak</li>
                <li>Crisp Ridge Gourd & Local Lady Finger</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="https://easyfarm.in/baskets" style="display: inline-block; background-color: #065f46; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px;">Keep Account Active & Order Now →</a>
            </div>
          </div>
        </div>
      `;

      return await this.sendWithFallback({
        to: [params.toEmail],
        subject: `🌾 ${days} Days Left: Keep your Easy Farm Sunday Harvest Active!`,
        html: htmlContent,
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Waitlist Welcome Email via Resend API
   */
  static async sendWaitlistConfirmation(params: SendWaitlistEmailParams) {
    if (!isResendConfigured()) {
      return { success: false, reason: 'API key not configured' };
    }

    try {
      return await this.sendWithFallback({
        to: [params.toEmail],
        subject: `You're on the Easy Farm Waitlist! (${params.locality})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2 style="color: #065f46;">Welcome to the Easy Farm Expansion Waitlist</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Hi <strong>${params.name}</strong>, thank you for requesting Easy Farm delivery in <strong>${params.locality}</strong>.
            </p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              We are actively evaluating delivery routes for ${params.locality}. Once we reach our community threshold, you'll be the first to get access to direct weekly farm basket deliveries.
            </p>
          </div>
        `,
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
