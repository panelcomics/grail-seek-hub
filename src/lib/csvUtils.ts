/**
 * CSV import/export utilities for inventory management
 */

export interface InventoryItem {
  id?: string;
  title: string;
  issue_number?: string;
  grade?: string;
  private_location?: string;
  private_notes?: string;
  comicvine_issue_id?: string;
}

export interface CSVColumn {
  header: string;
  field: keyof InventoryItem;
}

export const INVENTORY_CSV_COLUMNS: CSVColumn[] = [
  { header: 'Title', field: 'title' },
  { header: 'Issue Number', field: 'issue_number' },
  { header: 'Grade', field: 'grade' },
  { header: 'Location', field: 'private_location' },
  { header: 'Notes', field: 'private_notes' },
];

/**
 * Export inventory items to CSV
 */
export function exportInventoryToCSV(items: InventoryItem[]): string {
  const headers = INVENTORY_CSV_COLUMNS.map(col => col.header).join(',');
  const rows = items.map(item => {
    return INVENTORY_CSV_COLUMNS.map(col => {
      const value = item[col.field] || '';
      // Escape quotes and wrap in quotes if contains comma or quote
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
}

/**
 * Parse CSV content into inventory items
 */
export function parseInventoryCSV(csvContent: string): {
  items: Partial<InventoryItem>[];
  headers: string[];
} {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { items: [], headers: [] };
  }

  const headers = parseCSVLine(lines[0]);
  const items: Partial<InventoryItem>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const item: Partial<InventoryItem> = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (value) {
        // Map header to field
        const column = INVENTORY_CSV_COLUMNS.find(
          col => col.header.toLowerCase() === header.toLowerCase()
        );
        if (column) {
          item[column.field] = value;
        }
      }
    });

    if (item.title) {
      items.push(item);
    }
  }

  return { items, headers };
}

/**
 * Parse a single CSV line handling quotes and commas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quotes
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

/**
 * Download a CSV file
 */
export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
