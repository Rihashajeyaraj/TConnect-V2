/**
 * Export utilities for TConnect application
 * Supports CSV, Excel (.xls), and PDF export options
 */

// ── 1. CSV Export ────────────────────────────────────────────────────────────
export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) {
    alert('No data available to export.')
    return
  }

  const separator = ','
  const keys = Object.keys(rows[0])
  const csvHeader = keys.map((key) => `"${key.replace(/_/g, ' ').toUpperCase()}"`).join(separator)

  const csvRows = rows.map((row) => {
    return keys
      .map((k) => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k]
        cell = cell instanceof Date ? cell.toLocaleString() : cell.toString()
        cell = cell.replace(/"/g, '""')
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`
        }
        return cell
      })
      .join(separator)
  })

  const csvContent = [csvHeader, ...csvRows].join('\n')
  downloadFile(filename.endsWith('.csv') ? filename : `${filename}.csv`, csvContent, 'text/csv;charset=utf-8;')
}

// ── 2. Excel (.xls) Export ───────────────────────────────────────────────────
export function exportToExcel(filename, rows) {
  if (!rows || !rows.length) {
    alert('No data available to export.')
    return
  }

  const keys = Object.keys(rows[0])
  
  let tableHTML = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>TConnect Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    <style>
      th { background-color: #0d9488; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #cccccc; }
      td { padding: 6px; border: 1px solid #e5e7eb; }
    </style>
  </head>
  <body>
    <table>
      <thead>
        <tr>${keys.map((k) => `<th>${k.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) =>
              `<tr>${keys
                .map((k) => `<td>${r[k] === null || r[k] === undefined ? '' : r[k]}</td>`)
                .join('')}</tr>`
          )
          .join('')}
      </tbody>
    </table>
  </body>
  </html>`

  downloadFile(filename.endsWith('.xls') ? filename : `${filename}.xls`, tableHTML, 'application/vnd.ms-excel;charset=utf-8;')
}

// ── 3. PDF / Printable Export ────────────────────────────────────────────────
export function exportToPDF(filename, title, rows) {
  if (!rows || !rows.length) {
    alert('No data available to export.')
    return
  }

  const keys = Object.keys(rows[0])
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups to export PDF report.')
    return
  }

  const htmlContent = `<!DOCTYPE html>
  <html>
  <head>
    <title>${title || 'TConnect Performance Report'}</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #1e293b; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px; }
      .brand { font-size: 24px; font-weight: 800; color: #0d9488; }
      .subtitle { font-size: 12px; color: #64748b; font-weight: 600; }
      .title { font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #0f172a; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
      th { background-color: #0f766e; color: white; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
      td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 500; }
      tr:nth-child(even) { background-color: #f8fafc; }
      .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="brand">TConnect CRM</div>
        <div class="subtitle">Sales Executive Performance & Analytics Report</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; font-weight: bold;">Date: ${dateStr}</div>
        <div style="font-size: 11px; color: #64748b;">Status: Official Export</div>
      </div>
    </div>

    <div class="title">${title || 'Executive Performance Summary'}</div>

    <table>
      <thead>
        <tr>${keys.map((k) => `<th>${k.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) =>
              `<tr>${keys
                .map((k) => `<td>${r[k] === null || r[k] === undefined ? '' : r[k]}</td>`)
                .join('')}</tr>`
          )
          .join('')}
      </tbody>
    </table>

    <div class="footer">
      Generated automatically by TConnect CRM System • Confidential Corporate Document
    </div>

    <script>
      window.onload = function() {
        window.print();
      };
    </script>
  </body>
  </html>`

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

// Helper function to trigger browser download
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const link = document.createElement('a')
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// ── 4. Formatted Today Date Helper ─────────────────────────────────────────
export function getFormattedTodayDate() {
  const d = new Date()
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

