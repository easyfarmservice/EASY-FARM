import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { WeeklyStreakService } from '@/services/weekly-streak.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let customerId = searchParams.get('customerId');
    const status = searchParams.get('status') || 'active';

    if (!customerId) {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createServerClient(url, anonKey, {
          cookies: {
            getAll() {
              return req.cookies.getAll();
            },
            setAll() {},
          },
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (profile?.id) {
            customerId = profile.id;
          } else {
            customerId = user.id;
          }
        }
      } catch {}
    }

    if (!customerId) {
      return NextResponse.json({ success: true, rewards: [] });
    }

    const rewards = await WeeklyStreakService.getCustomerRewards(customerId, status);
    return NextResponse.json({ success: true, rewards });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

