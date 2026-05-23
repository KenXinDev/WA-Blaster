import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { WhatsAppClientManager } from '@/lib/whatsapp/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as { accountId?: string };
    const accountId = body.accountId?.trim() || 'default';

    // Logout WhatsApp account
    await WhatsAppClientManager.logoutAccount(accountId);

    return NextResponse.json({ 
      success: true, 
      message: 'WhatsApp account disconnected',
      accountId 
    });
  } catch (err) {
    console.error('[POST /api/whatsapp/disconnect]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
