import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { WeeklyStreakService } from '@/services/weekly-streak.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let customerId = searchParams.get('customerId');

    // 1. Try to get customer from authenticated Supabase cookie session
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
      } catch (authErr) {
        console.warn('[WeeklyStreak API] Cookie auth check error:', authErr);
      }
    }

    if (!customerId) {
      // Guest or not logged in: return public streak milestones & cycle info
      const milestones = await WeeklyStreakService.getMilestones(true);
      const settings = await WeeklyStreakService.getSettings();
      return NextResponse.json({
        success: true,
        isGuest: true,
        streak: {
          current_streak: 0,
          best_streak: 0,
          total_stamps: 0,
          status: 'inactive',
        },
        milestones,
        settings,
      });
    }

    const overview = await WeeklyStreakService.getOverview(customerId);

    return NextResponse.json({
      success: true,
      isGuest: false,
      ...overview,
    });
  } catch (error: any) {
    console.error('[WeeklyStreak API] Error fetching status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch streak status' },
      { status: 500 }
    );
  }
}

