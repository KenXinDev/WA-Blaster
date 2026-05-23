import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

const EXCEL_DIR = path.join(process.cwd(), 'data', 'excel');

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('id');

    if (fileId) {
      // Get specific file data
      const dataFile = path.join(EXCEL_DIR, `${fileId}_data.json`);
      
      if (!fs.existsSync(dataFile)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const fileData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
      
      // Verify ownership
      if (fileData.userId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      return NextResponse.json(fileData);
    } else {
      // List all files for user
      const files: any[] = [];
      
      if (fs.existsSync(EXCEL_DIR)) {
        const fileList = fs.readdirSync(EXCEL_DIR);
        const metadataFiles = fileList.filter(f => f.endsWith('_metadata.json'));
        
        for (const metadataFile of metadataFiles) {
          try {
            const metadata = JSON.parse(fs.readFileSync(path.join(EXCEL_DIR, metadataFile), 'utf-8'));
            if (metadata.userId === session.user.id) {
              files.push(metadata);
            }
          } catch (error) {
            console.error('Error reading metadata file:', metadataFile, error);
          }
        }
      }

      // Sort by upload date (newest first)
      files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      return NextResponse.json({ files });
    }
  } catch (err) {
    console.error('[GET /api/excel]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    // Delete all related files
    const filesToDelete = [
      path.join(EXCEL_DIR, `${fileId}_metadata.json`),
      path.join(EXCEL_DIR, `${fileId}_data.json`),
    ];

    // Find and delete original file
    if (fs.existsSync(EXCEL_DIR)) {
      const fileList = fs.readdirSync(EXCEL_DIR);
      const originalFile = fileList.find(f => f.startsWith(`${fileId}_original`));
      if (originalFile) {
        filesToDelete.push(path.join(EXCEL_DIR, originalFile));
      }
    }

    // Verify ownership before deletion
    const metadataFile = path.join(EXCEL_DIR, `${fileId}_metadata.json`);
    if (fs.existsSync(metadataFile)) {
      const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
      if (metadata.userId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Delete files
    let deletedCount = 0;
    for (const filePath of filesToDelete) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    console.log(`[Excel] Deleted ${deletedCount} files for ${fileId}`);

    return NextResponse.json({ 
      success: true, 
      message: `File ${fileId} deleted successfully`,
      deletedFiles: deletedCount 
    });
  } catch (err) {
    console.error('[DELETE /api/excel]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
