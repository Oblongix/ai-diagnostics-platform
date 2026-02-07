// ui-diagnostic.js - diagnostic workflow rendering helpers (migrated from diagnostic-workflow.js/app.js)
(function () {
    const escapeHtml =
        window.safeHtml && window.safeHtml.escapeHtml
            ? window.safeHtml.escapeHtml
            : (s) => String(s == null ? '' : s);

    function renderProjectDetail(project) {
        // delegate to existing module if available (keeps single source)
        if (
            window._modules &&
            window._modules.projectsUI &&
            typeof window._modules.projectsUI.renderProjectDetail === 'function'
        ) {
            return window._modules.projectsUI.renderProjectDetail(project);
        }
        // fallback: rely on legacy openProject/renderProjectDetail in app.js
        if (window.renderProjectDetail) return window.renderProjectDetail(project);
    }

    function addSuiteButtonHandler() {
        // noop here — actual handlers are set up in projectsUI or legacy code
    }

    if (typeof window !== 'undefined') {
        window._modules = window._modules || {};
        window._modules.diagnosticUI = { renderProjectDetail };
    }
})();
