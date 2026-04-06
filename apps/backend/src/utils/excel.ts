/**
 * Excel utility functions for parsing and building Excel files
 */

import * as XLSX from 'xlsx';

/**
 * Base64 decode (atob for Node.js)
 */
export function atob(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

/**
 * Base64 encode (btoa for Node.js)
 */
export function btoa(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Parse Excel from base64 string
 * Returns workbook and data as array of arrays (header: 1)
 */
export function parseExcelFromBase64(base64: string): {
  workbook: XLSX.WorkBook;
  data: any[][];
  sheetName: string;
  allSheets: string[];
} {
  const buffer = atob(base64);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
  }) as any[][];
  return { workbook, data, sheetName, allSheets: workbook.SheetNames };
}

/**
 * Filter Excel rows by a predicate function
 * Returns filtered data rows (excluding header) with normalized column count
 */
export function filterExcelRows(
  data: any[][],
  predicate: (row: any[]) => boolean,
): { headerRow: any[]; filteredRows: any[][] } {
  const [headerRow, ...dataRows] = data;
  const columnCount = headerRow.length;

  const filteredRows = dataRows
    .filter(predicate)
    .map((row) => {
      const normalized = [...row];
      // Pad to match header column count
      while (normalized.length < columnCount) {
        normalized.push('');
      }
      return normalized.slice(0, columnCount);
    });

  return { headerRow, filteredRows };
}

/**
 * Build Excel workbook with filtered data and convert to base64
 * Preserves original workbook metadata
 */
export function buildFilteredExcel(
  originalWorkbook: XLSX.WorkBook,
  filteredRows: any[][],
  columnCount: number,
  options: { minRows?: number } = {},
): string {
  const { minRows = 10 } = options;
  const sheetName = originalWorkbook.SheetNames[0];
  const worksheet = originalWorkbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // Pad rows to minimum if needed
  while (filteredRows.length < minRows - 1) {
    filteredRows.push(new Array(columnCount).fill(''));
  }

  // Clear existing data rows (keep header row 0)
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      delete worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
    }
  }

  // Write filtered data starting from row 1
  for (let i = 0; i < filteredRows.length; i++) {
    for (let j = 0; j < filteredRows[i].length; j++) {
      const val = filteredRows[i][j];
      if (val !== '' && val != null) {
        worksheet[XLSX.utils.encode_cell({ r: i + 1, c: j })] = {
          v: val,
          t: typeof val === 'number' ? 'n' : 's',
        };
      }
    }
  }

  // Update worksheet range
  worksheet['!ref'] = XLSX.utils.encode_range({
    s: range.s,
    e: {
      r: Math.max(range.s.r + filteredRows.length, minRows - 1),
      c: columnCount - 1,
    },
  });

  // Convert to base64
  const buffer = XLSX.write(originalWorkbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  return btoa(buffer);
}

/**
 * Convert Excel data to array of objects using header row as keys
 */
export function excelToObjects(data: any[][]): Record<string, any>[] {
  if (!data?.length || data.length < 2) {
    return [];
  }

  const headers = data[0] as string[];
  const rows = data.slice(1);

  return rows.map((row) => {
    const obj: Record<string, any> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i];
    }
    return obj;
  });
}
