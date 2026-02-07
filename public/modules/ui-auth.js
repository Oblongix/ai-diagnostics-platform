// ui-auth.js - authentication UI handlers
(function () {
    const escapeHtml =
        window.safeHtml && window.safeHtml.escapeHtml
            ? window.safeHtml.escapeHtml
            : (s) => String(s == null ? '' : s);

    function showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
    function showMainApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'grid';
    }

    async function initAuthUI() {
        const services =
            window.firebaseServices ||
            (window.firebase
                ? { auth: window.firebase.auth(), db: window.firebase.firestore() }
                : null);
        const auth = services && services.auth;
        if (!auth) return;

        // Prevent default form submission
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            document.getElementById('loginBtn')?.click();
        });
        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            document.getElementById('registerBtn')?.click();
        });

        document.getElementById('loginBtn')?.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (e) {
                showError(e && e.message);
            }
        });

        document.getElementById('registerBtn')?.addEventListener('click', async () => {
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const name = document.getElementById('registerName').value;
            const company = document.getElementById('registerCompany').value;
            const role = document.getElementById('registerRole').value;
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const db = services.db;
                if (db) {
                    await db
                        .collection('users')
                        .doc(userCredential.user.uid)
                        .set({
                            name,
                            email,
                            company,
                            role,
                            createdAt:
                                db && db.FieldValue ? db.FieldValue.serverTimestamp() : new Date(),
                            projects: [],
                        });
                }
                if (userCredential.user && userCredential.user.updateProfile)
                    await userCredential.user.updateProfile({ displayName: name });
            } catch (e) {
                showError(e && e.message);
            }
        });

        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            try {
                await auth.signOut();
            } catch (e) {
                console.warn('Sign out failed', e);
            }
        });

        auth.onAuthStateChanged((user) => {
            if (user) {
                window.appState = window.appState || {};
                window.appState.currentUser = user;
                if (
                    window._modules &&
                    window._modules.projects &&
                    typeof window._modules.projects.loadProjects === 'function'
                ) {
                    window._modules.projects.loadProjects(user.uid).catch(() => {});
                } else if (window.loadProjects) {
                    window.loadProjects(user.uid).catch(() => {});
                }
                showMainApp();
            } else {
                showLoginScreen();
            }
        });
    }

    function showError(msg) {
        const errorDiv = document.getElementById('authError');
        if (!errorDiv) return;
        errorDiv.textContent = msg || '';
        errorDiv.style.display = msg ? 'block' : 'none';
        if (msg) setTimeout(() => (errorDiv.style.display = 'none'), 5000);
    }

    if (typeof window !== 'undefined') {
        window._modules = window._modules || {};
        window._modules.authUI = { initAuthUI, showLoginScreen, showMainApp };
    }
})();
