import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { WhatsAppClientManager } from '@/lib/whatsapp/client';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId') || 'default';

    // Get account info from WhatsApp client manager
    const accountInfo = WhatsAppClientManager.getAccountInfo(accountId);
    
    return NextResponse.json({
      status: accountInfo.status,
      qr: accountInfo.qr,
      qrDataUrl: accountInfo.qrDataUrl,
      phoneNumber: accountInfo.phoneNumber,
      lastError: accountInfo.lastError,
      connectionAttempts: accountInfo.connectionAttempts,
      lastConnected: accountInfo.lastConnected,
      isInitializing: accountInfo.isInitializing
    });
  } catch (err) {
    console.error('[GET /api/whatsapp/status]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
