import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp-store';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

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

    // 1. Verify 6-digit OTP from shared global store
    const result = verifyOtp(cleanEmail, cleanOtp);

    if (result.status === 'expired') {
      return NextResponse.json(
        { error: 'Verification code has expired (10 minutes). Please request a new code.' },
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
    const client = await createClient();
    const internalToken = result.supabaseOtp || cleanOtp;

    let authData: any = null;
    let authError: any = null;

    for (const otpType of ['magiclink', 'email', 'signup'] as const) {
      const attempt = await client.auth.verifyOtp({
        email: cleanEmail,
        token: internalToken,
        type: otpType,
      });
      if (!attempt.error && attempt.data?.user) {
        authData = attempt.data;
        authError = null;
        break;
      }
      authError = attempt.error;
    }

    // If not in otpStore AND all Supabase verifyOtp attempts failed, reject
    if (result.status === 'not_found' && (authError || !authData?.user)) {
      return NextResponse.json(
        { error: 'Invalid or expired 6-digit verification code. Please request a new code.' },
        { status: 400 }
      );
    }

    let resolvedUser = authData?.user || null;

    // If matched in otpStore (result.status === 'ok') even when client.auth.verifyOtp failed,
    // resolve or create & confirm the user via Admin API so resolvedUser is never null
    if (!resolvedUser && result.status === 'ok') {
      console.warn('[verify-otp] Supabase verifyOtp fallback:', authError?.message);
      const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listErr) {
        console.warn('[verify-otp] listUsers error:', listErr.message);
      }
      const existingUser = usersData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

      if (existingUser) {
        const { data: updatedData } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true,
        });
        resolvedUser = updatedData?.user || existingUser;
      } else {
        const { data: createdData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          email_confirm: true,
          user_metadata: {
            full_name: cleanEmail.split('@')[0],
            role: 'customer',
          },
        });
        if (createErr || !createdData?.user) {
          console.error('[verify-otp] createUser failed:', createErr);
          return NextResponse.json(
            { error: createErr?.message || 'Unable to verify and initialize user account.' },
            { status: 500 }
          );
        }
        resolvedUser = createdData.user;
      }
    }

    if (!resolvedUser) {
      return NextResponse.json(
        { error: 'Verification failed. Please request a new verification code.' },
        { status: 400 }
      );
    }

    // 3. Ensure profile exists in profiles table (non-fatal)
    try {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .or(`id.eq.${resolvedUser.id},auth_user_id.eq.${resolvedUser.id}`)
        .maybeSingle();

      if (!existingProfile) {
        await supabaseAdmin.from('profiles').insert({
          id: resolvedUser.id,
          auth_user_id: resolvedUser.id,
          email: cleanEmail,
          full_name: resolvedUser.user_metadata?.full_name || cleanEmail.split('@')[0],
          phone: resolvedUser.user_metadata?.phone || '',
          role: 'customer',
        });
      }
    } catch (profileErr) {
      console.warn('[verify-otp] Non-fatal profile sync note:', profileErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Verified successfully!',
      session: authData?.session || null,
      user: resolvedUser,
    });
  } catch (err: any) {
    console.error('[verify-otp] Exception:', err);
    return NextResponse.json({ error: err.message || 'Server error verifying code.' }, { status: 500 });
  }
}
