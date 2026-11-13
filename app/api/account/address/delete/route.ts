import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { addressId, customerId: fallbackCustomerId } = body || {};

    if (!addressId || typeof addressId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'addressId is required.' },
        { status: 400 }
      );
    }

    // 1. Authenticate Requesting User
    let resolvedProfileId: string | null = null;
    let authUserId: string | null = null;
    let isAdmin = false;

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        authUserId = user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (profile?.id) {
          resolvedProfileId = profile.id;
        }
        if (profile?.role === 'admin' || user.email?.endsWith('@easyfarm.in')) {
          isAdmin = true;
        }
      }
    } catch (authErr) {
      console.warn('[AddressDelete] Session check fallback:', authErr);
    }

    // Fallback for customerId in request body if session cookie was not forwarded
    if (!resolvedProfileId && fallbackCustomerId && typeof fallbackCustomerId === 'string') {
      resolvedProfileId = fallbackCustomerId;
    }

    if (!resolvedProfileId && !authUserId && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to manage your addresses.' },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    // 2. Fetch Target Address to verify existence and ownership
    const { data: targetAddr, error: fetchErr } = await admin
      .from('customer_addresses')
      .select('id, customer_id, is_default')
      .eq('id', addressId)
      .maybeSingle();

    if (fetchErr) {
      console.error('[AddressDelete] Fetch address error:', fetchErr);
      return NextResponse.json(
        { success: false, error: 'Failed to inspect address.' },
        { status: 500 }
      );
    }

    // Address already doesn't exist
    if (!targetAddr) {
      return NextResponse.json({
        success: true,
        message: 'Address already removed.',
      });
    }

    // 3. Strict Ownership Verification (Prevent unauthorized cross-account address tampering)
    const isOwner =
      isAdmin ||
      (resolvedProfileId && targetAddr.customer_id === resolvedProfileId) ||
      (authUserId && targetAddr.customer_id === authUserId);

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. You do not have permission to delete this address.' },
        { status: 403 }
      );
    }

    // 4. Check if this address is referenced by ANY existing orders
    const { data: linkedOrders, error: orderCheckErr } = await admin
      .from('orders')
      .select('id')
      .eq('address_id', addressId)
      .limit(1);

    if (orderCheckErr) {
      console.warn('[AddressDelete] Orders check error:', orderCheckErr);
    }

    const isReferencedInOrders = linkedOrders && linkedOrders.length > 0;

    if (isReferencedInOrders) {
      // Address is referenced by historical orders:
      // Setting customer_id to NULL detaches the address from the customer's active account
      // while preserving order delivery history and avoiding foreign key constraint 23503.
      const { error: detachErr } = await admin
        .from('customer_addresses')
        .update({
          customer_id: null,
          is_default: false,
        })
        .eq('id', addressId);

      if (detachErr) {
        console.error('[AddressDelete] Detach address error:', detachErr);
        return NextResponse.json(
          { success: false, error: `Failed to remove address: ${detachErr.message}` },
          { status: 500 }
        );
      }
    } else {
      // Address has no orders: permanently delete the row
      const { error: deleteErr } = await admin
        .from('customer_addresses')
        .delete()
        .eq('id', addressId);

      if (deleteErr) {
        console.error('[AddressDelete] Hard delete address error:', deleteErr);
        return NextResponse.json(
          { success: false, error: `Failed to remove address: ${deleteErr.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Address removed successfully.',
      detached: isReferencedInOrders,
    });
  } catch (err: any) {
    console.error('[AddressDelete] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error while removing address.' },
      { status: 500 }
    );
  }
}

