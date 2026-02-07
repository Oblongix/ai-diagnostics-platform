// ui-newproject.js - new project modal handling
(function () {
    const escapeHtml =
        window.safeHtml && window.safeHtml.escapeHtml
            ? window.safeHtml.escapeHtml
            : (s) => String(s == null ? '' : s);

    function openNewProjectModal() {
        document.getElementById('newProjectModal')?.classList.add('active');
    }
    function closeNewProjectModal() {
        document.getElementById('newProjectModal')?.classList.remove('active');
    }

    async function initNewProjectUI() {
        // Legacy app.js owns this modal flow; skip duplicate bindings if already wired.
        if (window.__legacyProjectFormBound) return;

        document.getElementById('newProjectBtn')?.addEventListener('click', openNewProjectModal);
        document.getElementById('newProjectBtn2')?.addEventListener('click', openNewProjectModal);
        document.getElementById('closeModal')?.addEventListener('click', closeNewProjectModal);
        document.getElementById('cancelModal')?.addEventListener('click', closeNewProjectModal);

        document.getElementById('createProjectBtn')?.addEventListener('click', async () => {
            const clientName = document.getElementById('clientName').value;
            const industry = document.getElementById('clientIndustry').value;
            const companySize = document.getElementById('companySize').value;
            const revenue = document.getElementById('annualRevenue').value;
            const description = document.getElementById('projectDescription').value;
            const selectedSuites = Array.from(
                document.querySelectorAll('input[name="suite"]:checked')
            ).map((cb) => cb.value);
            if (!clientName || selectedSuites.length === 0) {
                alert('Please enter a client name and select at least one diagnostic suite');
                return;
            }

            try {
                const services =
                    window.firebaseServices ||
                    (window.firebase ? { db: window.firebase.firestore() } : null);
                const db = services && services.db;
                const projectData = {
                    clientName,
                    industry,
                    companySize,
                    revenue,
                    description,
                    suites: selectedSuites,
                    status: 'active',
                    progress: 0,
                    createdAt: db && db.FieldValue ? db.FieldValue.serverTimestamp() : new Date(),
                    updatedAt: db && db.FieldValue ? db.FieldValue.serverTimestamp() : new Date(),
                    createdBy:
                        (window.appState &&
                            window.appState.currentUser &&
                            window.appState.currentUser.uid) ||
                        null,
                    teamMembers: [],
                    hoursLogged: 0,
                    assessments: {},
                };
                selectedSuites.forEach((suite) => {
                    projectData.assessments[suite] = {
                        modules: {},
                        overallScore: null,
                        status: 'not_started',
                    };
                });

                // Resolve team members via existing helper if available
                const teamMemberItems = Array.from(
                    document.querySelectorAll('#teamMembersList .team-member-item[data-email]')
                ).map((el) => ({
                    email: el.dataset.email,
                    role: el.dataset.role || 'collaborator',
                }));
                const teamUids = [
                    (window.appState &&
                        window.appState.currentUser &&
                        window.appState.currentUser.uid) ||
                        null,
                ].filter(Boolean);
                for (const m of teamMemberItems) {
                    try {
                        if (
                            window._modules &&
                            window._modules.team &&
                            typeof window._modules.team.resolveOrCreateUserByEmail === 'function'
                        ) {
                            const uid = await window._modules.team.resolveOrCreateUserByEmail(
                                m.email,
                                m.role
                            );
                            if (uid && !teamUids.includes(uid)) teamUids.push(uid);
                        }
                    } catch (e) {
                        console.warn('Could not resolve team member', m.email, e);
                    }
                }
                projectData.teamMembers = teamUids;

                if (
                    window._modules &&
                    window._modules.projects &&
                    typeof window._modules.projects.createProject === 'function'
                ) {
                    const id = await window._modules.projects.createProject(projectData);
                    closeNewProjectModal();
                    if (
                        window._modules.projectsUI &&
                        typeof window._modules.projectsUI.renderProjects === 'function'
                    )
                        window._modules.projectsUI.renderProjects();
                    return id;
                }

                if (!db) throw new Error('DB not available');
                const docRef = await db.collection('projects').add(projectData);
                for (const uid of teamUids) {
                    try {
                        await db
                            .collection('users')
                            .doc(uid)
                            .set(
                                {
                                    projects:
                                        db && db.FieldValue
                                            ? db.FieldValue.arrayUnion(docRef.id)
                                            : [docRef.id],
                                },
                                { merge: true }
                            );
                    } catch (e) {}
                }
                closeNewProjectModal();
                if (window.loadProjects)
                    await window.loadProjects(
                        (window.appState &&
                            window.appState.currentUser &&
                            window.appState.currentUser.uid) ||
                            null
                    );
            } catch (e) {
                console.error('Error creating project (module):', e);
                alert('Error creating project. See console.');
            }
        });

        document.getElementById('addTeamMemberBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            const email = prompt('Enter team member email');
            if (!email) return;
            addTeamMemberToList(email, 'collaborator');
        });
    }

    function addTeamMemberToList(email, role) {
        const list = document.getElementById('teamMembersList');
        if (!list) return;
        const item = document.createElement('div');
        item.className = 'team-member-item';
        item.dataset.email = email;
        item.dataset.role = role || 'collaborator';
        const initials = (email || '').split('@')[0].slice(0, 2).toUpperCase();
        item.innerHTML = `\n            <div class="avatar">${escapeHtml(initials)}</div>\n            <div class="member-info">\n                <div class="member-name">${escapeHtml(email)}</div>\n                <div class="member-role">${escapeHtml(role || 'Collaborator')}</div>\n            </div>\n            <button type="button" class="btn-link remove-team-member" aria-label="Remove member">&times;</button>\n        `;
        list.appendChild(item);
        item.querySelector('.remove-team-member')?.addEventListener('click', () => item.remove());
    }

    if (typeof window !== 'undefined') {
        window._modules = window._modules || {};
        window._modules.newProjectUI = {
            openNewProjectModal,
            closeNewProjectModal,
            initNewProjectUI,
            addTeamMemberToList,
        };
    }
})();
