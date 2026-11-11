import { NextRequest, NextResponse } from 'next/server';
import { WeeklyStreakService } from '@/services/weekly-streak.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const milestones = await WeeklyStreakService.getMilestones(activeOnly);
    return NextResponse.json({ success: true, milestones });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, required_weeks, discount_type, discount_value, min_order_amount, max_discount_cap, applicable_baskets, reward_expiry_days, is_active, description, badge_icon, sort_order, adminEmail } = body;

    if (!title || !required_weeks || !discount_value) {
      return NextResponse.json({ success: false, error: 'Title, required_weeks, and discount_value are required' }, { status: 400 });
    }

    const milestone = await WeeklyStreakService.createMilestone({
      title,
      required_weeks: Number(required_weeks),
      discount_type: discount_type || 'percentage',
      discount_value: Number(discount_value),
      min_order_amount: Number(min_order_amount || 0),
      max_discount_cap: max_discount_cap ? Number(max_discount_cap) : null,
      applicable_baskets: applicable_baskets || ['all'],
      reward_expiry_days: reward_expiry_days ? Number(reward_expiry_days) : null,
      is_active: is_active !== false,
      description: description || '',
      badge_icon: badge_icon || 'flame',
      sort_order: Number(sort_order || 0),
    }, adminEmail);

    return NextResponse.json({ success: true, milestone });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, adminEmail, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Milestone ID is required' }, { status: 400 });
    }

    const updated = await WeeklyStreakService.updateMilestone(id, updates, adminEmail);
    return NextResponse.json({ success: true, milestone: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const adminEmail = searchParams.get('adminEmail') || undefined;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Milestone ID is required' }, { status: 400 });
    }

    const result = await WeeklyStreakService.deleteMilestone(id, adminEmail);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

