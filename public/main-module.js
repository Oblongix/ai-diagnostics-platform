// Entry module for the refactored app (incremental migration).
import './modules/safe-html.js';
import './modules/firebase-wrapper.js';
import './modules/services/firebase.js';
import './modules/ui.js';
import './modules/ui-wiring.js';
import './modules/auth.js';
import './modules/projects.js';
import './modules/team.js';

// For now, simply expose a small initializer that legacy `app.js` can call
export function initializeRefactoredModules() {
    // ensure modules are available on window._modules for backward compatibility
    window._modules = window._modules || {};
    // noop for now; future migration will move logic into modules and call their init functions
    console.log('Refactored modules loaded');
}

// Auto-initialize if possible
if (typeof window !== 'undefined') {
    window.initializeRefactoredModules = initializeRefactoredModules;
}
