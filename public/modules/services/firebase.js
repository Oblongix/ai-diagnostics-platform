// services/firebase.js
// Small wrapper around the legacy `window.firebaseServices` to make imports easier
export function getServices() {
    if (typeof window === 'undefined') return { auth: null, db: null, firebase: null };
    return window.firebaseServices || { auth: null, db: null, firebase: null };
}

export function getAuth() {
    return getServices().auth;
}
export function getDb() {
    return getServices().db;
}
export function getFirebase() {
    return getServices().firebase;
}

export const FieldValue = (() => {
    const fb = getServices().firebase;
    if (fb && fb.firestore && fb.firestore.FieldValue) return fb.firestore.FieldValue;
    // fallback shim for local mock
    return {
        serverTimestamp() {
            return { __ts: new Date() };
        },
        arrayUnion(...items) {
            return { __arrayUnion: items };
        },
    };
})();

// expose on window for legacy code to consume via window._modules.services.firebase
if (typeof window !== 'undefined') {
    window._modules = window._modules || {};
    window._modules.services = window._modules.services || {};
    window._modules.services.firebase = { getServices, getAuth, getDb, getFirebase, FieldValue };
}
