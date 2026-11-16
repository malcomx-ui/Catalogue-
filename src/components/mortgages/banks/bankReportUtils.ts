export const formatUGX = (val: any, dashIfZero = false): string => {
  const num = Number(val || 0);
  if (dashIfZero && num === 0) return '-';
  return `UGX ${num.toLocaleString()}`;
};

export const formatAmount = (val: any): string => {
  const num = Number(val || 0);
  if (!val || isNaN(num) || num === 0) return '-';
  return num.toLocaleString();
};

export const formatDate = (val: any): string => {
  if (!val) return '-';
  const str = String(val).trim();
  if (!str) return '-';
  return str.slice(0, 10);
};

export const computeTurnaroundDays = (start?: string | null, end?: string | null): number | null => {
  if (!start || !end) return null;
  const s = new Date(String(start).slice(0, 10));
  const e = new Date(String(end).slice(0, 10));
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
};

export const extractYearsFromRecords = (records: any[]): number[] => {
  const set = new Set<number>([new Date().getFullYear()]);
  records.forEach((r) => {
    const y = Number(r?.record_year);
    if (!isNaN(y) && y > 1990 && y < 2100) {
      set.add(y);
    }
  });
  return Array.from(set).sort((a, b) => b - a);
};

const escapeCsvCell = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportRecordsToCsv = (
  filename: string,
  headers: string[],
  rows: Array<Array<any>>
): void => {
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
