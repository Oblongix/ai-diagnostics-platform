// modules/ui-wiring.js
// Wire up global UI event handlers. This module calls into existing global functions
// such as `switchView`, `openProject`, etc., which are still provided by legacy code
// during incremental migration.
export function initializeApp() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-link[data-view]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            if (window.switchView) window.switchView(view);
        });
    });

    // Suite links
    document.querySelectorAll('.sidebar-link[data-suite]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const suite = link.dataset.suite;
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
        switch (action) {
            case 'open-project':
                e.preventDefault();
                if (el.dataset.id && window.openProject) window.openProject(el.dataset.id);
                break;
            case 'open-new-project':
                e.preventDefault();
                if (window.openNewProjectModal) window.openNewProjectModal();
                break;
            case 'switch-view':
                e.preventDefault();
                if (el.dataset.view && window.switchView) window.switchView(el.dataset.view);
                break;
            case 'export-project':
                e.preventDefault();
                if (window.exportProject) window.exportProject(el.dataset.id);
                break;
            case 'open-team':
                e.preventDefault();
                if (window.openTeamModal) window.openTeamModal(el.dataset.id);
                break;
            case 'delete-project':
                e.preventDefault();
                if (el.dataset.id && window.deleteProject) window.deleteProject(el.dataset.id);
                break;
            case 'switch-suite':
                e.preventDefault();
                if (el.dataset.suite && window.switchSuite) window.switchSuite(el.dataset.suite);
                break;
            case 'open-module':
                e.preventDefault();
                if (el.dataset.module && window.openModule)
                    window.openModule(el.dataset.suite, el.dataset.module);
                break;
            case 'close-module':
                e.preventDefault();
                if (window.closeModuleModal) window.closeModuleModal();
                break;
            case 'save-assessment':
                e.preventDefault();
                if (window.saveAssessment)
                    window.saveAssessment(el.dataset.suite, el.dataset.module);
                break;
            case 'calculate-score':
                e.preventDefault();
                if (window.calculateModuleScore)
                    window.calculateModuleScore(el.dataset.suite, el.dataset.module);
                break;
            case 'select-score':
                e.preventDefault();
                if (window.selectScore)
                    window.selectScore(el.dataset.key, Number(el.dataset.score));
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

export function populateDebugPanel() {
    try {
        const dbg = document.getElementById('debugPanel');
        const dbgUsers = document.getElementById('debugUsers');
        if (!dbg || !dbgUsers) return;
        const services = window.firebaseServices;
        if (!services || !services.db || !services.db._store) return;
        const users = services.db._store.users || {};
        const lines = Object.values(users).map(
            (u) => `${u.uid} — ${u.email} ${u.password ? '(has password)' : ''}`
        );
        dbgUsers.textContent = lines.join('\n');
        dbg.style.display = 'block';
    } catch (e) {
        console.warn('populateDebugPanel failed', e);
    }
}

// expose for compatibility
if (typeof window !== 'undefined') {
    window._modules = window._modules || {};
    window._modules.uiWiring = { initializeApp, populateDebugPanel };
}
