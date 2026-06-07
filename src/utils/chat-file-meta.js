/** @param {string} [fileName] */
export function getChatFileMeta(fileName = '') {
  const ext = (fileName.split('.').pop() || 'FILE').toUpperCase();
  const badgeByExt = {
    PDF: { color: '#e74c3c', label: 'PDF', icon: 'file-pdf-box' },
    DOC: { color: '#2b579a', label: 'DOC', icon: 'file-word-box' },
    DOCX: { color: '#2b579a', label: 'DOC', icon: 'file-word-box' },
    XLS: { color: '#1d7a46', label: 'XLS', icon: 'file-excel-box' },
    XLSX: { color: '#1d7a46', label: 'XLS', icon: 'file-excel-box' },
    PPT: { color: '#d24726', label: 'PPT', icon: 'file-powerpoint-box' },
    PPTX: { color: '#d24726', label: 'PPT', icon: 'file-powerpoint-box' },
    JPG: { color: '#0ea5e9', label: 'JPG', icon: 'file-image' },
    JPEG: { color: '#0ea5e9', label: 'JPG', icon: 'file-image' },
    PNG: { color: '#0ea5e9', label: 'PNG', icon: 'file-image' },
    ZIP: { color: '#f59e0b', label: 'ZIP', icon: 'folder-zip' },
    RAR: { color: '#f59e0b', label: 'RAR', icon: 'folder-zip' },
    '7Z': { color: '#f59e0b', label: 'ZIP', icon: 'folder-zip' },
    MP3: { color: '#8b5cf6', label: 'MP3', icon: 'file-music' },
    WAV: { color: '#8b5cf6', label: 'WAV', icon: 'file-music' },
    MP4: { color: '#0ea5e9', label: 'MP4', icon: 'file-video' },
    MOV: { color: '#0ea5e9', label: 'MOV', icon: 'file-video' },
    WEBM: { color: '#0ea5e9', label: 'WEB', icon: 'file-video' },
    AVI: { color: '#0ea5e9', label: 'AVI', icon: 'file-video' },
    MKV: { color: '#0ea5e9', label: 'MKV', icon: 'file-video' },
    GIF: { color: '#0ea5e9', label: 'GIF', icon: 'file-image' },
    WEBP: { color: '#0ea5e9', label: 'WEB', icon: 'file-image' },
    TXT: { color: '#64748b', label: 'TXT', icon: 'file-document-outline' },
  };
  const badge = badgeByExt[ext] || { color: '#64748b', label: ext.slice(0, 4), icon: 'file-outline' };
  return { ext, badgeColor: badge.color, badgeLabel: badge.label, icon: badge.icon };
}
