import { NextResponse } from 'next/server';
import { getQuotaStatus } from '@/lib/quotaTracker';

export async function GET() {
  try {
    const status = getQuotaStatus();
    
    return NextResponse.json({
      success: true,
      quota: status
    });
  } catch (error) {
    console.error('Quota status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch quota status',
      details: error.message
    }, { status: 500 });
  }
}