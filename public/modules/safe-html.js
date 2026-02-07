export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str).replace(/[&<>"']/g, (m) => map[m]);
}

// Backwards-compat: expose on window.safeHtml if present
if (typeof window !== 'undefined') window.safeHtml = window.safeHtml || { escapeHtml };
