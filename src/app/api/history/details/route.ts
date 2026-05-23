import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const historyId = searchParams.get('historyId');
    if (!historyId) {
      return NextResponse.json({ error: 'historyId is required' }, { status: 400 });
    }

    const historyFile = path.join(HISTORY_DIR, `${historyId}.json`);
    
    if (!fs.existsSync(historyFile)) {
      return NextResponse.json({ error: 'History not found' }, { status: 404 });
    }

    const historyData = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    
    // Verify ownership
    if (historyData.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ details: historyData });
  } catch (err) {
    console.error('[GET /api/history/details]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
