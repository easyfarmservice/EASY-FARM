import { NextRequest, NextResponse } from 'next/server';
import { EasyCoinsService } from '@/services/easy-coins.service';
import { verifyAdminAuth } from '@/lib/security/auth-guard';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { customerId, amount, reason, adminEmail } = body;

    if (!customerId || typeof amount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'customerId and numeric amount are required' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'A valid audit reason (minimum 5 characters) is required' },
        { status: 400 }
      );
    }

    const entry = await EasyCoinsService.adminAdjustCoins({
      customer_id: customerId,
      amount,
      reason,
      admin_email: adminEmail || 'admin@easyfarm.in',
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
