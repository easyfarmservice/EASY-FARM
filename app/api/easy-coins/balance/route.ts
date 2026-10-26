import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { EasyCoinsService } from '@/services/easy-coins.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let customerId = searchParams.get('customerId');

    // If customerId not provided in query, check logged in Supabase session
    if (!customerId) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const res = NextResponse.next();

      const supabaseUserClient = createServerClient(url, anonKey, {
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

      const { data: { user } } = await supabaseUserClient.auth.getUser();

      if (user) {
        const supabaseAdmin = createAdminClient();
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        customerId = profile?.id || user.id;
      }
    }

    // Default to fallback ID if unauthenticated (allows client preview with localStorage)
    if (!customerId) {
      customerId = 'guest-customer-default';
    }

    const overview = await EasyCoinsService.getCustomerOverview(customerId);

    return NextResponse.json({
      success: true,
      customerId,
      ...overview,
    });
  } catch (error: any) {
    console.error('Error fetching Easy Coins balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coin balance' },
      { status: 500 }
    );
  }
}
