import { getDb, FieldValue } from './services/firebase.js';
import { showToast, openConfirmModal } from './ui.js';

function db() {
    return (getDb && getDb()) || (window.firebaseServices && window.firebaseServices.db) || null;
}

export async function resolveOrCreateUserByEmail(email, _role) {
    const database = db();
    if (!database) throw new Error('DB not available');
    const usersRef = database.collection('users');
    const normalizedEmail = String(email || '')
        .trim()
        .toLowerCase();
    const q = await usersRef.where('email', '==', normalizedEmail).get();
    if (q && q.docs && q.docs.length > 0) return q.docs[0].id;
    return null;
}

export async function sendInvite(projectId, email, role) {
    const database = db();
    if (!database) throw new Error('DB not available');
    const invite = {
        projectId,
        email: String(email || '')
            .trim()
            .toLowerCase(),
        role: role || 'collaborator',
        invitedBy:
            (window.appState && window.appState.currentUser && window.appState.currentUser.uid) ||
            null,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
    };
    const docRef = await database.collection('invites').add(invite);
    try {
        const fb = window.firebase && window.firebase.auth ? window.firebase : null;
        const actionCodeSettings = {
            url:
                (window.location.origin || window.location.protocol + '//' + window.location.host) +
                '/?invited=true',
            handleCodeInApp: true,
        };
        if (fb && fb.auth) {
            await fb.auth().sendSignInLinkToEmail(email, actionCodeSettings);
            localStorage.setItem('lastInviteEmail', email);
        }
    } catch (e) {
        console.error('Failed to send sign-in link:', e);
    }
    return docRef.id;
}

export async function removeMemberFromProject(projectId, uid) {
    const database = db();
    if (!database) throw new Error('DB not available');
    const projRef = database.collection('projects').doc(projectId);
    const doc = await projRef.get();
    if (!doc.exists) return;
    const data = doc.data();
    const team = (data.team || []).filter((t) => t.uid !== uid);
    const teamMembers = (data.teamMembers || []).filter((x) => x !== uid);
    await projRef.update({ team, teamMembers, updatedAt: FieldValue.serverTimestamp() });
}

export async function updateMemberRole(projectId, uid, role) {
    const database = db();
    if (!database) throw new Error('DB not available');
    const projRef = database.collection('projects').doc(projectId);
    const doc = await projRef.get();
    if (!doc.exists) return;
    const data = doc.data();
    const team = (data.team || []).map((t) => (t.uid === uid ? Object.assign({}, t, { role }) : t));
    await projRef.update({ team, updatedAt: FieldValue.serverTimestamp() });
}

// Expose for legacy usage
if (typeof window !== 'undefined') {
    window._modules = window._modules || {};
    window._modules.team = window._modules.team || {};
    Object.assign(window._modules.team, {
        resolveOrCreateUserByEmail,
        sendInvite,
        removeMemberFromProject,
        updateMemberRole,
    });
}

export default {
    resolveOrCreateUserByEmail,
    sendInvite,
    removeMemberFromProject,
    updateMemberRole,
};
