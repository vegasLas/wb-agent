function tableToMatrix(table: HTMLTableElement): (string | number)[][] {
  const rows: (string | number)[][] = [];

  for (const row of table.rows) {
    const rowData: (string | number)[] = [];
    for (const cell of row.cells) {
      const text = cell.textContent?.trim() ?? '';
      const num = Number(text.replace(/\s/g, '').replace(',', '.'));
      rowData.push(Number.isFinite(num) && text !== '' ? num : text);
    }
    rows.push(rowData);
  }

  return rows;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `table_${y}-${m}-${d}_${h}-${min}`;
}

export async function exportTable(table: HTMLTableElement, format: 'csv' | 'xlsx') {
  const data = tableToMatrix(table);
  const filenameBase = generateFilename();

  if (format === 'csv') {
    const csv = data
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(','),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filenameBase}.csv`);
  } else {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    downloadBlob(blob, `${filenameBase}.xlsx`);
  }
}
