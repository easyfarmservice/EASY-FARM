import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { EmailService } from '@/services/email.service';
import { generateOtp, setOtp } from '@/lib/otp-store';

// Rate limiting: max 10 requests per 60 seconds per email (shared across Next.js route bundles)
const globalForSendLog = globalThis as unknown as {
  __easyfarmOtpSendLog?: Map<string, number[]>;
};
const sendLog = globalForSendLog.__easyfarmOtpSendLog ?? new Map<string, number[]>();
globalForSendLog.__easyfarmOtpSendLog = sendLog;

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxAttempts = 10;
  const key = email.toLowerCase();
  const timestamps = (sendLog.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxAttempts) return true;
  timestamps.push(now);
  sendLog.set(key, timestamps);
  return false;
}

/**
 * POST /api/auth/send-otp
 * Body: { email: string, type?: 'login' | 'signup', name?: string, phone?: string }
 *
 * Generates an authentic Supabase Auth 6-digit OTP via admin.generateLink()
 * and delivers it using Resend (EmailService).
 *
 * This completely avoids Supabase GoTrue hosted SMTP failures
 * while producing genuine Supabase 6-digit OTP tokens that
 * client-side supabase.auth.verifyOtp() can verify directly.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, type = 'login', name, phone } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (isRateLimited(cleanEmail)) {
      return NextResponse.json(
        {
          success: false,
          rateLimited: true,
          error: 'A verification code was recently dispatched to this email. Please check your inbox or wait 60 seconds.',
        },
        { status: 429 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 1. Resolve display name and check account existence
    let displayName = name?.trim() || cleanEmail.split('@')[0];
    let userExists = false;

    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (profile) {
        userExists = true;
        if (profile.full_name && profile.full_name.trim() !== '' && profile.full_name !== 'Easy Farm Member') {
          displayName = profile.full_name;
        }
      } else {
        const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        if (!listErr && usersData?.users) {
          const found = usersData.users.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (found) {
            userExists = true;
            if (found.user_metadata?.full_name) {
              displayName = found.user_metadata.full_name;
            }
          }
        }
      }
    } catch (lookupErr) {
      console.warn('[send-otp] Profile/user lookup fallback note:', lookupErr);
    }

    // For new registrations, ensure a display name is set
    if (type === 'signup' && !displayName) {
      displayName = name?.trim() || cleanEmail.split('@')[0];
    }

    // 2. Generate authentic Supabase Auth 6-digit OTP token via Admin API (with local fallback)
    let supabaseOtp: string | undefined;
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: {
          data: {
            full_name: displayName,
            phone: phone?.trim() || '',
            role: 'customer',
          },
        },
      });

      if (linkError) {
        console.warn('[send-otp] generateLink fallback note:', linkError.message);
      } else if (linkData?.properties?.email_otp) {
        supabaseOtp = linkData.properties.email_otp;
      }
    } catch (genErr) {
      console.warn('[send-otp] generateLink exception fallback note:', genErr);
    }

    const otpCode = supabaseOtp || generateOtp();
    console.log(`[AUTH OTP (${type})] >>> Request processed for ${cleanEmail}`);

    // Store in global memory store for instant server-side verification fallback
    setOtp(cleanEmail, otpCode, supabaseOtp);

    // 3. Send 6-digit OTP email strictly to customer's registered email via Resend
    const emailResult = await EmailService.sendOtpEmail({
      toEmail: cleanEmail,
      name: displayName,
      otp: otpCode,
    });

    // 4. Also trigger Supabase native Auth email dispatch as redundant delivery guarantee
    // This ensures customer receives their OTP even if GoDaddy SPF/DMARC filters Resend in Gmail
    try {
      const { error: sbDispatchError } = await supabaseAdmin.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: type === 'signup',
          data: {
            full_name: displayName,
            phone: phone?.trim() || '',
            role: 'customer',
          },
        },
      });
      if (sbDispatchError) {
        console.warn('[send-otp] Supabase native email dispatch notice:', sbDispatchError.message);
      } else {
        console.log(`[send-otp] Supabase native email dispatched successfully to ${cleanEmail}`);
      }
    } catch (sbMailErr: any) {
      console.warn('[send-otp] Supabase native email dispatch exception:', sbMailErr?.message);
    }

    if (!emailResult.success) {
      const errorMsg: string = (emailResult as any).error || (emailResult as any).reason || 'Email dispatch failed';
      console.warn('[send-otp] Resend dispatch warning, attempting Supabase Auth email fallback:', errorMsg);

      // Fallback: Attempt Supabase Auth email dispatch
      try {
        const { error: sbError } = await supabaseAdmin.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: type === 'signup',
            data: {
              full_name: displayName,
              phone: phone?.trim() || '',
              role: 'customer',
            },
          },
        });

        if (sbError) {
          console.error('[send-otp] Both Resend and Supabase email dispatch failed:', sbError.message);
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to send verification code to your email. Please check your email address and try again.',
            },
            { status: 500 }
          );
        }
      } catch (fallbackErr: any) {
        console.error('[send-otp] Fallback exception:', fallbackErr);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to send verification code to your email. Please check your email address and try again.',
          },
          { status: 500 }
        );
      }
    }

    // STRICT PRIVACY: NEVER RETURN THE OTP IN JSON RESPONSE OR WEBPAGE
    return NextResponse.json({
      success: true,
      message: `6-digit verification code sent to ${cleanEmail}`,
    });
  } catch (err: any) {
    console.error('[send-otp] Unexpected exception:', err);
    return NextResponse.json(
      { error: err.message || 'Server error while processing verification code.' },
      { status: 500 }
    );
  }
}
