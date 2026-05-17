import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface Lead {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  [key: string]: string | number | undefined;
}

export const parseFile = async (file: File): Promise<Lead[]> => {
  return new Promise((resolve, reject) => {
    const isCsv = file.name.endsWith('.csv');

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(normalizeData(results.data as Record<string, string | number | undefined>[]));
        },
        error: (error) => {
          reject(error);
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(normalizeData(json as Record<string, string | number | undefined>[]));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    }
  });
};

const normalizeData = (data: Record<string, string | number | undefined>[]): Lead[] => {
  return data.map((row, index) => {
    const normalized: Lead = { ...row, id: index.toString() };

    // Find name fields (case insensitive)
    const keys = Object.keys(row);
    const findKey = (search: string[]) => keys.find(k => search.some(s => k.toLowerCase().includes(s)));

    const nameKey = findKey(['name', 'full name']);
    const firstNameKey = findKey(['first name', 'fname', 'first_name']);
    const lastNameKey = findKey(['last name', 'lname', 'last_name']);
    const emailKey = findKey(['email', 'e-mail']);
    const phoneKey = findKey(['phone', 'mobile', 'cell']);

    if (nameKey) normalized.name = String(row[nameKey]);
    if (firstNameKey) normalized.first_name = String(row[firstNameKey]);
    if (lastNameKey) normalized.last_name = String(row[lastNameKey]);
    if (emailKey) normalized.email = String(row[emailKey]).toLowerCase().trim();

    // Clean phone number
    if (phoneKey) {
      const phone = String(row[phoneKey]).replace(/\D/g, '');
      normalized.phone = phone;
    }

    // Combine first/last if name is missing
    if (!normalized.name && normalized.first_name && normalized.last_name) {
      normalized.name = `${normalized.first_name} ${normalized.last_name}`;
    }

    return normalized;
  });
};
