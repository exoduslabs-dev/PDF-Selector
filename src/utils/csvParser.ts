import { ValidationError } from '../types/common.js';

export interface CsvParseOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  skipEmptyLines?: boolean;
  trimWhitespace?: boolean;
}

export interface CsvParseResult<T> {
  data: T[];
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  headers: string[];
}

/**
 * Parse CSV content into objects with header mapping
 */
export const parseCsv = <T = Record<string, string>>(
  content: string,
  options: CsvParseOptions = {}
): CsvParseResult<T> => {
  const {
    delimiter = ',',
    quote = '"',
    escape = '"',
    skipEmptyLines = true,
    trimWhitespace = true,
  } = options;

  const result: CsvParseResult<T> = {
    data: [],
    errors: [],
    headers: [],
  };

  const lines = content.split(/\r?\n/);
  
  if (lines.length === 0) {
    throw new ValidationError('CSV content is empty');
  }

  // Parse header row
  const headerLine = lines[0];
  if (!headerLine) {
    throw new ValidationError('CSV header row is missing');
  }

  const headers = parseCsvLine(headerLine, delimiter, quote, escape);
  result.headers = trimWhitespace ? headers.map(h => h.trim()) : headers;

  if (result.headers.length === 0) {
    throw new ValidationError('CSV header row is empty');
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line || (skipEmptyLines && line.trim() === '')) {
      continue;
    }

    try {
      const values = parseCsvLine(line, delimiter, quote, escape);
      
      if (values.length !== result.headers.length) {
        result.errors.push({
          row: i + 1,
          message: `Expected ${result.headers.length} columns, got ${values.length}`,
        });
        continue;
      }

      const row: Record<string, string> = {};
      for (let j = 0; j < result.headers.length; j++) {
        const headerKey = result.headers[j];
        const value = trimWhitespace ? (values[j]?.trim() || '') : (values[j] || '');
        if (headerKey) {
          row[headerKey] = value;
        }
      }

      result.data.push(row as T);
    } catch (error) {
      result.errors.push({
        row: i + 1,
        message: error instanceof Error ? error.message : 'Parse error',
      });
    }
  }

  return result;
};

/**
 * Parse a single CSV line respecting quotes and escapes
 */
const parseCsvLine = (
  line: string,
  delimiter: string,
  quote: string,
  escape: string
): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = i + 1 < line.length ? line[i + 1] : null;

    if (inQuotes) {
      if (char === escape && nextChar === quote) {
        // Escaped quote
        current += quote;
        i += 2;
      } else if (char === quote) {
        // End quote
        inQuotes = false;
        i++;
      } else {
        // Regular character in quotes
        current += char;
        i++;
      }
    } else {
      if (char === quote) {
        // Start quote
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        // Field separator
        result.push(current);
        current = '';
        i++;
      } else {
        // Regular character
        current += char;
        i++;
      }
    }
  }

  // Add the last field
  result.push(current);

  if (inQuotes) {
    throw new Error('Unterminated quoted field');
  }

  return result;
};

/**
 * Convert array of objects to CSV string
 */
export const objectsToCsv = <T extends Record<string, any>>(
  data: T[],
  headers?: string[],
  options: CsvParseOptions = {}
): string => {
  const {
    delimiter = ',',
    quote = '"',
  } = options;

  if (data.length === 0) {
    return '';
  }

  // Use provided headers or extract from first object
  const firstObject = data[0];
  const csvHeaders = headers || (firstObject ? Object.keys(firstObject) : []);
  
  // Escape CSV value if needed
  const escapeValue = (value: any): string => {
    const str = String(value ?? '');
    
    // Quote if contains delimiter, quote, or newline
    if (str.includes(delimiter) || str.includes(quote) || str.includes('\n') || str.includes('\r')) {
      return quote + str.replace(new RegExp(quote, 'g'), quote + quote) + quote;
    }
    
    return str;
  };

  // Create header row
  const headerRow = csvHeaders.map(escapeValue).join(delimiter);
  
  // Create data rows
  const dataRows = data.map(row => 
    csvHeaders.map(header => escapeValue(row[header])).join(delimiter)
  );

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Validate CSV headers against expected headers
 */
export const validateCsvHeaders = (
  actualHeaders: string[],
  expectedHeaders: string[],
  allowExtra: boolean = false
): void => {
  const missing = expectedHeaders.filter(header => !actualHeaders.includes(header));
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required CSV headers: ${missing.join(', ')}`
    );
  }

  if (!allowExtra) {
    const extra = actualHeaders.filter(header => !expectedHeaders.includes(header));
    if (extra.length > 0) {
      throw new ValidationError(
        `Unexpected CSV headers: ${extra.join(', ')}`
      );
    }
  }
};
