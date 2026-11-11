import { NextRequest, NextResponse } from 'next/server';
import { LegalService } from '@/services/legal.service';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      const documents = await LegalService.getAllDocuments();
      return NextResponse.json({ success: true, documents });
    }

    const versions = await LegalService.getAllVersions(documentId);
    return NextResponse.json({ success: true, versions });
  } catch (error: any) {
    console.error('Error fetching admin legal versions:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, documentId, version, title, content, summaryOfChanges, requiresReacceptance, effectiveDate } = body;

    let adminEmail = 'admin@easyfarm.in';
    let adminId: string | undefined;

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        adminEmail = user.email || adminEmail;
        adminId = user.id;
      }
    } catch {}

    if (action === 'save_draft') {
      if (!documentId || !version || !content) {
        return NextResponse.json({ success: false, error: 'Document ID, version, and content are required.' }, { status: 400 });
      }

      const draft = await LegalService.saveDraftVersion({
        documentId,
        version,
        title: title || 'Draft Version',
        content,
        summaryOfChanges,
        requiresReacceptance,
        adminId,
        adminEmail,
      });

      return NextResponse.json({ success: true, message: 'Draft saved successfully.', draft });
    }

    if (action === 'publish') {
      if (!documentId || !version) {
        return NextResponse.json({ success: false, error: 'Document ID and version are required for publication.' }, { status: 400 });
      }

      const result = await LegalService.publishVersion({
        documentId,
        version,
        effectiveDate,
        summaryOfChanges,
        requiresReacceptance,
        adminId,
        adminEmail,
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: result.message, version: result.version });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified. Must be save_draft or publish.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in admin legal version POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

