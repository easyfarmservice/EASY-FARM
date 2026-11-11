import { NextResponse } from 'next/server';
import { LegalService } from '@/services/legal.service';

export async function GET() {
  try {
    const csvData = await LegalService.exportAcceptanceRecordsCsv();
    const fileName = `easyfarm-legal-acceptances-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting acceptance CSV:', error);
    return NextResponse.json({ success: false, error: 'Internal server error exporting CSV' }, { status: 500 });
  }
}

