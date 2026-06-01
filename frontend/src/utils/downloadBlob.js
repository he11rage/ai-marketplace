/**
 * Parse filename from Content-Disposition (RFC 5987 filename* preferred).
 */
export function parseContentDispositionFilename(header) {
  if (!header || typeof header !== 'string') return null;

  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      return null;
    }
  }

  const plain = /filename="([^"]+)"/i.exec(header);
  if (plain?.[1]) return plain[1];

  return null;
}

export function formatAuditExportFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const d = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  const t = `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  return `Экспорт журнала аудита от ${d} ${t}.txt`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
