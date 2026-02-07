// ui-team.js - lightweight compatibility wrapper for legacy team UI functions.
(function () {
    function openTeamModal(projectId) {
        if (typeof window.openTeamModal === 'function') {
            return window.openTeamModal(projectId);
        }
        return undefined;
    }

    function renderTeamView(project) {
        if (typeof window.renderTeamView === 'function') {
            return window.renderTeamView(project);
        }
        return undefined;
    }

    if (typeof window !== 'undefined') {
        window._modules = window._modules || {};
        window._modules.teamUI = { openTeamModal, renderTeamView };
    }
})();
