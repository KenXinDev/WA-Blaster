import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { WhatsAppService } from '@/services/whatsappService';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const qr = await WhatsAppService.getQRCode(accountId, session.user.id);
    return NextResponse.json({ qr });
  } catch (err) {
    console.error('[GET /api/whatsapp/qr-code]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
