import { getAuth as _getAuth } from './services/firebase.js';

function getAuth() {
    const a =
        (_getAuth && _getAuth()) ||
        (window.firebaseServices && window.firebaseServices.auth) ||
        null;
    return a;
}

export async function signInWithEmailAndPassword(email, password) {
    const auth = getAuth();
    if (!auth) throw new Error('Auth service not available');
    return auth.signInWithEmailAndPassword(email, password);
}

export async function createUserWithEmailAndPassword(email, password) {
    const auth = getAuth();
    if (!auth) throw new Error('Auth service not available');
    return auth.createUserWithEmailAndPassword(email, password);
}

export async function signOut() {
    const auth = getAuth();
    if (!auth) throw new Error('Auth service not available');
    return auth.signOut();
}

export function onAuthStateChanged(cb) {
    const auth = getAuth();
    if (auth && typeof auth.onAuthStateChanged === 'function') return auth.onAuthStateChanged(cb);
    // fallback: if mock exposes listeners array, attempt to call immediately with currentUser
    try {
        cb((auth && auth.currentUser) || null);
    } catch (e) {
        console.warn('onAuthStateChanged fallback failed', e);
    }
}

export function getCurrentUser() {
    const auth = getAuth();
    return auth && auth.currentUser ? auth.currentUser : null;
}

// Expose for legacy compatibility
if (typeof window !== 'undefined') {
    window._modules = window._modules || {};
    window._modules.auth = window._modules.auth || {};
    Object.assign(window._modules.auth, {
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        signOut,
        onAuthStateChanged,
        getCurrentUser,
    });
}

export default {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    getCurrentUser,
};
