import prisma from '@/lib/prisma';
import { parseExcelBuffer } from './excel-parser';
import { filterValidPhoneNumbers } from '@/utils/phone-validator';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export class ExcelService {
  static async saveFile(userId: string, fileName: string, buffer: Buffer) {
    await ensureUploadDir();

    const uniqueName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    await fs.writeFile(filePath, buffer);

    const parsed = parseExcelBuffer(buffer);
    const phoneNumbers = parsed.rows.flatMap((row) =>
      Object.values(row).filter((v) => v.trim() !== '')
    );
    const { valid, invalid } = filterValidPhoneNumbers(phoneNumbers);

    const record = await prisma.excelFile.create({
      data: {
        userId,
        fileName,
        filePath,
        columns: JSON.stringify(parsed.columns),
        rowCount: parsed.totalRows,
      },
    });

    return {
      id: record.id,
      fileName: record.fileName,
      columns: parsed.columns,
      rowCount: parsed.totalRows,
      validCount: valid.length,
      invalidCount: invalid.length,
    };
  }

  static async getFiles(userId: string) {
    const files = await prisma.excelFile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return files.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      columns: JSON.parse(f.columns) as string[],
      rowCount: f.rowCount,
      createdAt: f.createdAt,
    }));
  }

  static async getFileData(fileId: string, userId: string) {
    const file = await prisma.excelFile.findFirst({
      where: { id: fileId, userId },
    });
    if (!file) throw new Error('File not found');

    const buffer = await fs.readFile(file.filePath);
    const parsed = parseExcelBuffer(buffer);

    return {
      id: file.id,
      fileName: file.fileName,
      columns: parsed.columns,
      rows: parsed.rows,
      rowCount: parsed.totalRows,
    };
  }

  static async deleteFile(fileId: string, userId: string) {
    const file = await prisma.excelFile.findFirst({
      where: { id: fileId, userId },
    });
    if (!file) throw new Error('File not found');

    try {
      await fs.unlink(file.filePath);
    } catch {
      // File may already be gone from disk; continue with DB deletion
    }

    await prisma.excelFile.delete({ where: { id: fileId } });
    return { success: true };
  }
}
