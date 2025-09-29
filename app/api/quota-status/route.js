import { NextResponse } from 'next/server';
import { getQuotaStatus } from '@/lib/quotaTracker';

export async function GET() {
  const status = getQuotaStatus();
  
  return NextResponse.json({
    success: true,
    quota: status
  });
}