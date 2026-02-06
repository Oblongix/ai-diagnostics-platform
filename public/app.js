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
            teamMembers: [appState.currentUser.uid],
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
        
        const docRef = await db.collection('projects').add(projectData);
        
        // Update user's projects list (use set with merge to create the user doc if missing)
        await db.collection('users').doc(appState.currentUser.uid).set({
            projects: firebase.firestore.FieldValue.arrayUnion(docRef.id)
        }, { merge: true });
        
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
    // This will be implemented in the next part - diagnostic workflow
    console.log('Opening project:', project);
}
