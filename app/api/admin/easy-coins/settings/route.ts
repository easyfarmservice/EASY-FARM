import { NextRequest, NextResponse } from 'next/server';
import { EasyCoinsService } from '@/services/easy-coins.service';
import { verifyAdminAuth } from '@/lib/security/auth-guard';

export async function GET() {
  try {
    const settings = await EasyCoinsService.getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updated = await EasyCoinsService.adminUpdateSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
