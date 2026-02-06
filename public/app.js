// Main Application Logic
const { auth, db } = window.firebaseServices;
const escapeHtml = (window.safeHtml && window.safeHtml.escapeHtml) ? window.safeHtml.escapeHtml : (s => String(s === undefined || s === null ? '' : s));

// State Management
const appState = {
    currentUser: null,
    currentView: 'dashboard',
    currentProject: null,
    projects: [],
    teamMembers: []
};

// ============================================
// AUTHENTICATION
// ============================================

// Prevent default form GET submissions immediately to avoid credentials leaking in the URL
try{
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', (e) => { e.preventDefault(); document.getElementById('loginBtn')?.click(); });
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', (e) => { e.preventDefault(); document.getElementById('registerBtn')?.click(); });
}catch(e){ console.warn('Could not attach immediate form interceptors', e); }

// Auth State Observer
auth.onAuthStateChanged(user => {
    if (user) {
        appState.currentUser = user;
        loadUserData(user);
        showMainApp();
    } else {
        showLoginScreen();
    }
});

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
        document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    });
});

// Login
document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        showError(error.message);
    }
});

// Register
document.getElementById('registerBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const name = document.getElementById('registerName').value;
    const company = document.getElementById('registerCompany').value;
    const role = document.getElementById('registerRole').value;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Create user profile in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name,
            email,
            company,
            role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            projects: []
        });
        
        await userCredential.user.updateProfile({ displayName: name });
    } catch (error) {
        showError(error.message);
    }
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await auth.signOut();
});

// User Menu Toggle
document.getElementById('userMenuBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('userDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', () => {
    document.getElementById('userDropdown').style.display = 'none';
});

function showError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 5000);
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'grid';
    initializeApp();
}

// ============================================
// DATA LOADING
// ============================================

async function loadUserData(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        // Update UI with user info
        document.getElementById('userName').textContent = userData?.name || user.email;
        document.getElementById('userAvatar').textContent = getInitials(userData?.name || user.email);
        document.getElementById('currentUserName').textContent = userData?.name || user.email;
        
        // Load projects
        await loadProjects(user.uid);
        updateDashboard();
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function loadProjects(userId) {
    try {
        const snapshot = await db.collection('projects')
            .where('teamMembers', 'array-contains', userId)
            .orderBy('updatedAt', 'desc')
            .get();
        
        appState.projects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderProjects();
    } catch (error) {
        console.error('Error loading projects:', error);

        // Fallback when a composite index is not yet available: query without orderBy
        // and sort client-side. This avoids blocking users while the index is built.
        try {
            if (error && error.message && /requires an index|index/i.test(error.message)) {
                console.warn('Index missing for projects query; falling back to client-side sort');
                const snap = await db.collection('projects')
                    .where('teamMembers', 'array-contains', userId)
                    .get();

                const projects = snap.docs.map(doc => ({ id: doc.id, ...(doc.data ? doc.data() : {}) }));

                projects.sort((a, b) => {
                    const at = a.updatedAt && a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
                    const bt = b.updatedAt && b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
                    return bt - at;
                });

                appState.projects = projects;
                renderProjects();
                return;
            }
        } catch (fallbackErr) {
            console.error('Fallback loadProjects failed:', fallbackErr);
        }
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ============================================
// NAVIGATION
// ============================================

function initializeApp() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-link[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            switchView(view);
        });
    });
    
    // Suite links
    document.querySelectorAll('.sidebar-link[data-suite]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const suite = link.dataset.suite;
            // TODO: Open suite selector or create new project with suite
            console.log('Suite selected:', suite);
        });
    });

    // Prevent default form submission and wire to existing handlers
    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('loginBtn')?.click();
    });
    document.getElementById('registerForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('registerBtn')?.click();
    });

    // Delegated click handler for data-action attributes (safer than inline onclick)
    document.addEventListener('click', (e) => {
        const el = e.target.closest && e.target.closest('[data-action]');
        if (!el) return;

        const action = el.dataset.action;
        // allow buttons/links default unless we handle
        switch(action) {
            case 'open-project':
                e.preventDefault();
                if (el.dataset.id) openProject(el.dataset.id);
                break;
            case 'open-new-project':
                e.preventDefault();
                openNewProjectModal();
                break;
            case 'switch-view':
                e.preventDefault();
                if (el.dataset.view) switchView(el.dataset.view);
                break;
            case 'export-project':
                e.preventDefault();
                if (window.exportProject) window.exportProject(el.dataset.id);
                break;
            case 'open-team':
                e.preventDefault();
                if (window.openTeamModal) window.openTeamModal(el.dataset.id);
                break;
            case 'switch-suite':
                e.preventDefault();
                if (el.dataset.suite) switchSuite(el.dataset.suite);
                break;
            case 'open-module':
                e.preventDefault();
                if (el.dataset.module) openModule(el.dataset.suite, el.dataset.module);
                break;
            case 'close-module':
                e.preventDefault();
                closeModuleModal();
                break;
            case 'save-assessment':
                e.preventDefault();
                if (window.saveAssessment) window.saveAssessment(el.dataset.suite, el.dataset.module);
                break;
            case 'calculate-score':
                e.preventDefault();
                if (window.calculateModuleScore) window.calculateModuleScore(el.dataset.suite, el.dataset.module);
                break;
            case 'select-score':
                e.preventDefault();
                if (window.selectScore) window.selectScore(el.dataset.key, Number(el.dataset.score));
                break;
            case 'upload-document':
                e.preventDefault();
                if (window.uploadDocument) window.uploadDocument(Number(el.dataset.idx));
                break;
            case 'add-document-link':
                e.preventDefault();
                if (window.addDocumentLink) window.addDocumentLink(Number(el.dataset.idx));
                break;
            case 'add-priority':
                e.preventDefault();
                if (window.addPriorityAction) window.addPriorityAction();
                break;
            case 'save-findings':
                e.preventDefault();
                if (window.saveFindings) window.saveFindings(el.dataset.suite, el.dataset.module);
                break;
            default:
                break;
        }
    });
}

// Populate a small debug panel on localhost with mock users (only shown when a mock is present)
function populateDebugPanel(){
    try{
        const dbg = document.getElementById('debugPanel');
        const dbgUsers = document.getElementById('debugUsers');
        if (!dbg || !dbgUsers) return;
        const services = window.firebaseServices;
        if (!services || !services.db || !services.db._store) return;
        const users = services.db._store.users || {};
        const lines = Object.values(users).map(u => `${u.uid} — ${u.email} ${u.password ? '(has password)' : ''}`);
        dbgUsers.textContent = lines.join('\n');
        dbg.style.display = 'block';
    }catch(e){
        console.warn('populateDebugPanel failed', e);
    }
}

// Run debug panel population shortly after init so config.js has executed
setTimeout(populateDebugPanel, 500);

function switchView(viewName) {
    appState.currentView = viewName;
    
    // Update sidebar
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`.sidebar-link[data-view="${viewName}"]`)?.classList.add('active');
    
    // Update content
    document.querySelectorAll('.view-content').forEach(view => {
        view.style.display = 'none';
    });
    const target = document.getElementById(`${viewName}View`);
    if (target) {
        target.style.display = 'block';
    } else {
        console.warn('switchView: target view not found:', `${viewName}View`);
    }
}

// ============================================
// DASHBOARD
// ============================================

function updateDashboard() {
    const activeProjects = appState.projects.filter(p => p.status === 'active');
    const totalHours = appState.projects.reduce((sum, p) => sum + (p.hoursLogged || 0), 0);
    const avgCompletion = appState.projects.length > 0
        ? Math.round(appState.projects.reduce((sum, p) => sum + (p.progress || 0), 0) / appState.projects.length)
        : 0;
    
    document.getElementById('activeProjects').textContent = activeProjects.length;
    document.getElementById('totalHours').textContent = totalHours;
    document.getElementById('teamSize').textContent = 1; // TODO: Count unique team members
    document.getElementById('avgCompletion').textContent = `${avgCompletion}%`;
    
    renderRecentProjects();
}

function renderRecentProjects() {
    const container = document.getElementById('recentProjects');
    const recentProjects = appState.projects.slice(0, 6);
    
    if (recentProjects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3">
                    <rect x="8" y="8" width="48" height="48" rx="4"/>
                    <path d="M32 24V40M24 32H40"/>
                </svg>
                <h3>No engagements yet</h3>
                <p>Create your first diagnostic engagement to get started</p>
                <button class="btn-primary" data-action="open-new-project">
                    Create Engagement
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentProjects.map(project => createProjectCard(project)).join('');
}

function createProjectCard(project) {
    const suites = Array.isArray(project.suites) ? project.suites : [project.suites];
    const suiteBadges = suites.map(suite => {
        const safeLabel = escapeHtml(String(suite).charAt(0).toUpperCase() + String(suite).slice(1));
        const safeClass = String(suite).replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
        return `<span class="suite-badge ${safeClass}">${safeLabel}</span>`;
    }).join('');
    
    const statusColors = {
        active: 'active',
        paused: 'paused',
        completed: 'completed'
    };
    
    const safeClientName = escapeHtml(project.clientName || '');
    const safeIndustry = escapeHtml(project.industry || 'Industry');
    const safeCreated = escapeHtml(formatDate(project.createdAt));
    const safeProgress = escapeHtml(project.progress || 0);
    const safeStatus = escapeHtml(project.status || 'Active');

    return `
        <div class="project-card" data-action="open-project" data-id="${escapeHtml(project.id)}">
            <div class="project-header">
                <div class="project-title">${safeClientName}</div>
                <div class="project-meta">${safeIndustry} • Created ${safeCreated}</div>
            </div>
            <div class="project-body">
                <div class="suite-badges">${suiteBadges}</div>
                <div class="progress-section">
                    <div class="progress-label">
                        <span>Overall Progress</span>
                        <span>${safeProgress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${safeProgress}%"></div>
                    </div>
                </div>
            </div>
            <div class="project-footer">
                <span class="status-badge ${statusColors[project.status] || 'active'}">${safeStatus}</span>
                <div class="team-avatars">
                    ${(project.teamMembersData || []).slice(0, 3).map(member => 
                        `<div class="avatar">${escapeHtml(getInitials(member.name))}</div>`
                    ).join('')}
                </div>
                <div class="project-actions">
                    <button class="btn-secondary" data-action="open-team" data-id="${escapeHtml(project.id)}">Manage Team</button>
                </div>
            </div>
        </div>
    `;
}

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

// Confirm modal helper
function openConfirmModal(opts) {
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

// Simple toast helper
function showToast(message, isError) {
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

// ============================================
// PROJECTS VIEW
// ============================================

function renderProjects() {
    const container = document.getElementById('projectsList');
    
    if (appState.projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3">
                    <rect x="8" y="8" width="48" height="48" rx="4"/>
                    <path d="M32 24V40M24 32H40"/>
                </svg>
                <h3>No engagements found</h3>
                <p>Create your first diagnostic engagement to get started</p>
                <button class="btn-primary" data-action="open-new-project">
                    Create Engagement
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appState.projects.map(project => createProjectListItem(project)).join('');
}

function createProjectListItem(project) {
    return `
        <div class="project-list-item" data-action="open-project" data-id="${escapeHtml(project.id)}">
            ${createProjectCard(project)}
        </div>
    `;
}

// ============================================
// NEW PROJECT MODAL
// ============================================

document.getElementById('newProjectBtn')?.addEventListener('click', openNewProjectModal);
document.getElementById('newProjectBtn2')?.addEventListener('click', openNewProjectModal);
document.getElementById('closeModal')?.addEventListener('click', closeNewProjectModal);
document.getElementById('cancelModal')?.addEventListener('click', closeNewProjectModal);

function openNewProjectModal() {
    document.getElementById('newProjectModal').classList.add('active');
}

function closeNewProjectModal() {
    document.getElementById('newProjectModal').classList.remove('active');
}

document.getElementById('createProjectBtn')?.addEventListener('click', async () => {
    const clientName = document.getElementById('clientName').value;
    const industry = document.getElementById('clientIndustry').value;
    const companySize = document.getElementById('companySize').value;
    const revenue = document.getElementById('annualRevenue').value;
    const description = document.getElementById('projectDescription').value;
    
    const selectedSuites = Array.from(document.querySelectorAll('input[name="suite"]:checked'))
        .map(cb => cb.value);
    
    if (!clientName || selectedSuites.length === 0) {
        alert('Please enter a client name and select at least one diagnostic suite');
        return;
    }
    
    try {
        // Collect team member emails/identifiers from UI
        const teamMemberItems = Array.from(document.querySelectorAll('#teamMembersList .team-member-item[data-email]'))
            .map(el => ({ email: el.dataset.email, role: el.dataset.role || 'collaborator' }));

        const projectData = {
            clientName,
            industry,
            companySize,
            revenue,
            description,
            suites: selectedSuites,
            status: 'active',
            progress: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: appState.currentUser.uid,
            teamMembers: [], // will be populated with UIDs after resolving emails
            hoursLogged: 0,
            assessments: {}
        };
        
        // Initialize assessment structure for each suite
        selectedSuites.forEach(suite => {
            projectData.assessments[suite] = {
                modules: {},
                overallScore: null,
                status: 'not_started'
            };
        });
        // Resolve or create users for team members (ensure we have UIDs)
        const teamUids = [appState.currentUser.uid];
        for (const m of teamMemberItems) {
            try {
                const uid = await resolveOrCreateUserByEmail(m.email, m.role);
                if (uid && !teamUids.includes(uid)) teamUids.push(uid);
            } catch (e) {
                console.warn('Could not resolve team member', m.email, e);
            }
        }

        projectData.teamMembers = teamUids;

        const docRef = await db.collection('projects').add(projectData);

        // Update each team member's projects list
        for (const uid of teamUids) {
            try {
                await db.collection('users').doc(uid).set({ projects: firebase.firestore.FieldValue.arrayUnion(docRef.id) }, { merge: true });
            } catch (e) {
                console.warn('Failed to update user projects for', uid, e);
            }
        }
        
        closeNewProjectModal();
        await loadProjects(appState.currentUser.uid);
        updateDashboard();
        
        // Clear form
        document.getElementById('clientName').value = '';
        document.getElementById('projectDescription').value = '';
        document.querySelectorAll('input[name="suite"]:checked').forEach(cb => cb.checked = false);
        
    } catch (error) {
        console.error('Error creating project:', error);
        alert('Error creating project. Please try again.');
    }
});

// Add Team Member UI handling for new project modal
document.getElementById('addTeamMemberBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const email = prompt('Enter team member email');
    if (!email) return;
    addTeamMemberToList(email, 'collaborator');
});

function addTeamMemberToList(email, role) {
    const list = document.getElementById('teamMembersList');
    if (!list) return;
    const item = document.createElement('div');
    item.className = 'team-member-item';
    item.dataset.email = email;
    item.dataset.role = role || 'collaborator';
    const initials = getInitials(email.split('@')[0] || email);
    item.innerHTML = `
        <div class="avatar">${escapeHtml(initials)}</div>
        <div class="member-info">
            <div class="member-name">${escapeHtml(email)}</div>
            <div class="member-role">${escapeHtml(role || 'Collaborator')}</div>
        </div>
        <button type="button" class="btn-link remove-team-member" aria-label="Remove member">&times;</button>
    `;
    list.appendChild(item);

    item.querySelector('.remove-team-member')?.addEventListener('click', () => item.remove());
}

async function resolveOrCreateUserByEmail(email, role) {
    // Try to find a user doc with this email
    const usersRef = db.collection('users');
    const q = await usersRef.where('email', '==', email).get();
    if (q && q.docs && q.docs.length > 0) {
        return q.docs[0].id;
    }

    // Not found — create a user doc with auto-id (not a Firebase Auth user)
    const newDoc = await usersRef.add({
        email,
        name: email.split('@')[0],
        role: role || 'collaborator',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        projects: []
    });
    return newDoc.id;
}

// ============================================
// PROJECT DETAIL VIEW
// ============================================

function openProject(projectId) {
    const project = appState.projects.find(p => p.id === projectId);
    if (!project) return;
    
    appState.currentProject = project;
    renderProjectDetail(project);
    switchView('diagnostic');
}

function renderProjectDetail(project) {
    const container = document.getElementById('diagnosticView');
    if (!container) return;

    const safeClient = escapeHtml(project.clientName || project.id);
    const safeDesc = escapeHtml(project.description || '');

    // Current suites
    const currentSuites = Array.isArray(project.suites) ? project.suites : (project.suites ? [project.suites] : []);

    // Available suites (those defined in diagnosticData but not yet on project)
    const allSuites = window.diagnosticData ? Object.keys(window.diagnosticData) : [];
    const availSuites = allSuites.filter(s => !currentSuites.includes(s));

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>${safeClient}</h1>
                <p class="page-subtitle">${safeDesc}</p>
            </div>
            <div>
                <button class="btn-secondary" id="addDiagnosticBtn">Add Diagnostic</button>
                <button class="btn-secondary" id="deleteProjectBtn" style="margin-left:8px;background:#fff;border:1px solid var(--error);color:var(--error);">Delete Engagement</button>
            </div>
        </div>
        <div class="section">
            <h3>Active Diagnostics</h3>
            <div id="projectSuites" style="display:flex;gap:8px;flex-wrap:wrap;">
                ${currentSuites.map(s => `<span class="suite-badge" style="background:${(window.diagnosticData && window.diagnosticData[s] && window.diagnosticData[s].color) || '#ddd'};padding:8px 12px;border-radius:12px;color:white;">${escapeHtml((window.diagnosticData && window.diagnosticData[s] && window.diagnosticData[s].name) || s)}</span>`).join('')}
            </div>
            <div id="availableSuites" style="margin-top:12px; display:none;">
                <h4>Add a Diagnostic Suite</h4>
                ${availSuites.length === 0 ? '<div>All suites already added</div>' : availSuites.map(s => {
                    const meta = window.diagnosticData && window.diagnosticData[s];
                    return `<div style="margin-bottom:8px;"><button class="btn-primary add-suite-btn" data-suite="${escapeHtml(s)}">Add ${escapeHtml(meta ? meta.name : s)}</button></div>`;
                }).join('')}
            </div>
        </div>
    `;

    document.getElementById('addDiagnosticBtn')?.addEventListener('click', (e) => {
        const avail = document.getElementById('availableSuites');
        if (avail) avail.style.display = avail.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('deleteProjectBtn')?.addEventListener('click', async (e) => {
        try {
            await deleteProject(project.id);
            // remove locally and refresh list
            appState.projects = appState.projects.filter(p => p.id !== project.id);
            loadProjects(appState.currentUser.uid).catch(()=>{});
            updateDashboard();
            switchView('projects');
        } catch (err) {
            console.error('Failed to delete project:', err);
            alert('Failed to delete engagement. See console.');
        }
    });

    // Attach add handlers
    document.querySelectorAll('.add-suite-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const suiteKey = btn.dataset.suite;
            try {
                await addSuiteToProject(project.id, suiteKey);
                const updated = await refreshProject(project.id);
                renderProjectDetail(updated);
            } catch (err) {
                console.error('Failed to add suite:', err);
                alert('Could not add diagnostic suite. See console for details.');
            }
        });
    });
    
    // Render diagnostic modules area placeholder
    const modulesContainer = document.createElement('div');
    modulesContainer.className = 'section';
    const modulesHtml = (currentSuites || []).map(s => {
        const meta = window.diagnosticData && window.diagnosticData[s];
        const title = meta ? meta.name : s;
        return `<div style="margin-top:12px;"><h4>${escapeHtml(title)}</h4><div>${meta && meta.modules ? Object.keys(meta.modules).map(mk => `<div class="module-card">${escapeHtml(meta.modules[mk].name)}</div>`).join('') : ''}</div></div>`;
    }).join('');
    modulesContainer.innerHTML = `<h3>Modules</h3>${modulesHtml}`;
    container.appendChild(modulesContainer);
}

async function addSuiteToProject(projectId, suiteKey) {
    if (!window.diagnosticData || !window.diagnosticData[suiteKey]) throw new Error('Unknown suite ' + suiteKey);
    const suiteDef = window.diagnosticData[suiteKey];
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    // Build a lightweight assessment scaffold for the suite
    const assessment = { modules: {}, overallScore: null, status: 'not_started' };
    for (const moduleKey of Object.keys(suiteDef.modules || {})) {
        assessment.modules[moduleKey] = { score: null, criteria: {} };
    }

    const updateObj = {};
    updateObj['suites'] = firebase.firestore.FieldValue.arrayUnion(suiteKey);
    updateObj[`assessments.${suiteKey}`] = assessment;
    updateObj['updatedAt'] = firebase.firestore.FieldValue.serverTimestamp();

    await projectRef.update(updateObj);
}

// Delete a project (soft-delete) and remove references from users, write an audit log
async function deleteProject(projectId) {
    return new Promise((resolve, reject) => {
        openConfirmModal({
            title: 'Delete engagement',
            message: 'This will mark the engagement as deleted for all members. This is reversible by an admin.',
            confirmText: 'Delete engagement',
            confirmClass: 'btn-danger',
            onConfirm: async () => {
                try {
                    const projRef = db.collection('projects').doc(projectId);
                    const projSnap = await projRef.get();
                    if (!projSnap.exists) {
                        showToast('Project already removed');
                        resolve();
                        return;
                    }
                    const data = projSnap.data();

                    // Soft-delete the project
                    const now = new Date().toISOString();
                    await projRef.set({ deleted: true, deletedAt: now, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

                    // collect UIDs to clean up
                    const members = Array.isArray(data.teamMembers) ? data.teamMembers.slice() : [];
                    if (data.createdBy && !members.includes(data.createdBy)) members.push(data.createdBy);

                    // Remove project reference from each user's projects array
                    const batch = db.batch();
                    for (const uid of members) {
                        try {
                            const userRef = db.collection('users').doc(uid);
                            batch.update(userRef, { projects: firebase.firestore.FieldValue.arrayRemove(projectId) });
                        } catch (e) {
                            console.warn('Could not queue removal for user', uid, e);
                        }
                    }
                    try { await batch.commit(); } catch (e) { console.warn('Batch commit failed for user cleanup', e); }

                    // Delete invites associated with this project
                    try {
                        const invites = await db.collection('invites').where('projectId', '==', projectId).get();
                        for (const d of invites.docs || []) {
                            try { await d.ref.delete(); } catch (e) { console.warn('Failed deleting invite', d.id, e); }
                        }
                    } catch (e) { console.warn('No invites cleanup', e); }

                    // Write audit log
                    try {
                        await db.collection('auditLogs').add({
                            action: 'deleteProject',
                            projectId,
                            performedBy: (auth.currentUser && auth.currentUser.uid) || null,
                            performedAt: now,
                            projectTitle: data && data.clientName,
                        });
                    } catch (e) { console.warn('Failed to write audit log', e); }

                    showToast('Engagement marked deleted');
                    resolve();
                } catch (err) {
                    console.error('deleteProject', err);
                    showToast('Delete failed: ' + (err && err.message) || String(err), true);
                    reject(err);
                }
            }
        });
    });
}

// =============================
// Team Management
// =============================

// Open team view for a project
function openTeamModal(projectId) {
    const project = appState.projects.find(p => p.id === projectId);
    if (!project) return;
    appState.currentProject = project;
    // Render into modal if available, otherwise fall back to team page
    const modal = document.getElementById('teamModal');
    const modalContent = document.getElementById('teamModalContent');
    if (modal && modalContent) {
        renderTeamView(project); // renderTeamView will write into teamView or modalContent
        modal.style.display = 'block';
        document.getElementById('teamModalClose')?.addEventListener('click', () => modal.style.display = 'none');
        document.getElementById('teamModalCancel')?.addEventListener('click', () => modal.style.display = 'none');
        return;
    }
    // Fallback to page view
    renderTeamView(project);
    switchView('team');
}

// Render team view for current project
async function renderTeamView(project) {
    const container = document.getElementById('teamModalContent') || document.getElementById('teamView');
    if (!container) return;
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Team — ${escapeHtml(project.clientName || project.id)}</h1>
                <p class="page-subtitle">Manage project team and invitations</p>
            </div>
        </div>
        <div class="section">
            <div style="margin-bottom:12px;">
                <input id="inviteEmail" placeholder="Invite by email" style="width:320px;padding:8px;margin-right:8px;" />
                <select id="inviteRole">
                    <option value="collaborator">Collaborator</option>
                    <option value="consultant">Consultant</option>
                    <option value="lead">Lead</option>
                </select>
                <button class="btn-primary" id="sendInviteBtn">Send Invite</button>
            </div>
            <div id="teamList"></div>
            <div id="pendingInvites" style="margin-top:16px;"></div>
        </div>
    `;

    document.getElementById('sendInviteBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('inviteEmail').value.trim();
        const role = document.getElementById('inviteRole').value;
        if (!email) { alert('Enter an email'); return; }
        await sendInvite(project.id, email, role);
        document.getElementById('inviteEmail').value = '';
        await renderTeamView(await refreshProject(project.id));
    });

    // Load members
    const team = project.team || [];
    const users = [];
    for (const member of team) {
        try {
            const doc = await db.collection('users').doc(member.uid).get();
            users.push({ uid: member.uid, email: doc.exists ? doc.data().email : (member.email || ''), role: member.role || (doc.exists ? doc.data().role : 'collaborator') });
        } catch (e) {
            users.push({ uid: member.uid, email: member.email || '', role: member.role || 'collaborator' });
        }
    }

    const listEl = document.getElementById('teamList');
    listEl.innerHTML = users.map(u => `
        <div class="team-row" data-uid="${escapeHtml(u.uid)}" style="display:flex;align-items:center;justify-content:space-between;padding:8px;border-bottom:1px solid #eee;">
            <div style="display:flex;align-items:center;gap:8px;">
                <div class="avatar">${escapeHtml(getInitials(u.email || u.uid))}</div>
                <div>
                    <div style="font-weight:600">${escapeHtml(u.email || u.uid)}</div>
                    <div style="font-size:12px;color:#666">${escapeHtml(u.role)}</div>
                </div>
            </div>
            <div>
                <select class="role-select">
                    <option value="collaborator" ${u.role === 'collaborator' ? 'selected' : ''}>Collaborator</option>
                    <option value="consultant" ${u.role === 'consultant' ? 'selected' : ''}>Consultant</option>
                    <option value="lead" ${u.role === 'lead' ? 'selected' : ''}>Lead</option>
                </select>
                <button class="btn-link remove-member">Remove</button>
            </div>
        </div>
    `).join('');

    // Attach handlers
    listEl.querySelectorAll('.remove-member').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const uid = e.target.closest('.team-row').dataset.uid;
            openConfirmModal({
                title: 'Remove team member',
                message: 'Remove member from project?',
                confirmText: 'Remove member',
                onConfirm: async () => {
                    await removeMemberFromProject(project.id, uid);
                    await renderTeamView(await refreshProject(project.id));
                }
            });
        });
    });

    listEl.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const uid = e.target.closest('.team-row').dataset.uid;
            const role = e.target.value;
            await updateMemberRole(project.id, uid, role);
            await renderTeamView(await refreshProject(project.id));
        });
    });

    // Pending invites
    const invitesSnap = await db.collection('invites').where('projectId', '==', project.id).where('status', '==', 'pending').get();
    const pendingEl = document.getElementById('pendingInvites');
    if (invitesSnap && invitesSnap.docs && invitesSnap.docs.length > 0) {
        pendingEl.innerHTML = '<h3>Pending Invites</h3>' + invitesSnap.docs.map(d => {
            const data = d.data();
            return `<div style="padding:8px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;"><div>${escapeHtml(data.email)} — ${escapeHtml(data.role)}</div><div><button class="btn-link cancel-invite" data-id="${d.id}">Cancel</button></div></div>`;
        }).join('');

        pendingEl.querySelectorAll('.cancel-invite').forEach(btn => btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            openConfirmModal({
                title: 'Cancel invite',
                message: 'Cancel invite?',
                confirmText: 'Cancel invite',
                onConfirm: async () => {
                    await db.collection('invites').doc(id).update({ status: 'cancelled' });
                    await renderTeamView(await refreshProject(project.id));
                }
            });
        }));
    } else {
        pendingEl.innerHTML = '<h3>No pending invites</h3>';
    }
}

async function refreshProject(projectId) {
    const doc = await db.collection('projects').doc(projectId).get();
    const p = { id: doc.id, ...(doc.data ? doc.data() : {}) };
    // update in appState.projects
    const idx = appState.projects.findIndex(x => x.id === projectId);
    if (idx >= 0) appState.projects[idx] = p;
    return p;
}

async function sendInvite(projectId, email, role) {
    // create invite doc
    const invite = {
        projectId,
        email,
        role: role || 'collaborator',
        invitedBy: appState.currentUser ? appState.currentUser.uid : null,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('invites').add(invite);

    // send email link sign-in
    try {
        const actionCodeSettings = {
            url: (window.location.origin || window.location.protocol + '//' + window.location.host) + '/?invited=true',
            handleCodeInApp: true
        };
        await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);
        // persist last invite email locally so sign-in handler can complete
        localStorage.setItem('lastInviteEmail', email);
    } catch (e) {
        console.error('Failed to send sign-in link:', e);
    }
    return docRef.id;
}

async function removeMemberFromProject(projectId, uid) {
    // remove from project's team array and teamMembers array
    const projRef = db.collection('projects').doc(projectId);
    const doc = await projRef.get();
    if (!doc.exists) return;
    const data = doc.data();
    const team = (data.team || []).filter(t => t.uid !== uid);
    const teamMembers = (data.teamMembers || []).filter(x => x !== uid);
    await projRef.update({ team, teamMembers, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    // also remove project from user's projects list
    try { await db.collection('users').doc(uid).update({ projects: firebase.firestore.FieldValue.arrayRemove(projectId) }); } catch(e){/*ignore*/}
}

async function updateMemberRole(projectId, uid, role) {
    const projRef = db.collection('projects').doc(projectId);
    const doc = await projRef.get();
    if (!doc.exists) return;
    const data = doc.data();
    const team = (data.team || []).map(t => t.uid === uid ? Object.assign({}, t, { role }) : t);
    await projRef.update({ team, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
}

// On page load, handle email link sign-in to accept invites
if (firebase && firebase.auth && firebase.auth().isSignInWithEmailLink && firebase.auth().isSignInWithEmailLink(window.location.href)) {
    (async () => {
        let email = window.localStorage.getItem('lastInviteEmail');
        if (!email) {
            email = window.prompt('Please provide your email for confirmation');
        }
        try {
            const result = await firebase.auth().signInWithEmailLink(email, window.location.href);
            console.log('Signed in with email link:', result.user && result.user.email);
            // find pending invites for this email
            const invitesSnap = await db.collection('invites').where('email', '==', result.user.email).where('status', '==', 'pending').get();
            for (const d of invitesSnap.docs) {
                const inv = d.data();
                // ensure user doc exists
                const usersRef = db.collection('users');
                const q = await usersRef.where('email', '==', result.user.email).get();
                let uid = null;
                if (q && q.docs && q.docs.length > 0) {
                    uid = q.docs[0].id;
                    await usersRef.doc(uid).set({ email: result.user.email, name: result.user.displayName||result.user.email, role: inv.role || 'collaborator' }, { merge: true });
                } else {
                    const newDoc = await usersRef.add({ email: result.user.email, name: result.user.displayName||result.user.email, role: inv.role || 'collaborator', projects: [] });
                    uid = newDoc.id;
                }
                // add to project
                const projRef = db.collection('projects').doc(inv.projectId);
                const proj = await projRef.get();
                if (proj.exists) {
                    await projRef.update({ teamMembers: firebase.firestore.FieldValue.arrayUnion(uid), team: firebase.firestore.FieldValue.arrayUnion({ uid, email: result.user.email, role: inv.role || 'collaborator' }) });
                }
                await d.ref.update({ status: 'accepted', acceptedAt: firebase.firestore.FieldValue.serverTimestamp(), acceptedByUid: uid });
            }
            localStorage.removeItem('lastInviteEmail');
            // redirect to app root without link params
            window.location.href = window.location.origin + window.location.pathname;
        } catch (e) {
            console.error('Failed to complete sign-in with link:', e);
        }
    })();
}
