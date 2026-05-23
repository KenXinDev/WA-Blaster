import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');

// Access the same global cancel set used by send/route.ts
const g = globalThis as unknown as { cancelledBroadcasts: Set<string> | undefined };
if (!g.cancelledBroadcasts) g.cancelledBroadcasts = new Set<string>();
const cancelledBroadcasts: Set<string> = g.cancelledBroadcasts;

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as { historyId?: string };
    const { historyId } = body;

    if (!historyId) {
      return NextResponse.json({ error: 'historyId is required' }, { status: 400 });
    }

    // Verify the broadcast belongs to this user and is in_progress
    const historyFile = path.join(HISTORY_DIR, `${historyId}.json`);
    if (!fs.existsSync(historyFile)) {
      return NextResponse.json({ error: 'History not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    if (data.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (data.status !== 'in_progress') {
      return NextResponse.json({
        error: `Broadcast sudah selesai (status: ${data.status})`,
      }, { status: 400 });
    }

    // Add to cancelled set — the broadcast loop will check this on the next iteration
    cancelledBroadcasts.add(historyId);
    console.log(`[Broadcast] Cancel requested for ${historyId}`);

    return NextResponse.json({
      success: true,
      message: 'Permintaan pembatalan dikirim. Broadcast akan berhenti pada iterasi berikutnya.',
    });
  } catch (err) {
    console.error('[POST /api/messages/cancel]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
