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
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));

    const histories: any[] = [];
    
    if (fs.existsSync(HISTORY_DIR)) {
      const fileList = fs.readdirSync(HISTORY_DIR);
      const historyFiles = fileList.filter(f => f.endsWith('.json'));
      
      for (const historyFile of historyFiles) {
        try {
          const historyData = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, historyFile), 'utf-8'));
          if (historyData.userId === session.user.id) {
            // Remove full results and rows to reduce payload size for list view
            const summary = {
              id: historyData.id,
              accountId: historyData.accountId,
              message: historyData.message?.substring(0, 100) + (historyData.message?.length > 100 ? '...' : ''),
              status: historyData.status,
              createdAt: historyData.createdAt,
              startedAt: historyData.startedAt,
              completedAt: historyData.completedAt,
              summary: historyData.summary,
              error: historyData.error
            };
            histories.push(summary);
          }
        } catch (error) {
          console.error('Error reading history file:', historyFile, error);
        }
      }
    }

    // Sort by creation date (newest first)
    histories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const total = histories.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistories = histories.slice(startIndex, endIndex);

    return NextResponse.json({
      histories: paginatedHistories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('[GET /api/history/list]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
