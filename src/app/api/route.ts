import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'J8PRO MAGIC SCANNER',
    version: '1.0.0'
  });
}
