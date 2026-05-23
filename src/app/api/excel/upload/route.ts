import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Simple file-based storage for Excel files
const EXCEL_DIR = path.join(process.cwd(), 'data', 'excel');

// Ensure directory exists
if (!fs.existsSync(EXCEL_DIR)) {
  fs.mkdirSync(EXCEL_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json({ error: 'Invalid file type. Only .xlsx, .xls, .csv allowed' }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    // Extract headers and rows
    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1).map((row: any) => {
      const rowObj: Record<string, any> = {};
      headers.forEach((header, index) => {
        rowObj[header] = row[index] || '';
      });
      return rowObj;
    });

    // Generate file ID and save metadata
    const fileId = `excel_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const metadata = {
      id: fileId,
      userId: session.user.id,
      originalName: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      headers,
      rowCount: rows.length,
      rows: rows.slice(0, 5) // Store first 5 rows as preview
    };

    // Save full data
    const fullData = {
      ...metadata,
      rows // Full rows data
    };

    const metadataFile = path.join(EXCEL_DIR, `${fileId}_metadata.json`);
    const dataFile = path.join(EXCEL_DIR, `${fileId}_data.json`);
    
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    fs.writeFileSync(dataFile, JSON.stringify(fullData, null, 2));

    // Also save original file
    const originalFile = path.join(EXCEL_DIR, `${fileId}_original${path.extname(file.name)}`);
    fs.writeFileSync(originalFile, buffer);

    console.log(`[Excel] Uploaded file ${file.name} with ${rows.length} rows, headers: ${headers.join(', ')}`);

    return NextResponse.json({
      id: fileId,
      originalName: file.name,
      size: file.size,
      headers,
      rowCount: rows.length,
      preview: rows.slice(0, 5),
      uploadedAt: metadata.uploadedAt
    }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/excel/upload]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
