/** Descarga tabular compatible con Excel (UTF-8 BOM + separador ;). */

function escapeCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadExcelCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const lines = [
    headers.map(escapeCell).join(";"),
    ...rows.map((row) => row.map(escapeCell).join(";")),
  ];
  const blob = new Blob(["\uFEFF", lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(filename.endsWith(".csv") ? filename : `${filename}.csv`, blob);
}
