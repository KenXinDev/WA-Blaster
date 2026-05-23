import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');

// Access the same global cancel set used by send/route.ts
const g = globalThis as unknown as { cancelledBroadcasts: Set<string> | undefined };
if (!g.cancelledBroadcasts) g.cancelledBroadcasts = new Set<string>();
const cancelledBroadcasts: Set<string> = g.cancelledBroadcasts;

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const historyId = searchParams.get('historyId');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      // Delete all history for this user
      let deletedCount = 0;
      if (fs.existsSync(HISTORY_DIR)) {
        const files = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, file), 'utf-8'));
            if (data.userId === session.user.id) {
              // Auto-cancel if still running
              if (data.status === 'in_progress') {
                cancelledBroadcasts.add(data.id);
                console.log(`[History] Auto-cancel on delete: ${data.id}`);
              }
              fs.unlinkSync(path.join(HISTORY_DIR, file));
              deletedCount++;
            }
          } catch { /* skip */ }
        }
      }
      return NextResponse.json({ success: true, deletedCount });
    }

    if (!historyId) {
      return NextResponse.json({ error: 'historyId is required' }, { status: 400 });
    }

    const historyFile = path.join(HISTORY_DIR, `${historyId}.json`);

    if (!fs.existsSync(historyFile)) {
      return NextResponse.json({ error: 'History not found' }, { status: 404 });
    }

    // Verify ownership
    const data = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    if (data.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Auto-cancel if the broadcast is still running so the loop stops
    if (data.status === 'in_progress') {
      cancelledBroadcasts.add(historyId);
      console.log(`[History] Auto-cancel on delete: ${historyId}`);
    }

    fs.unlinkSync(historyFile);
    return NextResponse.json({ success: true, message: 'History deleted' });

  } catch (err) {
    console.error('[DELETE /api/history/delete]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
