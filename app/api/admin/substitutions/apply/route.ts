import { NextRequest, NextResponse } from 'next/server';
import { UnifiedBasketService } from '@/services/unified-basket.service';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const data = await UnifiedBasketService.scanSubstitutionsAndAffectedBaskets();
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error('[API/admin/substitutions] GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to scan substitutions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const rateCheck = checkRateLimit(req, 40, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { originalProductId, replacementProductId, reason } = body;

    if (!originalProductId || !replacementProductId) {
      return NextResponse.json(
        { error: 'originalProductId and replacementProductId are required' },
        { status: 400 }
      );
    }

    const result = await UnifiedBasketService.substituteProduct(
      originalProductId,
      replacementProductId,
      reason || 'Product unavailable in harvest',
      auth.user.id
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API/admin/substitutions] POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to apply substitution' },
      { status: 400 }
    );
  }
}
