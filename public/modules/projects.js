import { getDb, FieldValue } from './services/firebase.js';
import { showToast, openConfirmModal } from './ui.js';

function db() {
    return (getDb && getDb()) || (window.firebaseServices && window.firebaseServices.db) || null;
}

export async function loadProjects(userId) {
    const database = db();
    if (!database) return [];
    try {
        const snapshot = await database
            .collection('projects')
            .where('teamMembers', 'array-contains', userId)
            .orderBy('updatedAt', 'desc')
            .get();
        return snapshot.docs.map((d) => ({ id: d.id, ...(d.data ? d.data() : {}) }));
    } catch (err) {
        // fallback: try without orderBy and sort client-side
        try {
            const snap = await database
                .collection('projects')
                .where('teamMembers', 'array-contains', userId)
                .get();
            const projects = snap.docs.map((d) => ({ id: d.id, ...(d.data ? d.data() : {}) }));
            projects.sort((a, b) => {
                const at =
                    a.updatedAt && a.updatedAt.toDate
                        ? a.updatedAt.toDate()
                        : new Date(a.updatedAt || 0);
                const bt =
                    b.updatedAt && b.updatedAt.toDate
                        ? b.updatedAt.toDate()
                        : new Date(b.updatedAt || 0);
                return bt - at;
            });
            return projects;
        } catch (e) {
            console.warn('loadProjects fallback failed', e);
            return [];
        }
    }
}

export async function createProject(projectData, teamEmails = []) {
    const database = db();
    if (!database) throw new Error('DB not available');
    const currentUid =
        (window.appState && window.appState.currentUser && window.appState.currentUser.uid) || null;

    const data = Object.assign({}, projectData, {
        teamMembers:
            Array.isArray(projectData.teamMembers) && projectData.teamMembers.length
                ? projectData.teamMembers
                : currentUid
                  ? [currentUid]
                  : [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    const doc = await database.collection('projects').add(data);

    for (const email of teamEmails || []) {
        const normalizedEmail = String(email || '')
            .trim()
            .toLowerCase();
        if (!normalizedEmail || !currentUid) continue;
        try {
            await database.collection('invites').add({
                projectId: doc.id,
                email: normalizedEmail,
                role: 'collaborator',
                invitedBy: currentUid,
                status: 'pending',
                createdAt: FieldValue.serverTimestamp(),
            });
        } catch (e) {
            console.warn('invite creation failed', e);
        }
    }
    showToast('Project created');
    return doc.id;
}

export async function addSuiteToProject(projectId, suiteKey) {
    const database = db();
    if (!database) throw new Error('DB not available');
    const projRef = database.collection('projects').doc(projectId);
    const updateObj = {
        suites: FieldValue.arrayUnion(suiteKey),
        updatedAt: FieldValue.serverTimestamp(),
    };
    updateObj[`assessments.${suiteKey}`] = {
        modules: {},
        overallScore: null,
        status: 'not_started',
    };
    await projRef.update(updateObj);
}

export async function updateProject(projectId, updates) {
    const database = db();
    if (!database) throw new Error('DB not available');
    if (!projectId) throw new Error('projectId is required');

    const sanitized = {
        clientName: (updates && updates.clientName) || '',
        industry: (updates && updates.industry) || '',
        companySize: (updates && updates.companySize) || '',
        revenue: (updates && updates.revenue) || '',
        description: (updates && updates.description) || '',
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (!sanitized.clientName.trim()) throw new Error('clientName is required');

    await database.collection('projects').doc(projectId).set(sanitized, { merge: true });
    showToast('Engagement updated');
}

export async function softDeleteProject(projectId, performedByUid = null) {
    const database = db();
    if (!database) throw new Error('DB not available');
    return new Promise((resolve, reject) => {
        openConfirmModal({
            title: 'Delete engagement',
            message:
                'This will mark the engagement as deleted for all members. This is reversible by an admin.',
            confirmText: 'Delete engagement',
            confirmClass: 'btn-danger',
            onConfirm: async () => {
                try {
                    const projRef = database.collection('projects').doc(projectId);
                    const snap = await projRef.get();
                    if (!snap.exists) {
                        showToast('Project not found');
                        resolve();
                        return;
                    }
                    const data = snap.data();
                    const now = new Date().toISOString();
                    await projRef.set(
                        { deleted: true, deletedAt: now, updatedAt: FieldValue.serverTimestamp() },
                        { merge: true }
                    );
                    try {
                        await database
                            .collection('invites')
                            .where('projectId', '==', projectId)
                            .get()
                            .then((s) => Promise.all((s.docs || []).map((d) => d.ref.delete())));
                    } catch (e) {
                        /*ignore*/
                    }
                    try {
                        await database.collection('auditLogs').add({
                            action: 'deleteProject',
                            projectId,
                            performedBy: performedByUid,
                            performedAt: now,
                            projectTitle: data && data.clientName,
                        });
                    } catch (e) {
                        console.warn('audit log failed', e);
                    }
                    showToast('Engagement marked deleted');
                    resolve();
                } catch (err) {
                    console.error('softDeleteProject', err);
                    showToast('Delete failed', true);
                    reject(err);
                }
            },
        });
    });
}

// expose for compatibility
if (typeof window !== 'undefined') {
    window._modules = window._modules || {};
    window._modules.projects = window._modules.projects || {};
    Object.assign(window._modules.projects, {
        loadProjects,
        createProject,
        addSuiteToProject,
        updateProject,
        softDeleteProject,
    });
}

export default { loadProjects, createProject, addSuiteToProject, updateProject, softDeleteProject };
