import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AuthCheckResult {
  authorized: boolean;
  user?: any;
  profile?: any;
  response?: NextResponse;
}

/**
 * Independently verifies that the request originates from an authenticated Supabase user
 * with verified admin authorization (profiles.role === 'admin' or entry in admin_users).
 */
export async function verifyAdminAuth(req: NextRequest): Promise<AuthCheckResult> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tuhnxwpnlwfllvouhpvu.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Extract authorization header or cookies
    const authHeader = req.headers.get('authorization');
    let user: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseAdmin = createAdminClient();
      const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && userData?.user) {
        user = userData.user;
      }
    }

    if (!user) {
      // Fallback to cookie-based session verification
      const res = NextResponse.next();
      const supabase = createServerClient(url, anonKey, {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            );
          },
        },
      });

      const { data: userData } = await supabase.auth.getUser();
      user = userData?.user || null;
    }

    if (!user) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Authentication required. Please log in.' },
          { status: 401 }
        ),
      };
    }

    // Verify Admin Role from trusted server database
    const supabaseAdmin = createAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isRoleAdmin = profile?.role === 'admin';
    const isDomainAdmin = user.email?.endsWith('@easyfarm.in');

    let isAdminRecord = false;
    if (profile?.id) {
      const { data: adminRecord } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();
      if (adminRecord) isAdminRecord = true;
    }

    if (!isRoleAdmin && !isDomainAdmin && !isAdminRecord) {
      return {
        authorized: false,
        user,
        profile,
        response: NextResponse.json(
          { error: 'Forbidden: Administrator privileges required.' },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      user,
      profile,
    };
  } catch (err: any) {
    console.error('[verifyAdminAuth] Security verification failed:', err);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden: Security check failed.' },
        { status: 403 }
      ),
    };
  }
}
