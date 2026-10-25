import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';

// GET /api/admin/unconfirmed-users
export async function GET(req: NextRequest) {
  const rateCheck = checkRateLimit(req, 30, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });

    const unconfirmed = users
      .filter((u) => !u.email_confirmed_at)
      .map((u) => ({ id: u.id, email: u.email, created_at: u.created_at }));

    return NextResponse.json({ unconfirmed, total: unconfirmed.length });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch unconfirmed users' }, { status: 500 });
  }
}

// POST /api/admin/unconfirmed-users — bulk-confirm all unconfirmed users
export async function POST(req: NextRequest) {
  const rateCheck = checkRateLimit(req, 10, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });

    const unconfirmed = users.filter((u) => !u.email_confirmed_at);
    let confirmed = 0;
    const errors: string[] = [];

    for (const user of unconfirmed) {
      const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
      if (updateErr) {
        errors.push(`${user.email}: ${updateErr.message}`);
      } else {
        confirmed++;
      }
    }

    return NextResponse.json({
      success: true,
      confirmed,
      errors,
      message: `Confirmed ${confirmed} of ${unconfirmed.length} users.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to confirm users' }, { status: 500 });
  }
}
