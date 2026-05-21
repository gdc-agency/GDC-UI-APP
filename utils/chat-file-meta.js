/** @param {string} [fileName] */
export function getChatFileMeta(fileName = '') {
  const ext = (fileName.split('.').pop() || 'FILE').toUpperCase();
  const badgeByExt = {
    PDF: { color: '#e74c3c', label: 'PDF' },
    DOC: { color: '#2b579a', label: 'DOC' },
    DOCX: { color: '#2b579a', label: 'DOC' },
    XLS: { color: '#1d7a46', label: 'XLS' },
    XLSX: { color: '#1d7a46', label: 'XLS' },
    PPT: { color: '#d24726', label: 'PPT' },
    PPTX: { color: '#d24726', label: 'PPT' },
    JPG: { color: '#0ea5e9', label: 'JPG' },
    JPEG: { color: '#0ea5e9', label: 'JPG' },
    PNG: { color: '#0ea5e9', label: 'PNG' },
    ZIP: { color: '#f59e0b', label: 'ZIP' },
    RAR: { color: '#f59e0b', label: 'RAR' },
    MP3: { color: '#8b5cf6', label: 'MP3' },
    WAV: { color: '#8b5cf6', label: 'WAV' },
    MP4: { color: '#0ea5e9', label: 'MP4' },
    MOV: { color: '#0ea5e9', label: 'MOV' },
    TXT: { color: '#64748b', label: 'TXT' },
  };
  const badge = badgeByExt[ext] || { color: '#64748b', label: ext.slice(0, 4) };
  return { ext, badgeColor: badge.color, badgeLabel: badge.label };
}
