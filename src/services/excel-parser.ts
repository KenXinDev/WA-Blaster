/**
 * Excel parser service using SheetJS (xlsx).
 * Handles parsing Excel buffers/files and extracting phone numbers.
 *
 * Implements Requirements: 3.1, 3.2, 3.3
 */

import * as XLSX from "xlsx";
import { promises as fs } from "fs";
import type { ExcelParseResult, ExcelRow } from "@/types/index";

/**
 * Parses an Excel file buffer and extracts column names and row data.
 *
 * @param buffer - Raw file buffer of the Excel file
 * @returns ExcelParseResult with columns, rows, totalRows, and empty phone number arrays
 */
export function parseExcelBuffer(buffer: Buffer): ExcelParseResult {
  // Parse the workbook from the buffer
  const workbook = XLSX.read(buffer, { type: "buffer" });

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      columns: [],
      rows: [],
      totalRows: 0,
      validPhoneNumbers: [],
      invalidPhoneNumbers: [],
    };
  }

  const worksheet = workbook.Sheets[sheetName];

  // Convert sheet to array of arrays to extract header and rows manually
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
  });

  if (rawData.length === 0) {
    return {
      columns: [],
      rows: [],
      totalRows: 0,
      validPhoneNumbers: [],
      invalidPhoneNumbers: [],
    };
  }

  // First row is the header
  const headerRow = rawData[0] as unknown[];
  const columns: string[] = headerRow.map((cell) =>
    cell !== null && cell !== undefined ? String(cell) : ""
  );

  // Remaining rows are data rows
  const dataRows = rawData.slice(1);
  const rows: ExcelRow[] = dataRows
    .filter((row) => {
      // Skip completely empty rows
      return (row as unknown[]).some(
        (cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""
      );
    })
    .map((row) => {
      const rowRecord: ExcelRow = {};
      columns.forEach((col, index) => {
        const cell = (row as unknown[])[index];
        rowRecord[col] =
          cell !== null && cell !== undefined ? String(cell) : "";
      });
      return rowRecord;
    });

  return {
    columns,
    rows,
    totalRows: rows.length,
    validPhoneNumbers: [],
    invalidPhoneNumbers: [],
  };
}

/**
 * Reads an Excel file from disk and parses it.
 *
 * @param filePath - Absolute or relative path to the Excel file
 * @returns Promise resolving to ExcelParseResult
 */
export async function parseExcelFile(filePath: string): Promise<ExcelParseResult> {
  const buffer = await fs.readFile(filePath);
  return parseExcelBuffer(buffer);
}

/**
 * Extracts raw phone number strings from a specific column in the parsed rows.
 *
 * @param rows - Array of ExcelRow objects from a parsed Excel file
 * @param phoneColumn - The column name that contains phone numbers
 * @returns Array of raw phone number strings (non-empty values only)
 */
export function extractPhoneNumbers(rows: ExcelRow[], phoneColumn: string): string[] {
  return rows
    .map((row) => row[phoneColumn] ?? "")
    .filter((value) => value.trim() !== "");
}
