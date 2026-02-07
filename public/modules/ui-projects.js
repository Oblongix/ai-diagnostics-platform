// ui-projects.js - rendering for projects and project detail (migration from legacy app.js)
(function () {
    const escapeHtml =
        window.safeHtml && window.safeHtml.escapeHtml
            ? window.safeHtml.escapeHtml
            : (s) => String(s == null ? '' : s);

    function formatDate(timestamp) {
        if (!timestamp) return 'Recently';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return date.toLocaleDateString();
    }

    async function renderProjects() {
        const container = document.getElementById('projectsList');
        if (!container) return;
        const projects = (window.appState && window.appState.projects) || [];
        if (projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No engagements found</h3>
                    <p>Create your first diagnostic engagement to get started</p>
                    <button class="btn-primary" data-action="open-new-project">Create Engagement</button>
                </div>
            `;
            return;
        }
        container.innerHTML = `
            <ul class="projects-list-compact" style="list-style:none;padding:0;margin:0;">
                ${projects.map((p) => createProjectListItem(p)).join('')}
            </ul>
        `;
    }

    function createProjectListItem(project) {
        const safeClient = escapeHtml(project.clientName || project.id);
        const safeProgress = escapeHtml(project.progress || 0);
        const updated = formatDate(project.updatedAt);
        return `
            <li class="project-list-item" data-id="${escapeHtml(project.id)}" style="padding:12px 8px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;">
                <div style="flex:1;cursor:pointer;" data-action="open-project" data-id="${escapeHtml(project.id)}">
                    <div style="font-weight:700">${safeClient}</div>
                    <div style="font-size:12px;color:#666">${project.industry ? escapeHtml(project.industry) + ' • ' : ''}Updated: ${escapeHtml(updated)}</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;margin-left:12px">
                    <div style="font-size:12px;color:#444">${safeProgress}%</div>
                    <button class="btn-secondary" data-action="edit-project" data-id="${escapeHtml(project.id)}">Edit</button>
                    <button class="btn-secondary" data-action="open-team" data-id="${escapeHtml(project.id)}">Team</button>
                    <button class="btn-danger" data-action="delete-project" data-id="${escapeHtml(project.id)}">Delete</button>
                </div>
            </li>
        `;
    }

    function renderProjectDetail(project) {
        const container = document.getElementById('diagnosticView');
        if (!container) return;
        const safeClient = escapeHtml(project.clientName || project.id);
        const safeDesc = escapeHtml(project.description || '');
        const currentSuites = Array.isArray(project.suites)
            ? project.suites
            : project.suites
              ? [project.suites]
              : [];
        const allSuites = window.diagnosticData ? Object.keys(window.diagnosticData) : [];
        const availSuites = allSuites.filter((s) => !currentSuites.includes(s));
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1>${safeClient}</h1>
                    <p class="page-subtitle">${safeDesc}</p>
                </div>
                <div>
                    <button class="btn-secondary" id="editProjectBtn">Edit Engagement</button>
                    <button class="btn-secondary" id="addDiagnosticBtn">Add Diagnostic</button>
                    <button class="btn-secondary" id="deleteProjectBtn" style="margin-left:8px;background:#fff;border:1px solid var(--error);color:var(--error);">Delete Engagement</button>
                </div>
            </div>
            <div class="section">
                <h3>Active Diagnostics</h3>
                <div id="projectSuites" style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${currentSuites
                        .map(
                            (s) =>
                                `<span class="suite-badge" style="background:${(window.diagnosticData && window.diagnosticData[s] && window.diagnosticData[s].color) || '#ddd'};padding:8px 12px;border-radius:12px;color:white;">${escapeHtml((window.diagnosticData && window.diagnosticData[s] && window.diagnosticData[s].name) || s)}</span>`
                        )
                        .join('')}
                </div>
                <div id="availableSuites" style="margin-top:12px; display:none;">
                    <h4>Add a Diagnostic Suite</h4>
                    ${
                        availSuites.length === 0
                            ? '<div>All suites already added</div>'
                            : availSuites
                                  .map((s) => {
                                      const meta =
                                          window.diagnosticData && window.diagnosticData[s];
                                      return `<div style="margin-bottom:8px;"><button class="btn-primary add-suite-btn" data-suite="${escapeHtml(s)}">Add ${escapeHtml(meta ? meta.name : s)}</button></div>`;
                                  })
                                  .join('')
                    }
                </div>
            </div>
        `;

        document.getElementById('addDiagnosticBtn')?.addEventListener('click', () => {
            const avail = document.getElementById('availableSuites');
            if (avail) avail.style.display = avail.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('editProjectBtn')?.addEventListener('click', () => {
            if (window.openEditProjectModal) window.openEditProjectModal(project.id);
        });

        document.getElementById('deleteProjectBtn')?.addEventListener('click', async () => {
            try {
                if (typeof window.deleteProject === 'function') {
                    await window.deleteProject(project.id);
                } else if (window.softDeleteProject) {
                    await window.softDeleteProject(project.id);
                }
                window.appState = window.appState || {};
                window.appState.projects = (window.appState.projects || []).filter(
                    (p) => p.id !== project.id
                );
                if (window.loadProjects) {
                    window
                        .loadProjects(
                            (window.appState.currentUser && window.appState.currentUser.uid) || null
                        )
                        .catch(() => {});
                }
                if (window.updateDashboard) window.updateDashboard();
                if (window.switchView) window.switchView('projects');
            } catch (e) {
                console.error('Failed to delete project (module)', e);
            }
        });

        document.querySelectorAll('.add-suite-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const suiteKey = btn.dataset.suite;
                try {
                    if (
                        window._modules &&
                        window._modules.projects &&
                        typeof window._modules.projects.addSuiteToProject === 'function'
                    ) {
                        await window._modules.projects.addSuiteToProject(project.id, suiteKey);
                    } else if (window.addSuiteToProject) {
                        await window.addSuiteToProject(project.id, suiteKey);
                    }
                    const updated = window.refreshProject
                        ? await window.refreshProject(project.id)
                        : null;
                    if (updated && window.renderProjectDetail) window.renderProjectDetail(updated);
                } catch (e) {
                    console.error('Failed to add suite (module)', e);
                }
            });
        });

        const modulesContainer = document.createElement('div');
        modulesContainer.className = 'section';
        const modulesHtml = (currentSuites || [])
            .map((s) => {
                const meta = window.diagnosticData && window.diagnosticData[s];
                const title = meta ? meta.name : s;
                return `<div style="margin-top:12px;"><h4>${escapeHtml(title)}</h4><div>${
                    meta && meta.modules
                        ? Object.keys(meta.modules)
                              .map(
                                  (mk) =>
                                      `<div class="module-card">${escapeHtml(meta.modules[mk].name)}</div>`
                              )
                              .join('')
                        : ''
                }</div></div>`;
            })
            .join('');
        modulesContainer.innerHTML = `<h3>Modules</h3>${modulesHtml}`;
        container.appendChild(modulesContainer);
    }

    async function deleteProject(projectId) {
        if (
            window._modules &&
            window._modules.projects &&
            typeof window._modules.projects.softDeleteProject === 'function'
        ) {
            return window._modules.projects.softDeleteProject(
                projectId,
                (window.appState &&
                    window.appState.currentUser &&
                    window.appState.currentUser.uid) ||
                    null
            );
        }
        if (window.softDeleteProject) return window.softDeleteProject(projectId);
        return Promise.resolve();
    }

    function openTeamModal(projectId) {
        if (
            window._modules &&
            window._modules.teamUI &&
            typeof window._modules.teamUI.renderTeamView === 'function'
        ) {
            window._modules.teamUI.openTeamModal(projectId);
            return;
        }
        if (window.openTeamModal) {
            window.openTeamModal(projectId);
        }
    }

    if (typeof window !== 'undefined') {
        window._modules = window._modules || {};
        window._modules.projectsUI = {
            renderProjects,
            renderProjectDetail,
            deleteProject,
            openTeamModal,
        };
    }
})();
