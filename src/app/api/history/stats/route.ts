import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let totalCampaigns = 0;
    let totalSent = 0;
    let totalFailed = 0;
    let totalContacts = 0;

    if (fs.existsSync(HISTORY_DIR)) {
      const files = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, file), 'utf-8'));
          if (data.userId === session.user.id) {
            totalCampaigns++;
            totalSent += data.summary?.sent || 0;
            totalFailed += data.summary?.failed || 0;
            totalContacts += data.summary?.total || 0;
          }
        } catch { /* skip bad files */ }
      }
    }

    const successRate = (totalSent + totalFailed) > 0
      ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
      : 0;

    return NextResponse.json({
      totalCampaigns,
      totalSent,
      totalFailed,
      totalContacts,
      successRate,
    });
  } catch (err) {
    console.error('[GET /api/history/stats]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
