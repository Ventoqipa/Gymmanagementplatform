/** Exportación compatible con Excel: columnas separadas vía HTML (.xls). */

export type ExcelSection = {
  title?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
};

function escapeHtml(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildWorkbookHtml(sections: ExcelSection[]): string {
  const styles = `
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; }
    table { border-collapse: collapse; margin-bottom: 18px; }
    th {
      background: #e31e24;
      color: #ffffff;
      font-weight: bold;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #b8181d;
    }
    td {
      padding: 6px 10px;
      border: 1px solid #d4d4d4;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f7f7f7; }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #333333;
      margin: 12px 0 6px;
    }
  `;

  const tables = sections
    .map((section) => {
      const title = section.title
        ? `<p class="section-title">${escapeHtml(section.title)}</p>`
        : "";
      const headerRow = section.headers
        .map((header) => `<th>${escapeHtml(header)}</th>`)
        .join("");
      const bodyRows = section.rows
        .map((row) => {
          const cells = row
            .map((cell) => `<td>${escapeHtml(cell)}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `${title}<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
  <x:Name>Reporte</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>${styles}</style>
</head>
<body>${tables}</body>
</html>`;
}

export function downloadExcelReport(
  filename: string,
  sections: ExcelSection[],
): void {
  const html = buildWorkbookHtml(sections);
  const blob = new Blob(["\uFEFF", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const name = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  downloadBlob(name, blob);
}

/** @deprecated Usar downloadExcelReport para columnas correctas en Excel. */
export function downloadExcelCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  downloadExcelReport(filename, [{ headers, rows }]);
}
