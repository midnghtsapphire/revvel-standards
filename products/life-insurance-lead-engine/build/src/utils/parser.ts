import Papa from 'papaparse';
import * as XLSX from '@e965/xlsx';

export interface ParsedRow {
  [key: string]: string;
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return parseCSV(file);
  if (ext === 'xls' || ext === 'xlsx') return parseExcel(file);
  throw new Error('Unsupported file type. Use CSV or Excel.');
}

function parseCSV(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    });
  });
}

async function parseExcel(file: File): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: '' });
}

export function rowsToCSV(rows: ParsedRow[]): string {
  return Papa.unparse(rows);
}
