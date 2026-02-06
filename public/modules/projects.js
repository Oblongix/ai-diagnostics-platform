import { getDb, FieldValue } from './services/firebase.js';
import { showToast, openConfirmModal } from './ui.js';

function db() { return (getDb && getDb()) || (window.firebaseServices && window.firebaseServices.db) || null; }

export async function loadProjects(userId) {
    const database = db();
    if (!database) return [];
    try {
        const snapshot = await database.collection('projects')
            .where('teamMembers', 'array-contains', userId)
            .orderBy('updatedAt', 'desc')
            .get();
        return snapshot.docs.map(d => ({ id: d.id, ...(d.data ? d.data() : {}) }));
    } catch (err) {
        // fallback: try without orderBy and sort client-side
        try {
            const snap = await database.collection('projects').where('teamMembers', 'array-contains', userId).get();
            const projects = snap.docs.map(d => ({ id: d.id, ...(d.data ? d.data() : {}) }));
            projects.sort((a,b)=>{
                const at = a.updatedAt && a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
                const bt = b.updatedAt && b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
                return bt - at;
            });
            return projects;
        } catch (e) { console.warn('loadProjects fallback failed', e); return []; }
    }
}

export async function createProject(projectData, teamEmails=[]) {
    const database = db();
    if (!database) throw new Error('DB not available');
    // Resolve team emails to UIDs if possible (simple heuristic: if user exists in users collection)
    const teamUids = [];
    try {
        for (const email of teamEmails) {
            try {
                const q = await database.collection('users').where('email','==',email).get();
                if (q && q.docs && q.docs.length>0) teamUids.push(q.docs[0].id);
            } catch(e){/*ignore*/}
        }
    } catch(e){/*ignore*/}

    const data = Object.assign({}, projectData, { teamMembers: teamUids.length ? teamUids : (projectData.teamMembers || []), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    const doc = await database.collection('projects').add(data);
    // update users projects arrays
    try {
        for (const uid of (data.teamMembers || [])) {
            try { await database.collection('users').doc(uid).set({ projects: FieldValue.arrayUnion(doc.id) }, { merge: true }); } catch(e){}
        }
    } catch (e) { console.warn('createProject user update failed', e); }
    showToast('Project created');
    return doc.id;
}

export async function addSuiteToProject(projectId, suiteKey) {
    const database = db();
    if (!database) throw new Error('DB not available');
    const projRef = database.collection('projects').doc(projectId);
    const updateObj = { 'suites': FieldValue.arrayUnion(suiteKey), updatedAt: FieldValue.serverTimestamp() };
    updateObj[`assessments.${suiteKey}`] = { modules: {}, overallScore: null, status: 'not_started' };
    await projRef.update(updateObj);
}

export async function softDeleteProject(projectId, performedByUid=null) {
    const database = db();
    if (!database) throw new Error('DB not available');
    return new Promise((resolve, reject) => {
        openConfirmModal({
            title: 'Delete engagement',
            message: 'This will mark the engagement as deleted for all members. This is reversible by an admin.',
            confirmText: 'Delete engagement',
            confirmClass: 'btn-danger',
            onConfirm: async () => {
                try {
                    const projRef = database.collection('projects').doc(projectId);
                    const snap = await projRef.get();
                    if (!snap.exists) { showToast('Project not found'); resolve(); return; }
                    const data = snap.data();
                    const now = new Date().toISOString();
                    await projRef.set({ deleted: true, deletedAt: now, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
                    // cleanup user project refs
                    const members = Array.isArray(data.teamMembers)? data.teamMembers.slice() : [];
                    if (data.createdBy && !members.includes(data.createdBy)) members.push(data.createdBy);
                    const batch = database.batch ? database.batch() : null;
                    if (batch) {
                        for (const uid of members) {
                            const userRef = database.collection('users').doc(uid);
                            batch.update(userRef, { projects: FieldValue.arrayRemove ? FieldValue.arrayRemove(projectId) : [] });
                        }
                        try { await batch.commit(); } catch(e){ console.warn('batch commit failed', e); }
                    } else {
                        for (const uid of members) { try { await database.collection('users').doc(uid).update({ projects: FieldValue.arrayRemove ? FieldValue.arrayRemove(projectId) : [] }); } catch(e){} }
                    }
                    try { await database.collection('invites').where('projectId','==',projectId).get().then(s=>Promise.all((s.docs||[]).map(d=>d.ref.delete()))); } catch(e){/*ignore*/}
                    try { await database.collection('auditLogs').add({ action: 'deleteProject', projectId, performedBy: performedByUid, performedAt: now, projectTitle: data && data.clientName }); } catch(e){console.warn('audit log failed', e);}
                    showToast('Engagement marked deleted');
                    resolve();
                } catch (err) { console.error('softDeleteProject', err); showToast('Delete failed', true); reject(err); }
            }
        });
    });
}

// expose for compatibility
if (typeof window !== 'undefined') {
    window._modules = window._modules || {};
    window._modules.projects = window._modules.projects || {};
    Object.assign(window._modules.projects, { loadProjects, createProject, addSuiteToProject, softDeleteProject });
}

export default { loadProjects, createProject, addSuiteToProject, softDeleteProject };
