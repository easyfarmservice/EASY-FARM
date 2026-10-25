import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { EmailService } from '@/services/email.service';

// POST /api/auth/resend-confirmation
// Resends the email confirmation link via Resend OR auto-confirms via Supabase Admin API
export async function POST(request: Request) {
  try {
    const { email, autoConfirm, name } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Find user in Supabase Auth
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    if (autoConfirm) {
      // Auto-confirm the user's email using admin API (bypasses email requirement)
      const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Email confirmed successfully! You can now log in.',
      });
    }

    // 2. Generate confirmation link via Supabase Admin
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectTo = `${origin}/auth/callback?next=/baskets`;

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo,
      },
    });

    let emailSent = false;

    if (!linkErr && linkData?.properties?.action_link) {
      // Send confirmation email via Resend
      const resendRes = await EmailService.sendAccountConfirmation({
        toEmail: email,
        name: name || user.user_metadata?.full_name || email.split('@')[0],
        confirmLink: linkData.properties.action_link,
      });

      if (resendRes.success) {
        emailSent = true;
      }
    }

    // Fallback: try standard Supabase auth resend if admin link generation failed
    if (!emailSent) {
      const { error: supabaseResendErr } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (supabaseResendErr && !linkData?.properties?.action_link) {
        return NextResponse.json({ error: supabaseResendErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent successfully. Please check your inbox (and spam folder).',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
