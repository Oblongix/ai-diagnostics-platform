(function () {
    const escapeHtml =
        window.safeHtml && window.safeHtml.escapeHtml
            ? window.safeHtml.escapeHtml
            : function (v) {
                  return String(v == null ? '' : v);
              };

    const moduleState = {
        suiteKey: null,
        moduleId: null,
        section: 'overview',
    };

    function app() {
        return window.appApi || {};
    }
    function db() {
        return app().db || (window.firebaseServices && window.firebaseServices.db) || null;
    }
    function fieldValue() {
        return (
            app().FieldValue || {
                serverTimestamp: function () {
                    return new Date();
                },
            }
        );
    }
    function toast(msg, bad) {
        if (window.showToast) window.showToast(msg, bad);
    }
    function suites(project) {
        return Array.isArray(project && project.suites)
            ? project.suites
            : project && project.suites
              ? [project.suites]
              : [];
    }
    function data() {
        return window.diagnosticData || {};
    }
    function getProject() {
        return window.appState && window.appState.currentProject
            ? window.appState.currentProject
            : null;
    }
    function moduleDef(suiteKey, moduleId) {
        const suite = data()[suiteKey];
        return suite && suite.modules ? suite.modules[moduleId] : null;
    }
    function criteriaTotal(module) {
        if (!module || !Array.isArray(module.sections)) return 0;
        return module.sections.reduce(function (sum, section) {
            return sum + (Array.isArray(section.criteria) ? section.criteria.length : 0);
        }, 0);
    }
    function criteriaDone(project, suiteKey, moduleId) {
        const criteria =
            project &&
            project.assessments &&
            project.assessments[suiteKey] &&
            project.assessments[suiteKey].modules &&
            project.assessments[suiteKey].modules[moduleId] &&
            project.assessments[suiteKey].modules[moduleId].criteria
                ? project.assessments[suiteKey].modules[moduleId].criteria
                : {};
        return Object.values(criteria).filter(function (x) {
            return x && Number.isFinite(Number(x.score));
        }).length;
    }
    function moduleProgress(project, suiteKey, moduleId) {
        const def = moduleDef(suiteKey, moduleId);
        const total = criteriaTotal(def);
        if (!total) return 0;
        return Math.round((criteriaDone(project, suiteKey, moduleId) / total) * 100);
    }
    function suiteProgress(project, suiteKey) {
        const suite = data()[suiteKey];
        if (!suite || !suite.modules) return 0;
        const ids = Object.keys(suite.modules);
        if (!ids.length) return 0;
        const total = ids.reduce(function (sum, m) {
            return sum + moduleProgress(project, suiteKey, m);
        }, 0);
        return Math.round(total / ids.length);
    }
    function serviceCatalog() {
        return app().getServiceCatalog ? app().getServiceCatalog() : window.serviceCatalog || {};
    }
    function serviceName(serviceId) {
        if (!serviceId) return 'Not assigned';
        return app().getServiceLabel ? app().getServiceLabel(serviceId) : serviceId;
    }
    function renderOptionList(items, selectedValue) {
        return items
            .map(function (item) {
                const selected = String(item.value) === String(selectedValue) ? 'selected' : '';
                return (
                    '<option value="' +
                    escapeHtml(item.value) +
                    '" ' +
                    selected +
                    '>' +
                    escapeHtml(item.label) +
                    '</option>'
                );
            })
            .join('');
    }
    function renderEngagementWorkspace(project) {
        const catalog = serviceCatalog();
        const serviceOptions = [{ value: '', label: 'Select primary service' }].concat(
            Object.keys(catalog).map(function (id) {
                return { value: id, label: catalog[id].name || id };
            })
        );
        const deliverables = Array.isArray(project.serviceDeliverables) ? project.serviceDeliverables : [];
        const projectPlan = Array.isArray(project.projectPlan) ? project.projectPlan : [];
        const people = Array.isArray(project.engagementPeople) ? project.engagementPeople : [];
        const deliverableStatuses = [
            { value: 'not_started', label: 'Not started' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'blocked', label: 'Blocked' },
            { value: 'done', label: 'Done' },
        ];
        const planStatuses = [
            { value: 'not_started', label: 'Not started' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'at_risk', label: 'At risk' },
            { value: 'done', label: 'Done' },
        ];

        return (
            '<section class="workspace-panel"><div class="workspace-title-row"><h3>Engagement Workspace</h3><p class="muted">Services, people, deliverables, and book-aligned plan tracking.</p></div>' +
            '<div class="workspace-grid">' +
            '<article class="workspace-card"><h4>Service Assignment</h4><p class="small">Assign a primary service to this engagement.</p><div class="workspace-row"><select id="workspacePrimaryService">' +
            renderOptionList(serviceOptions, project.primaryService || '') +
            '</select><button class="btn-primary" data-action="assign-primary-service" type="button">Save Service</button></div><p class="small">Current: ' +
            escapeHtml(serviceName(project.primaryService)) +
            '</p></article>' +
            '<article class="workspace-card"><h4>Engagement People</h4><p class="small">Client and stakeholder contacts for this engagement.</p><div class="workspace-person-form"><input id="personName" type="text" placeholder="Name" /><input id="personEmail" type="email" placeholder="Email" /><input id="personRole" type="text" placeholder="Role / Function" /><input id="personFirm" type="text" placeholder="Firm / Company" /><input id="personNotes" type="text" placeholder="Notes" /><button class="btn-secondary" data-action="add-engagement-person" type="button">Add Person</button></div><div class="workspace-list">' +
            (people.length
                ? people
                      .map(function (person) {
                          return (
                              '<div class="workspace-list-row"><div><strong>' +
                              escapeHtml(person.name || 'Unnamed') +
                              '</strong><div class="small">' +
                              escapeHtml([person.role, person.firm, person.email].filter(Boolean).join(' • ')) +
                              '</div></div><div class="workspace-actions"><button class="btn-link" data-action="edit-engagement-person" data-person-id="' +
                              escapeHtml(person.id) +
                              '" type="button">Edit</button><button class="btn-link" data-action="delete-engagement-person" data-person-id="' +
                              escapeHtml(person.id) +
                              '" type="button">Delete</button></div></div>'
                          );
                      })
                      .join('')
                : "<p class='small'>No people added yet.</p>") +
            '</div></article>' +
            '</div>' +
            '<article class="workspace-card"><h4>Service Deliverables</h4><p class="small">Track status and progress updates for committed deliverables.</p><div class="workspace-list">' +
            (deliverables.length
                ? deliverables
                      .map(function (deliverable) {
                          const updates = Array.isArray(deliverable.updates) ? deliverable.updates : [];
                          const lastUpdate = updates.length ? updates[updates.length - 1].note || '' : '';
                          return (
                              '<div class="workspace-list-row stack"><div><strong>' +
                              escapeHtml(deliverable.title || 'Deliverable') +
                              '</strong><div class="small">' +
                              escapeHtml(serviceName(deliverable.serviceId || deliverable.serviceName)) +
                              '</div></div><div class="workspace-row"><select data-deliverable-status="' +
                              escapeHtml(deliverable.id) +
                              '">' +
                              renderOptionList(deliverableStatuses, deliverable.status || 'not_started') +
                              '</select><button class="btn-secondary" data-action="update-deliverable-status" data-deliverable-id="' +
                              escapeHtml(deliverable.id) +
                              '" type="button">Save</button></div><div class="workspace-row"><input type="text" data-deliverable-note="' +
                              escapeHtml(deliverable.id) +
                              '" placeholder="Add update note..." /><button class="btn-secondary" data-action="add-deliverable-update" data-deliverable-id="' +
                              escapeHtml(deliverable.id) +
                              '" type="button">Add Update</button></div><div class="small">' +
                              (lastUpdate ? 'Last update: ' + escapeHtml(lastUpdate) : 'No updates yet.') +
                              '</div></div>'
                          );
                      })
                      .join('')
                : "<p class='small'>No deliverables yet. Assign a service to populate deliverables.</p>") +
            '</div></article>' +
            '<article class="workspace-card"><h4>Project Plan (Book-Aligned)</h4><p class="small">Track transformation phases aligned to The CEO\'s Guide to AI Transformation.</p><div class="workspace-list">' +
            (projectPlan.length
                ? projectPlan
                      .map(function (phase) {
                          const updates = Array.isArray(phase.updates) ? phase.updates : [];
                          const lastUpdate = updates.length ? updates[updates.length - 1].note || '' : '';
                          return (
                              '<div class="workspace-list-row stack"><div><strong>' +
                              escapeHtml(phase.title || 'Plan phase') +
                              '</strong><div class="small">' +
                              escapeHtml(phase.bestPractice || '') +
                              '</div></div><div class="workspace-row"><select data-phase-status="' +
                              escapeHtml(phase.id) +
                              '">' +
                              renderOptionList(planStatuses, phase.status || 'not_started') +
                              '</select><button class="btn-secondary" data-action="update-plan-status" data-phase-id="' +
                              escapeHtml(phase.id) +
                              '" type="button">Save</button></div><div class="workspace-row"><input type="text" data-phase-note="' +
                              escapeHtml(phase.id) +
                              '" placeholder="Add phase update..." /><button class="btn-secondary" data-action="add-plan-update" data-phase-id="' +
                              escapeHtml(phase.id) +
                              '" type="button">Add Update</button></div><div class="small">' +
                              (lastUpdate ? 'Last update: ' + escapeHtml(lastUpdate) : 'No updates yet.') +
                              '</div></div>'
                          );
                      })
                      .join('')
                : "<p class='small'>No plan phases yet. Reopen or update engagement to initialise plan template.</p>") +
            '</div></article></section>'
        );
    }
    async function refreshAndRender(projectId) {
        let refreshed = null;
        if (app().refreshProject) refreshed = await app().refreshProject(projectId);
        if (!refreshed) return null;
        renderProjectDetail(refreshed);
        if (moduleState.suiteKey) switchSuite(moduleState.suiteKey);
        if (app().renderProjects) app().renderProjects();
        if (app().updateDashboard) app().updateDashboard();
        return refreshed;
    }
    async function updateProject(projectId, patch) {
        if (!db() || !projectId) return;
        const payload = Object.assign({}, patch || {});
        payload.updatedAt = fieldValue().serverTimestamp();
        await db().collection('projects').doc(projectId).set(payload, { merge: true });
    }
    async function assignPrimaryService() {
        const project = getProject();
        if (!project) return;
        const select = document.getElementById('workspacePrimaryService');
        const serviceId = String((select && select.value) || '').trim();
        if (!serviceId) return toast('Select a primary service', true);
        const assignedServices = [serviceId];
        const deliverables = app().mergeDeliverablesForServices
            ? app().mergeDeliverablesForServices(project.serviceDeliverables || [], assignedServices)
            : [];
        const patch = {
            primaryService: serviceId,
            assignedServices: assignedServices,
            serviceDeliverables: deliverables,
        };
        if (!Array.isArray(project.projectPlan) || project.projectPlan.length === 0) {
            patch.projectPlan = app().buildBookProjectPlan ? app().buildBookProjectPlan() : [];
        }
        await updateProject(project.id, patch);
        await refreshAndRender(project.id);
        toast('Primary service updated');
    }
    async function updateDeliverableStatus(deliverableId) {
        const project = getProject();
        if (!project || !deliverableId) return;
        const select = document.querySelector('[data-deliverable-status="' + deliverableId + '"]');
        if (!select) return;
        const status = String(select.value || 'not_started');
        const deliverables = (project.serviceDeliverables || []).map(function (d) {
            if (d.id !== deliverableId) return d;
            return Object.assign({}, d, { status: status, updatedAt: Date.now() });
        });
        await updateProject(project.id, { serviceDeliverables: deliverables });
        await refreshAndRender(project.id);
        toast('Deliverable status updated');
    }
    async function addDeliverableUpdate(deliverableId) {
        const project = getProject();
        if (!project || !deliverableId) return;
        const input = document.querySelector('[data-deliverable-note="' + deliverableId + '"]');
        const note = String((input && input.value) || '').trim();
        if (!note) return toast('Enter an update note', true);
        const by =
            (window.appState && window.appState.currentUser && window.appState.currentUser.email) || 'user';
        const deliverables = (project.serviceDeliverables || []).map(function (d) {
            if (d.id !== deliverableId) return d;
            const updates = Array.isArray(d.updates) ? d.updates.slice() : [];
            updates.push({ note: note, by: by, at: Date.now() });
            const status = d.status === 'not_started' ? 'in_progress' : d.status;
            return Object.assign({}, d, { updates: updates, status: status, updatedAt: Date.now() });
        });
        await updateProject(project.id, { serviceDeliverables: deliverables });
        await refreshAndRender(project.id);
        toast('Deliverable update saved');
    }
    async function updatePlanStatus(phaseId) {
        const project = getProject();
        if (!project || !phaseId) return;
        const select = document.querySelector('[data-phase-status="' + phaseId + '"]');
        if (!select) return;
        const status = String(select.value || 'not_started');
        const plan = (project.projectPlan || []).map(function (phase) {
            if (phase.id !== phaseId) return phase;
            return Object.assign({}, phase, { status: status, updatedAt: Date.now() });
        });
        await updateProject(project.id, { projectPlan: plan });
        await refreshAndRender(project.id);
        toast('Plan phase status updated');
    }
    async function addPlanUpdate(phaseId) {
        const project = getProject();
        if (!project || !phaseId) return;
        const input = document.querySelector('[data-phase-note="' + phaseId + '"]');
        const note = String((input && input.value) || '').trim();
        if (!note) return toast('Enter a phase update', true);
        const by =
            (window.appState && window.appState.currentUser && window.appState.currentUser.email) || 'user';
        const plan = (project.projectPlan || []).map(function (phase) {
            if (phase.id !== phaseId) return phase;
            const updates = Array.isArray(phase.updates) ? phase.updates.slice() : [];
            updates.push({ note: note, by: by, at: Date.now() });
            const status = phase.status === 'not_started' ? 'in_progress' : phase.status;
            return Object.assign({}, phase, { updates: updates, status: status, updatedAt: Date.now() });
        });
        await updateProject(project.id, { projectPlan: plan });
        await refreshAndRender(project.id);
        toast('Plan update saved');
    }
    async function addEngagementPerson() {
        const project = getProject();
        if (!project) return;
        const name = String((document.getElementById('personName') || {}).value || '').trim();
        const email = String((document.getElementById('personEmail') || {}).value || '').trim();
        const role = String((document.getElementById('personRole') || {}).value || '').trim();
        const firm = String((document.getElementById('personFirm') || {}).value || '').trim();
        const notes = String((document.getElementById('personNotes') || {}).value || '').trim();
        if (!name) return toast('Enter person name', true);
        const person = {
            id: app().makeId ? app().makeId('person') : String(Date.now()),
            name: name,
            email: email,
            role: role,
            firm: firm,
            notes: notes,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        const people = (project.engagementPeople || []).slice();
        people.push(person);
        await updateProject(project.id, { engagementPeople: people });
        await refreshAndRender(project.id);
        toast('Person added');
    }
    async function editEngagementPerson(personId) {
        const project = getProject();
        if (!project || !personId) return;
        const current = (project.engagementPeople || []).find(function (p) {
            return p.id === personId;
        });
        if (!current) return toast('Person not found', true);
        const name = window.prompt('Name', current.name || '');
        if (!name) return;
        const email = window.prompt('Email', current.email || '') || '';
        const role = window.prompt('Role / Function', current.role || '') || '';
        const firm = window.prompt('Firm / Company', current.firm || '') || '';
        const notes = window.prompt('Notes', current.notes || '') || '';
        const people = (project.engagementPeople || []).map(function (p) {
            if (p.id !== personId) return p;
            return Object.assign({}, p, {
                name: String(name).trim(),
                email: String(email).trim(),
                role: String(role).trim(),
                firm: String(firm).trim(),
                notes: String(notes).trim(),
                updatedAt: Date.now(),
            });
        });
        await updateProject(project.id, { engagementPeople: people });
        await refreshAndRender(project.id);
        toast('Person updated');
    }
    async function deleteEngagementPerson(personId) {
        const project = getProject();
        if (!project || !personId) return;
        let ok = false;
        if (app().openConfirmModal) {
            ok = await app().openConfirmModal({
                title: 'Delete person',
                message: 'Remove this person from the engagement?',
                confirmText: 'Delete',
            });
        } else {
            ok = window.confirm('Remove this person from the engagement?');
        }
        if (!ok) return;
        const people = (project.engagementPeople || []).filter(function (p) {
            return p.id !== personId;
        });
        await updateProject(project.id, { engagementPeople: people });
        await refreshAndRender(project.id);
        toast('Person removed');
    }

    function renderProjectDetail(project) {
        const container = document.getElementById('diagnosticView');
        if (!container || !project) return;
        if (window.appState) window.appState.currentProject = project;

        const projectSuites = suites(project);
        const allSuites = Object.keys(data());
        const available = allSuites.filter(function (s) {
            return !projectSuites.includes(s);
        });
        const activeSuite = moduleState.suiteKey && projectSuites.includes(moduleState.suiteKey)
            ? moduleState.suiteKey
            : projectSuites[0];
        moduleState.suiteKey = activeSuite || null;

        container.innerHTML =
            '<div class="diagnostic-header"><div><h2>' +
            escapeHtml(project.clientName || project.id) +
            '</h2><p class="muted">' +
            escapeHtml(project.description || 'Diagnostic engagement workspace') +
            '</p></div><div class="actions"><button class="btn-secondary" data-action="switch-view" data-view="projects">Back</button><button class="btn-secondary" data-action="edit-project" data-id="' +
            escapeHtml(project.id) +
            '">Edit</button><button class="btn-secondary" data-action="open-team" data-id="' +
            escapeHtml(project.id) +
            '">Team</button><button class="btn-secondary" data-action="export-project" data-id="' +
            escapeHtml(project.id) +
            '">Export</button><button class="btn-secondary" id="toggleSuiteAddBtn">Add Suite</button><button class="btn-danger" data-action="delete-project" data-id="' +
            escapeHtml(project.id) +
            '">Delete</button></div><div class="small">Overall progress: ' +
            (project.progress || 0) +
            '%</div></div><div id="availableSuites" style="display:none;margin-bottom:10px;">' +
            (available.length
                ? available
                      .map(function (s) {
                          const meta = data()[s];
                          return (
                              '<button class="btn-primary" style="margin-right:6px;margin-bottom:6px;" data-action="add-suite" data-project="' +
                              escapeHtml(project.id) +
                              '" data-suite="' +
                              escapeHtml(s) +
                              '">Add ' +
                              escapeHtml((meta && meta.name) || s) +
                              '</button>'
                          );
                      })
                      .join('')
                : '<p class="muted">All suites already added.</p>') +
            '</div>' +
            renderEngagementWorkspace(project) +
            '<div class="suite-nav">' +
            projectSuites
                .map(function (s) {
                    const meta = data()[s];
                    return (
                        '<button class="suite-nav-btn ' +
                        (s === activeSuite ? 'active' : '') +
                        '" data-action="switch-suite" data-suite="' +
                        escapeHtml(s) +
                        '">' +
                        escapeHtml((meta && meta.name) || s) +
                        ' (' +
                        suiteProgress(project, s) +
                        '%)</button>'
                    );
                })
                .join('') +
            '</div><div id="activeSuiteContent">' +
            (activeSuite ? renderSuite(project, activeSuite) : "<div class='empty-state'><p>No suites assigned.</p></div>") +
            '</div>';

        const toggle = document.getElementById('toggleSuiteAddBtn');
        if (toggle) {
            toggle.addEventListener('click', function () {
                const box = document.getElementById('availableSuites');
                if (!box) return;
                box.style.display = box.style.display === 'none' ? 'block' : 'none';
            });
        }
    }

    function renderSuite(project, suiteKey) {
        const suite = data()[suiteKey];
        if (!suite || !suite.modules) return "<div class='empty-state'><p>Suite data not found.</p></div>";
        return (
            '<div class="modules-grid">' +
            Object.values(suite.modules)
                .map(function (module) {
                    const progress = moduleProgress(project, suiteKey, module.id);
                    const status = progress === 0 ? 'not-started' : progress === 100 ? 'completed' : 'in-progress';
                    return (
                        '<article class="module-card" data-action="open-module" data-suite="' +
                        escapeHtml(suiteKey) +
                        '" data-module="' +
                        escapeHtml(module.id) +
                        '"><div class="module-top"><h4>' +
                        escapeHtml(module.name) +
                        '</h4><span class="module-status">' +
                        escapeHtml(status) +
                        '</span></div><p class="small">' +
                        escapeHtml(module.chapter || '') +
                        '</p><div class="progress-wrap"><div class="progress-head"><span>Completion</span><span>' +
                        progress +
                        '%</span></div><div class="progress-bar"><div class="progress-fill" style="width:' +
                        progress +
                        '%"></div></div></div></article>'
                    );
                })
                .join('') +
            '</div>'
        );
    }

    function switchSuite(suiteKey) {
        moduleState.suiteKey = suiteKey;
        document.querySelectorAll('.suite-nav-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.suite === suiteKey);
        });
        const project = getProject();
        if (!project) return;
        const content = document.getElementById('activeSuiteContent');
        if (content) content.innerHTML = renderSuite(project, suiteKey);
    }

    function assessmentSection(project, suiteKey, module, section) {
        if (section === 'overview') {
            return (
                '<div><h3>Module Overview</h3><p class="muted">' +
                escapeHtml(module.chapter || module.name) +
                '</p><p>This module has ' +
                criteriaTotal(module) +
                ' quantitative criteria.</p></div>'
            );
        }
        if (section === 'quantitative') {
            const saved =
                project.assessments &&
                project.assessments[suiteKey] &&
                project.assessments[suiteKey].modules &&
                project.assessments[suiteKey].modules[module.id] &&
                project.assessments[suiteKey].modules[module.id].criteria
                    ? project.assessments[suiteKey].modules[module.id].criteria
                    : {};
            return (
                '<div><h3>Quantitative Assessment</h3>' +
                module.sections
                    .map(function (sec, sIdx) {
                        return (
                            '<div class="criteria-section"><h4>' +
                            escapeHtml(sec.name) +
                            '</h4>' +
                            sec.criteria
                                .map(function (crit, cIdx) {
                                    const key = 's' + sIdx + '_c' + cIdx;
                                    const prev = saved[key] || {};
                                    return (
                                        '<div class="criterion-item" data-key="' +
                                        key +
                                        '"><div class="criterion-head"><strong>' +
                                        escapeHtml(crit.text) +
                                        '</strong><small>' +
                                        escapeHtml(String(crit.weight || 'medium')) +
                                        '</small></div><p class="small">' +
                                        escapeHtml(crit.evidence || '') +
                                        '</p><div class="score-row">' +
                                        [1, 2, 3, 4, 5]
                                            .map(function (score) {
                                                return (
                                                    '<button class="score-btn ' +
                                                    (Number(prev.score) === score ? 'selected' : '') +
                                                    '" data-action="select-score" data-key="' +
                                                    key +
                                                    '" data-score="' +
                                                    score +
                                                    '">' +
                                                    score +
                                                    '</button>'
                                                );
                                            })
                                            .join('') +
                                        '</div><textarea id="evidence_' +
                                        key +
                                        '" rows="2" placeholder="Evidence notes...">' +
                                        escapeHtml(prev.notes || '') +
                                        '</textarea></div>'
                                    );
                                })
                                .join('') +
                            '</div>'
                        );
                    })
                    .join('') +
                '<div class="section-footer"><button class="btn-primary" data-action="save-assessment" data-suite="' +
                escapeHtml(suiteKey) +
                '" data-module="' +
                escapeHtml(module.id) +
                '">Save Assessment</button><button class="btn-secondary" data-action="calculate-score" data-suite="' +
                escapeHtml(suiteKey) +
                '" data-module="' +
                escapeHtml(module.id) +
                '">Calculate Score</button></div></div>'
            );
        }
        if (section === 'interviews') {
            return '<div><h3>Interview Protocol</h3><p class="muted">Capture interview notes for this module.</p><textarea rows="6" placeholder="Interview notes..."></textarea></div>';
        }
        if (section === 'documents') {
            return '<div><h3>Document Analysis</h3><p class="muted">Track supporting documents and analysis notes.</p><button class="btn-secondary" data-action="upload-document" data-idx="0">Upload Document</button> <button class="btn-secondary" data-action="add-document-link" data-idx="0">Add Link</button><textarea rows="6" placeholder="Document analysis..."></textarea></div>';
        }
        return '<div><h3>Findings</h3><textarea id="keyFindings" rows="4" placeholder="Key findings..."></textarea><textarea id="gapAnalysis" rows="4" placeholder="Gap analysis..."></textarea><textarea id="recommendations" rows="4" placeholder="Recommendations..."></textarea><div id="priorityActions" style="margin-top:8px;"><button class="btn-secondary" data-action="add-priority">Add Priority Action</button></div><div class="section-footer"><button class="btn-primary" data-action="save-findings" data-suite="' + escapeHtml(suiteKey) + '" data-module="' + escapeHtml(module.id) + '">Save Findings</button></div></div>';
    }

    function openModule(suiteKey, moduleId) {
        const project = getProject();
        const module = moduleDef(suiteKey, moduleId);
        const view = document.getElementById('diagnosticView');
        if (!project || !module || !view) return;
        moduleState.suiteKey = suiteKey;
        moduleState.moduleId = moduleId;
        moduleState.section = 'overview';
        view.innerHTML =
            '<div id="moduleAssessmentScreen" class="module-assessment-screen" data-suite="' +
            escapeHtml(suiteKey) +
            '" data-module="' +
            escapeHtml(moduleId) +
            '"><div class="module-assessment-header"><div><h3>' +
            escapeHtml(module.name) +
            '</h3><p class="muted">' +
            escapeHtml(module.chapter || '') +
            '</p></div><button class="btn-secondary" data-action="close-module">Back to Engagement</button></div><div class="assessment-container"><aside class="assessment-sidebar"><div class="nav-section active" data-section="overview">Overview</div><div class="nav-section" data-section="quantitative">Quantitative Assessment</div><div class="nav-section" data-section="interviews">Interview Protocol</div><div class="nav-section" data-section="documents">Document Analysis</div><div class="nav-section" data-section="findings">Findings</div></aside><section class="assessment-content" id="moduleSectionContent">' +
            assessmentSection(project, suiteKey, module, 'overview') +
            '</section></div></div>';
        view.querySelectorAll('.nav-section').forEach(function (nav) {
            nav.addEventListener('click', function () {
                view.querySelectorAll('.nav-section').forEach(function (x) {
                    x.classList.remove('active');
                });
                nav.classList.add('active');
                moduleState.section = nav.dataset.section || 'overview';
                const area = document.getElementById('moduleSectionContent');
                if (area) area.innerHTML = assessmentSection(project, suiteKey, module, moduleState.section);
            });
        });
    }

    function closeModuleModal() {
        const project = getProject();
        if (!project) return;
        renderProjectDetail(project);
        if (moduleState.suiteKey) switchSuite(moduleState.suiteKey);
    }

    function selectScore(key, score) {
        document.querySelectorAll('.score-btn[data-key="' + key + '"]').forEach(function (btn) {
            btn.classList.toggle('selected', Number(btn.dataset.score) === Number(score));
        });
    }

    function collectCriteria() {
        const out = {};
        document.querySelectorAll('.criterion-item').forEach(function (item) {
            const key = item.dataset.key;
            const selected = item.querySelector('.score-btn.selected');
            if (!key || !selected) return;
            const notes = document.getElementById('evidence_' + key);
            out[key] = {
                score: Number(selected.dataset.score),
                notes: notes ? notes.value : '',
                timestamp: Date.now(),
            };
        });
        return out;
    }
    function scoreFromCriteria(suiteKey, moduleId, criteria) {
        const def = moduleDef(suiteKey, moduleId);
        if (!def || !Array.isArray(def.sections)) return 0;
        let weighted = 0;
        let totalWeight = 0;
        def.sections.forEach(function (sec, sIdx) {
            (sec.criteria || []).forEach(function (crit, cIdx) {
                const key = 's' + sIdx + '_c' + cIdx;
                const v = criteria[key];
                if (!v || !Number.isFinite(Number(v.score))) return;
                const w = String(crit.weight || 'medium').toLowerCase();
                const weight = w === 'high' ? 3 : w === 'low' ? 1 : 2;
                weighted += Number(v.score) * weight;
                totalWeight += weight;
            });
        });
        return totalWeight ? Number((weighted / totalWeight).toFixed(2)) : 0;
    }
    function calculateModuleScore(suiteKey, moduleId) {
        const criteria = collectCriteria();
        const score = scoreFromCriteria(suiteKey, moduleId, criteria);
        toast('Module score: ' + score + ' (' + Object.keys(criteria).length + ' criteria scored)');
        return score;
    }
    async function saveAssessment(suiteKey, moduleId) {
        const project = getProject();
        if (!project || !db()) return;
        const criteria = collectCriteria();
        const score = scoreFromCriteria(suiteKey, moduleId, criteria);
        const total = criteriaTotal(moduleDef(suiteKey, moduleId));
        const progress = total ? Math.round((Object.keys(criteria).length / total) * 100) : 0;
        await db()
            .collection('projects')
            .doc(project.id)
            .update({
                ['assessments.' + suiteKey + '.modules.' + moduleId + '.criteria']: criteria,
                ['assessments.' + suiteKey + '.modules.' + moduleId + '.score']: score,
                ['assessments.' + suiteKey + '.modules.' + moduleId + '.progress']: progress,
                ['assessments.' + suiteKey + '.modules.' + moduleId + '.lastUpdated']:
                    fieldValue().serverTimestamp(),
                updatedAt: fieldValue().serverTimestamp(),
            });
        let refreshed = project;
        if (window.refreshProject) refreshed = (await window.refreshProject(project.id)) || project;
        const avg = suites(refreshed).length
            ? Math.round(
                  suites(refreshed).reduce(function (sum, s) {
                      return sum + suiteProgress(refreshed, s);
                  }, 0) / suites(refreshed).length
              )
            : 0;
        await db()
            .collection('projects')
            .doc(project.id)
            .update({ progress: avg, updatedAt: fieldValue().serverTimestamp() });
        if (window.refreshProject) await window.refreshProject(project.id);
        if (window.updateDashboard) window.updateDashboard();
        if (window.renderProjects) window.renderProjects();
        toast('Assessment progress saved');
    }
    async function saveFindings(suiteKey, moduleId) {
        const project = getProject();
        if (!project || !db()) return;
        const findings = {
            keyFindings: (document.getElementById('keyFindings') || {}).value || '',
            gapAnalysis: (document.getElementById('gapAnalysis') || {}).value || '',
            recommendations: (document.getElementById('recommendations') || {}).value || '',
            updatedAt: fieldValue().serverTimestamp(),
        };
        await db()
            .collection('projects')
            .doc(project.id)
            .update({
                ['assessments.' + suiteKey + '.modules.' + moduleId + '.findings']: findings,
            });
        toast('Findings saved');
    }
    function uploadDocument() {
        toast('Document upload hook triggered');
    }
    function addDocumentLink() {
        toast('Document link hook triggered');
    }
    function addPriorityAction() {
        const wrap = document.getElementById('priorityActions');
        if (!wrap) return;
        const row = document.createElement('input');
        row.type = 'text';
        row.placeholder = 'Priority action';
        row.style.marginTop = '6px';
        wrap.appendChild(row);
    }

    window.renderProjectDetail = renderProjectDetail;
    window.switchSuite = switchSuite;
    window.openModule = openModule;
    window.closeModuleModal = closeModuleModal;
    window.selectScore = selectScore;
    window.calculateModuleScore = calculateModuleScore;
    window.saveAssessment = saveAssessment;
    window.saveFindings = saveFindings;
    window.uploadDocument = uploadDocument;
    window.addDocumentLink = addDocumentLink;
    window.addPriorityAction = addPriorityAction;
    window.assignPrimaryService = assignPrimaryService;
    window.updateDeliverableStatus = updateDeliverableStatus;
    window.addDeliverableUpdate = addDeliverableUpdate;
    window.updatePlanStatus = updatePlanStatus;
    window.addPlanUpdate = addPlanUpdate;
    window.addEngagementPerson = addEngagementPerson;
    window.editEngagementPerson = editEngagementPerson;
    window.deleteEngagementPerson = deleteEngagementPerson;
})();
