// ui-dashboard.js - dashboard rendering helpers (migrated from app.js)
(function () {
    const escapeHtml =
        window.safeHtml && window.safeHtml.escapeHtml
            ? window.safeHtml.escapeHtml
            : (s) => String(s == null ? '' : s);

    function updateDashboard() {
        try {
            const projects = (window.appState && window.appState.projects) || [];
            const activeCount = projects.filter((p) => !p.deleted).length;
            const activeEl = document.getElementById('activeProjects');
            if (activeEl) activeEl.textContent = String(activeCount);
            const hoursEl = document.getElementById('totalHours');
            if (hoursEl)
                hoursEl.textContent = String(
                    projects.reduce((acc, p) => acc + (p.hoursLogged || 0), 0)
                );
        } catch (e) {
            console.warn('updateDashboard failed', e);
        }
    }

    if (typeof window !== 'undefined') {
        window._modules = window._modules || {};
        window._modules.dashboardUI = { updateDashboard };
    }
})();
