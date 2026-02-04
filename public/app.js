// Main Application Logic
const { auth, db } = window.firebaseServices;

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
}

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
                <button class="btn-primary" onclick="openNewProjectModal()">
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
    const suiteBadges = suites.map(suite => 
        `<span class="suite-badge ${suite}">${suite.charAt(0).toUpperCase() + suite.slice(1)}</span>`
    ).join('');
    
    const statusColors = {
        active: 'active',
        paused: 'paused',
        completed: 'completed'
    };
    
    return `
        <div class="project-card" onclick="openProject('${project.id}')">
            <div class="project-header">
                <div class="project-title">${project.clientName}</div>
                <div class="project-meta">${project.industry || 'Industry'} • Created ${formatDate(project.createdAt)}</div>
            </div>
            <div class="project-body">
                <div class="suite-badges">${suiteBadges}</div>
                <div class="progress-section">
                    <div class="progress-label">
                        <span>Overall Progress</span>
                        <span>${project.progress || 0}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
                    </div>
                </div>
            </div>
            <div class="project-footer">
                <span class="status-badge ${statusColors[project.status] || 'active'}">${project.status || 'Active'}</span>
                <div class="team-avatars">
                    ${(project.teamMembersData || []).slice(0, 3).map(member => 
                        `<div class="avatar">${getInitials(member.name)}</div>`
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
                <button class="btn-primary" onclick="openNewProjectModal()">
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
        <div class="project-list-item" onclick="openProject('${project.id}')">
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
        
        // Update user's projects list
        await db.collection('users').doc(appState.currentUser.uid).update({
            projects: firebase.firestore.FieldValue.arrayUnion(docRef.id)
        });
        
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
