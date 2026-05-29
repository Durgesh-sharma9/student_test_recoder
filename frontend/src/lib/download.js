import api from '@/lib/api';

function filenameFromDisposition(header) {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export async function downloadFile(path, fallbackName = 'download') {
  const res = await api.get(path, { responseType: 'blob' });
  const name = filenameFromDisposition(res.headers['content-disposition']) || fallbackName;
  const blob = new Blob([res.data], {
    type: res.headers['content-type'] || 'application/octet-stream',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildDownloadQuery(filters, view, format) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== '' && val != null) params.set(key, val);
  });
  params.set('view', view);
  params.set('format', format);
  if (view === 'daily') {
    params.set('category', 'daily');
    if (params.get('dateFrom') || params.get('dateTo')) {
      params.delete('testDate');
    }
  } else if (view === 'main') {
    params.set('category', 'main');
  }
  return params.toString();
}
