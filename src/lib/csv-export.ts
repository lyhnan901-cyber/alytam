/**
 * CSV Export utility with Unicode BOM support for Arabic
 */

export function exportToCSV(
  data: Record<string, any>[],
  filename: string,
  headers: { key: string; label: string }[]
) {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Create header row
  const headerRow = headers.map((h) => `"${h.label}"`).join(",");

  // Create data rows
  const dataRows = data.map((row) =>
    headers
      .map((h) => {
        const value = row[h.key];
        if (value === null || value === undefined) return '""';
        // Escape quotes and wrap in quotes
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(",")
  );

  // Combine with BOM for Excel Arabic support
  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\n");

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} دقيقة`;
  if (mins === 0) return `${hours} ساعة`;
  return `${hours} ساعة ${mins} دقيقة`;
}
