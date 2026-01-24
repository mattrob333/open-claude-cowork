/**
 * File Extractor Utility
 *
 * Extracts text content from files for ephemeral chat context.
 * Simple files (txt, md, json, csv) are extracted client-side.
 * Complex files (pdf, docx) are sent to the server for extraction.
 */

import { SERVER_URL } from '../constants';

// File types that can be extracted client-side
const CLIENT_EXTRACTABLE_TYPES = ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'xml', 'yaml', 'yml'];

// File types that require server-side extraction
const SERVER_EXTRACTABLE_TYPES = ['pdf', 'docx', 'doc'];

// All supported file types
export const SUPPORTED_EPHEMERAL_TYPES = [...CLIENT_EXTRACTABLE_TYPES, ...SERVER_EXTRACTABLE_TYPES];

/**
 * Check if a file type is supported for ephemeral context
 */
export function isSupportedFileType(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return SUPPORTED_EPHEMERAL_TYPES.includes(ext);
}

/**
 * Check if a file can be extracted client-side
 */
export function isClientExtractable(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return CLIENT_EXTRACTABLE_TYPES.includes(ext);
}

/**
 * Extract text content from a file
 * @param file - The File object to extract text from
 * @returns Promise<string> - The extracted text content
 */
export async function extractTextContent(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Client-side extraction for simple text files
  if (CLIENT_EXTRACTABLE_TYPES.includes(ext)) {
    return await extractClientSide(file, ext);
  }

  // Server-side extraction for complex files
  if (SERVER_EXTRACTABLE_TYPES.includes(ext)) {
    return await extractServerSide(file);
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Extract text from simple files client-side
 */
async function extractClientSide(file: File, ext: string): Promise<string> {
  const text = await file.text();

  // For JSON files, pretty-print for better readability
  if (ext === 'json') {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If JSON parsing fails, return as-is
      return text;
    }
  }

  // For CSV files, format as a table-like structure
  if (ext === 'csv') {
    return formatCsvContent(text);
  }

  return text;
}

/**
 * Format CSV content for better readability in context
 */
function formatCsvContent(csvText: string): string {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return csvText;

  // Parse CSV (simple parser, handles basic cases)
  const rows = lines.map(line => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  });

  // Format as markdown table if we have headers
  if (rows.length > 1) {
    const headers = rows[0];
    const dataRows = rows.slice(1);

    let result = '| ' + headers.join(' | ') + ' |\n';
    result += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

    for (const row of dataRows.slice(0, 100)) { // Limit to 100 rows for context
      result += '| ' + row.map(cell => cell.replace(/\|/g, '\\|')).join(' | ') + ' |\n';
    }

    if (dataRows.length > 100) {
      result += `\n... and ${dataRows.length - 100} more rows`;
    }

    return result;
  }

  return csvText;
}

/**
 * Extract text from complex files via server
 */
async function extractServerSide(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${SERVER_URL}/api/documents/extract`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Extraction failed' }));
    throw new Error(error.message || error.error || `Failed to extract content: ${response.status}`);
  }

  const result = await response.json();
  return result.content || '';
}

/**
 * Validate file size for ephemeral context
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default: 5MB)
 */
export function validateFileSize(file: File, maxSizeMB: number = 5): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

/**
 * Get a human-readable file type description
 */
export function getFileTypeDescription(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const descriptions: Record<string, string> = {
    pdf: 'PDF Document',
    docx: 'Word Document',
    doc: 'Word Document',
    txt: 'Text File',
    md: 'Markdown',
    json: 'JSON Data',
    csv: 'CSV Data',
    js: 'JavaScript',
    ts: 'TypeScript',
    jsx: 'React JSX',
    tsx: 'React TSX',
    py: 'Python',
    html: 'HTML',
    css: 'CSS',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML'
  };
  return descriptions[ext] || ext.toUpperCase();
}
