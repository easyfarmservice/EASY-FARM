import { NextRequest, NextResponse } from 'next/server';
import { LegalService } from '@/services/legal.service';
import { LegalDocumentKey } from '@/types/legal';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = (searchParams.get('key') || 'terms-and-conditions') as LegalDocumentKey;

    if (key !== 'terms-and-conditions' && key !== 'privacy-policy') {
      return NextResponse.json(
        { success: false, error: 'Invalid document key. Must be terms-and-conditions or privacy-policy.' },
        { status: 400 }
      );
    }

    const result = await LegalService.getPublishedDocument(key);
    const business = await LegalService.getLegalBusinessDetails();

    return NextResponse.json({
      success: true,
      document: result.document,
      version: result.version,
      business,
    });
  } catch (error: any) {
    console.error('Error fetching legal document:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error fetching legal document' },
      { status: 500 }
    );
  }
}

