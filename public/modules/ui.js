// modules/ui.js
export function showToast(message, isError) {
    try {
        let toast = document.getElementById('appToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'appToast';
            toast.style.position = 'fixed';
            toast.style.right = '20px';
            toast.style.bottom = '20px';
            toast.style.zIndex = 9999;
            document.body.appendChild(toast);
        }
        const el = document.createElement('div');
        el.textContent = message;
        el.style.background = isError ? 'rgba(220,38,38,0.95)' : 'rgba(16,185,129,0.95)';
        el.style.color = 'white';
        el.style.padding = '10px 14px';
        el.style.borderRadius = '8px';
        el.style.marginTop = '8px';
        el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
        toast.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; try { el.remove(); } catch(e){} }, 4500);
    } catch (e) { console.warn('showToast failed', e); }
}

export function openConfirmModal(opts) {
    const modal = document.getElementById('confirmModal');
    if (!modal) {
        if (opts && opts.onConfirm) opts.onConfirm();
        return;
    }
    const titleEl = document.getElementById('confirmTitle');
    const bodyEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');
    const closeBtn = document.getElementById('confirmClose');

    titleEl.textContent = opts.title || 'Confirm';
    bodyEl.textContent = opts.message || 'Are you sure?';
    okBtn.textContent = opts.confirmText || 'OK';

    // apply optional classes
    if (opts.confirmClass) {
        okBtn.className = opts.confirmClass;
    } else {
        okBtn.className = 'btn-danger';
    }

    modal.style.display = 'block';

    const cleanup = () => {
        modal.style.display = 'none';
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        closeBtn.removeEventListener('click', onCancel);
    };

    const onOk = async (e) => {
        e.preventDefault();
        cleanup();
        if (opts.onConfirm) await opts.onConfirm();
    };
    const onCancel = (e) => { e && e.preventDefault(); cleanup(); if (opts.onCancel) opts.onCancel(); };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
}

// expose for legacy code
if (typeof window !== 'undefined') {
    window._modules = window._modules || {};
    window._modules.ui = { showToast, openConfirmModal };
}
