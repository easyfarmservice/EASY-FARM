import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp-store';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/client';

/**
 * POST /api/auth/verify-otp
 * Body: { email: string, otp: string }
 *
 * Verifies the 6-digit OTP for the given email,
 * exchanges it for an authentic Supabase session,
 * and sets up customer profile if needed.
 */
export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    // 1. Verify 6-digit OTP from store
    const result = verifyOtp(cleanEmail, cleanOtp);

    if (result.status === 'not_found') {
      return NextResponse.json(
        { error: 'No verification code was sent to this email, or it was already used. Please request a new code.' },
        { status: 400 }
      );
    }

    if (result.status === 'expired') {
      return NextResponse.json(
        { error: 'Verification code has expired (5 minutes). Please request a new code.' },
        { status: 400 }
      );
    }

    if (result.status === 'invalid') {
      return NextResponse.json(
        { error: 'Incorrect 6-digit verification code. Please check your email and try again.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 2. Exchange with Supabase for authentic session using internal token
    const client = createClient();
    const internalToken = result.supabaseOtp || cleanOtp;

    const { data: authData, error: authError } = await client.auth.verifyOtp({
      email: cleanEmail,
      token: internalToken,
      type: 'email',
    });

    if (authError) {
      console.warn('[verify-otp] Supabase verifyOtp fallback:', authError.message);
      // Fallback: confirm user directly via admin API
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const user = users.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (user) {
        await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true });
      }
    }

    // 3. Ensure profile exists in profiles table
    if (authData?.user) {
      const user = authData.user;
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        await supabaseAdmin.from('profiles').insert({
          id: user.id,
          auth_user_id: user.id,
          email: cleanEmail,
          full_name: user.user_metadata?.full_name || cleanEmail.split('@')[0],
          phone: user.user_metadata?.phone || '',
          role: 'customer',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Verified successfully!',
      session: authData?.session || null,
      user: authData?.user || null,
    });
  } catch (err: any) {
    console.error('[verify-otp] Exception:', err);
    return NextResponse.json({ error: err.message || 'Server error verifying code.' }, { status: 500 });
  }
}
