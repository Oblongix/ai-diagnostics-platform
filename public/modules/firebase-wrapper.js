// Lightweight wrapper to expose existing `window.firebaseServices` as an ES module
export function getServices() {
    if (typeof window === 'undefined') return { auth: null, db: null, firebase: null };
    return window.firebaseServices || { auth: null, db: null, firebase: null };
}

export function auth() { return getServices().auth; }
export function db() { return getServices().db; }
export function firebase() { return getServices().firebase; }

// Attach to window for compatibility with legacy scripts while also allowing imports
if (typeof window !== 'undefined') {
    window._modules = window._modules || {};
    window._modules.firebase = { getServices, auth, db, firebase };
}
