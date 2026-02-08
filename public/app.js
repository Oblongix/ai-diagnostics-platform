(function () {
    const services = window.firebaseServices || {};
    const auth = services.auth;
    const db = services.db;
    const firebaseCompat = window.firebase || services.firebase || null;
    const FieldValue =
        firebaseCompat &&
        firebaseCompat.firestore &&
        firebaseCompat.firestore.FieldValue
            ? firebaseCompat.firestore.FieldValue
            : {
                  serverTimestamp: function () {
                      return new Date();
                  },
                  arrayUnion: function () {
                      return { __arrayUnion: Array.from(arguments) };
                  },
                  arrayRemove: function () {
                      return { __arrayRemove: Array.from(arguments) };
                  },
              };
    const escapeHtml =
        window.safeHtml && window.safeHtml.escapeHtml
            ? window.safeHtml.escapeHtml
            : function (v) {
                  return String(v == null ? '' : v);
              };

    const state = {
        currentUser: null,
        currentProject: null,
        currentView: 'dashboard',
        projects: [],
        filters: { status: 'all', suite: 'all', query: '' },
    };
    const formState = { mode: 'create', editingId: null };
    let uiReady = false;

    window.appState = state;

    function $(id) {
        return document.getElementById(id);
    }
    function toDate(v) {
        if (!v) return new Date(0);
        if (v && typeof v.toDate === 'function') return v.toDate();
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? new Date(0) : d;
    }
    function initials(name) {
        const t = String(name || '').trim();
        if (!t) return 'NA';
        const p = t.split(/\s+/);
        if (p.length < 2) return p[0].slice(0, 2).toUpperCase();
        return (p[0][0] + p[1][0]).toUpperCase();
    }
    function relDate(v) {
        if (!v) return 'Recently';
        const d = toDate(v);
        const days = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (days <= 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return days + ' days ago';
        if (days < 30) return Math.floor(days / 7) + ' weeks ago';
        return d.toLocaleDateString();
    }
    function makeId(prefix) {
        return (
            String(prefix || 'id') +
            '_' +
            Date.now().toString(36) +
            '_' +
            Math.random().toString(36).slice(2, 8)
        );
    }
    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }
    function serviceCatalog() {
        return window.serviceCatalog || {};
    }
    function planTemplate() {
        return Array.isArray(window.bookProjectPlanTemplate) ? window.bookProjectPlanTemplate : [];
    }
    function serviceLabel(serviceId) {
        const catalog = serviceCatalog();
        return (catalog[serviceId] && catalog[serviceId].name) || serviceId || 'Service not assigned';
    }
    function buildDeliverablesForServices(serviceIds) {
        const catalog = serviceCatalog();
        const out = [];
        (Array.isArray(serviceIds) ? serviceIds : [])
            .filter(Boolean)
            .forEach(function (serviceId) {
                const service = catalog[serviceId];
                if (!service || !Array.isArray(service.deliverables)) return;
                service.deliverables.forEach(function (d) {
                    out.push({
                        id: String(serviceId) + '__' + String(d.id || makeId('deliverable')),
                        serviceId: serviceId,
                        serviceName: service.name,
                        title: d.title || 'Deliverable',
                        status: 'not_started',
                        updates: [],
                        owner: '',
                        dueDate: '',
                        updatedAt: Date.now(),
                    });
                });
            });
        return out;
    }
    function mergeDeliverablesForServices(existingDeliverables, serviceIds) {
        const existing = Array.isArray(existingDeliverables) ? deepClone(existingDeliverables) : [];
        const existingById = new Set(
            existing.map(function (d) {
                return d.id;
            })
        );
        const additions = buildDeliverablesForServices(serviceIds).filter(function (d) {
            return !existingById.has(d.id);
        });
        return existing.concat(additions);
    }
    function buildBookProjectPlan() {
        return planTemplate().map(function (phase) {
            return {
                id: phase.id || makeId('phase'),
                title: phase.title || 'Plan phase',
                bestPractice: phase.bestPractice || '',
                status: 'not_started',
                updates: [],
                updatedAt: Date.now(),
            };
        });
    }
    function normalizeArray(v) {
        return Array.isArray(v) ? v : [];
    }
    function normalizeProject(p) {
        const x = Object.assign({}, p || {});
        x.suites = Array.isArray(x.suites) ? x.suites : x.suites ? [x.suites] : [];
        x.teamMembers = Array.isArray(x.teamMembers) ? x.teamMembers : [];
        x.team = Array.isArray(x.team) ? x.team : [];
        x.primaryService = String(x.primaryService || '');
        x.assignedServices = normalizeArray(x.assignedServices);
        if (!x.assignedServices.length && x.primaryService) x.assignedServices = [x.primaryService];
        x.serviceDeliverables = normalizeArray(x.serviceDeliverables);
        x.projectPlan = normalizeArray(x.projectPlan);
        x.engagementPeople = normalizeArray(x.engagementPeople);
        x.assessments = x.assessments || {};
        x.status = x.status || 'active';
        x.progress = Number.isFinite(Number(x.progress)) ? Number(x.progress) : 0;
        x.hoursLogged = Number.isFinite(Number(x.hoursLogged)) ? Number(x.hoursLogged) : 0;
        return x;
    }
    function visibleProjects() {
        return state.projects.filter(function (p) {
            return !p.deleted;
        });
    }
    function filteredProjects() {
        const q = String(state.filters.query || '').trim().toLowerCase();
        return visibleProjects().filter(function (p) {
            if (state.filters.status !== 'all' && (p.status || 'active') !== state.filters.status)
                return false;
            if (state.filters.suite !== 'all' && !(p.suites || []).includes(state.filters.suite))
                return false;
            if (q) {
                const hay = [p.clientName, p.industry, p.description].join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }
    function toast(msg, bad) {
        let tray = $('appToast');
        if (!tray) {
            tray = document.createElement('div');
            tray.id = 'appToast';
            tray.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;display:grid;gap:8px;';
            document.body.appendChild(tray);
        }
        const item = document.createElement('div');
        item.textContent = msg;
        item.style.cssText =
            'padding:10px 12px;border-radius:8px;color:#fff;font-weight:600;background:' +
            (bad ? 'rgba(186,45,45,.95)' : 'rgba(31,78,120,.95)');
        tray.appendChild(item);
        setTimeout(function () {
            if (item.parentNode) item.parentNode.removeChild(item);
        }, 3200);
    }
    function authError(msg) {
        if (!$('authError')) return;
        $('authError').textContent = msg || 'Authentication error';
        $('authError').style.display = 'block';
    }
    function showLogin() {
        if ($('loginScreen')) $('loginScreen').style.display = 'grid';
        if ($('mainApp')) $('mainApp').style.display = 'none';
    }
    function showApp() {
        if ($('loginScreen')) $('loginScreen').style.display = 'none';
        if ($('mainApp')) $('mainApp').style.display = 'grid';
    }

    function switchView(view) {
        state.currentView = view;
        document.querySelectorAll('.view-content').forEach(function (el) {
            el.style.display = 'none';
        });
        const target = document.getElementById(view + 'View');
        if (target) target.style.display = 'block';
        document.querySelectorAll('.sidebar-link[data-view]').forEach(function (el) {
            el.classList.remove('active');
        });
        const link = document.querySelector('.sidebar-link[data-view="' + view + '"]');
        if (link) link.classList.add('active');
        if (view === 'projects') renderProjects();
        if (view === 'dashboard') updateDashboard();
    }

    function emptyState(message) {
        return (
            '<div class="empty-state"><h4>No engagements found</h4><p>' +
            escapeHtml(message) +
            '</p><button class="btn-primary" data-action="open-new-project">Create Engagement</button></div>'
        );
    }

    function projectCard(p) {
        const suites = (p.suites || [])
            .map(function (s) {
                return '<span class="badge">' + escapeHtml(s) + '</span>';
            })
            .join('');
        const service = p.primaryService
            ? '<span class="badge">' + escapeHtml(serviceLabel(p.primaryService)) + '</span>'
            : '<span class="badge">Service not assigned</span>';
        const progress = Math.max(0, Math.min(100, Number(p.progress) || 0));
        return (
            '<article class="project-card" data-action="open-project" data-id="' +
            escapeHtml(p.id) +
            '"><h4>' +
            escapeHtml(p.clientName || p.id) +
            '</h4><div class="project-meta">' +
            escapeHtml(p.industry || 'Industry not set') +
            ' • Updated ' +
            escapeHtml(relDate(p.updatedAt)) +
            '</div><div class="badges">' +
            service +
            suites +
            '</div><div class="progress-wrap"><div class="progress-head"><span>Progress</span><span>' +
            progress +
            '%</span></div><div class="progress-bar"><div class="progress-fill" style="width:' +
            progress +
            '%"></div></div></div><div class="project-actions"><button class="btn-secondary" data-action="open-team" data-id="' +
            escapeHtml(p.id) +
            '">Team</button><button class="btn-secondary" data-action="edit-project" data-id="' +
            escapeHtml(p.id) +
            '">Edit</button><button class="btn-danger" data-action="delete-project" data-id="' +
            escapeHtml(p.id) +
            '">Delete</button></div></article>'
        );
    }

    function projectRow(p) {
        const serviceText = p.primaryService
            ? serviceLabel(p.primaryService)
            : 'Service not assigned';
        return (
            '<article class="project-list-item" data-id="' +
            escapeHtml(p.id) +
            '"><div class="project-list-main" data-action="open-project" data-id="' +
            escapeHtml(p.id) +
            '"><div class="project-list-name">' +
            escapeHtml(p.clientName || p.id) +
            '</div><div class="small">' +
            escapeHtml(p.industry || 'Industry not set') +
            ' • ' +
            escapeHtml(serviceText) +
            ' • ' +
            escapeHtml(relDate(p.updatedAt)) +
            '</div></div><div class="project-actions"><span class="status ' +
            escapeHtml(p.status || 'active') +
            '">' +
            escapeHtml(p.status || 'active') +
            '</span><button class="btn-secondary" data-action="open-team" data-id="' +
            escapeHtml(p.id) +
            '">Team</button><button class="btn-secondary" data-action="edit-project" data-id="' +
            escapeHtml(p.id) +
            '">Edit</button><button class="btn-danger" data-action="delete-project" data-id="' +
            escapeHtml(p.id) +
            '">Delete</button></div></article>'
        );
    }

    function renderRecentProjects() {
        if (!$('recentProjects')) return;
        const list = visibleProjects()
            .slice()
            .sort(function (a, b) {
                return toDate(b.updatedAt) - toDate(a.updatedAt);
            })
            .slice(0, 6);
        $('recentProjects').innerHTML = list.length
            ? list.map(projectCard).join('')
            : emptyState('Create your first diagnostic engagement.');
    }

    function renderProjects() {
        if (!$('projectsList')) return;
        const list = filteredProjects();
        $('projectsList').innerHTML = list.length
            ? list.map(projectRow).join('')
            : emptyState('Adjust filters or create a new engagement.');
    }

    function updateDashboard() {
        const projects = visibleProjects();
        const active = projects.filter(function (p) {
            return (p.status || 'active') === 'active';
        }).length;
        const hours = projects.reduce(function (s, p) {
            return s + (Number(p.hoursLogged) || 0);
        }, 0);
        const avg = projects.length
            ? Math.round(
                  projects.reduce(function (s, p) {
                      return s + (Number(p.progress) || 0);
                  }, 0) / projects.length
              )
            : 0;
        const members = new Set();
        projects.forEach(function (p) {
            (p.teamMembers || []).forEach(function (u) {
                members.add(u);
            });
        });
        if ($('activeProjects')) $('activeProjects').textContent = String(active);
        if ($('totalHours')) $('totalHours').textContent = String(hours);
        if ($('teamSize')) $('teamSize').textContent = String(Math.max(1, members.size));
        if ($('avgCompletion')) $('avgCompletion').textContent = avg + '%';
        renderRecentProjects();
    }

    function assessmentScaffold(suites) {
        const all = window.diagnosticData || {};
        const out = {};
        (suites || []).forEach(function (suiteKey) {
            const modules = {};
            Object.keys((all[suiteKey] && all[suiteKey].modules) || {}).forEach(function (m) {
                modules[m] = { criteria: {}, score: null, progress: 0 };
            });
            out[suiteKey] = { modules: modules, overallScore: null, status: 'not_started' };
        });
        return out;
    }

    async function ensureUserProfile(user) {
        const ref = db.collection('users').doc(user.uid);
        const snap = await ref.get();
        if (snap.exists) return snap.data() || {};
        const profile = {
            name: user.displayName || user.email || 'User',
            email: user.email || '',
            company: '',
            role: 'consultant',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };
        await ref.set(profile, { merge: true });
        return profile;
    }

    async function loadProjects(userId) {
        try {
            const snap = await db
                .collection('projects')
                .where('teamMembers', 'array-contains', userId)
                .orderBy('updatedAt', 'desc')
                .get();
            state.projects = snap.docs.map(function (d) {
                return normalizeProject(Object.assign({ id: d.id }, d.data ? d.data() : {}));
            });
        } catch (error) {
            const snap = await db
                .collection('projects')
                .where('teamMembers', 'array-contains', userId)
                .get();
            state.projects = snap.docs
                .map(function (d) {
                    return normalizeProject(Object.assign({ id: d.id }, d.data ? d.data() : {}));
                })
                .sort(function (a, b) {
                    return toDate(b.updatedAt) - toDate(a.updatedAt);
                });
            if (!/index/i.test((error && error.message) || '')) console.warn(error);
        }
        renderProjects();
        updateDashboard();
        return state.projects;
    }

    async function loadUserData(user) {
        const profile = await ensureUserProfile(user);
        const name = profile.name || user.displayName || user.email || 'User';
        if ($('userName')) $('userName').textContent = name;
        if ($('userAvatar')) $('userAvatar').textContent = initials(name);
        if ($('currentUserName')) $('currentUserName').textContent = name;
        await loadProjects(user.uid);
    }

    async function login() {
        const email = String((($('loginEmail') && $('loginEmail').value) || '')).trim();
        const password = String((($('loginPassword') && $('loginPassword').value) || '')).trim();
        if (!email || !password) return authError('Enter email and password.');
        try {
            await auth.signInWithEmailAndPassword(email, password);
            if ($('authError')) $('authError').style.display = 'none';
        } catch (e) {
            authError((e && e.message) || 'Sign-in failed');
        }
    }

    async function register() {
        const name = String((($('registerName') && $('registerName').value) || '')).trim();
        const email = String((($('registerEmail') && $('registerEmail').value) || '')).trim();
        const company = String((($('registerCompany') && $('registerCompany').value) || '')).trim();
        const role = String((($('registerRole') && $('registerRole').value) || 'consultant')).trim();
        const password = String((($('registerPassword') && $('registerPassword').value) || '')).trim();
        if (!name || !email || !company || !password) return authError('Fill out all fields.');
        try {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            await db
                .collection('users')
                .doc(cred.user.uid)
                .set(
                    {
                        name: name,
                        email: email,
                        company: company,
                        role: role,
                        createdAt: FieldValue.serverTimestamp(),
                        updatedAt: FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                );
            if (cred.user && cred.user.updateProfile) await cred.user.updateProfile({ displayName: name });
            if ($('authError')) $('authError').style.display = 'none';
        } catch (e) {
            authError((e && e.message) || 'Registration failed');
        }
    }

    async function forgotPassword() {
        const email = String((($('loginEmail') && $('loginEmail').value) || '')).trim();
        if (!email) return authError('Enter your email first.');
        try {
            await auth.sendPasswordResetEmail(email);
            toast('Password reset email sent.');
        } catch (e) {
            authError((e && e.message) || 'Unable to send reset email');
        }
    }

    function setFormMode(mode) {
        formState.mode = mode;
        const edit = mode === 'edit';
        const modal = $('newProjectModal');
        const title = modal ? modal.querySelector('.modal-header h3') : null;
        if (title) title.textContent = edit ? 'Edit Engagement' : 'Create New Engagement';
        if ($('createProjectBtn')) $('createProjectBtn').textContent = edit ? 'Save Changes' : 'Create Engagement';
        document.querySelectorAll('input[name="suite"]').forEach(function (el) {
            el.disabled = edit;
        });
        if ($('addTeamMemberBtn')) $('addTeamMemberBtn').disabled = edit;
    }
    function populateServiceOptions() {
        const select = $('primaryService');
        if (!select) return;
        const existing = select.value;
        const catalog = serviceCatalog();
        const keys = Object.keys(catalog);
        select.innerHTML = '<option value="">Select a primary service</option>';
        keys.forEach(function (key) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = catalog[key].name || key;
            select.appendChild(option);
        });
        if (existing && catalog[existing]) select.value = existing;
        else if (keys.length > 0) select.value = keys[0];
    }

    function clearProjectForm() {
        if ($('clientName')) $('clientName').value = '';
        if ($('clientIndustry')) $('clientIndustry').value = '';
        if ($('companySize')) $('companySize').value = '';
        if ($('annualRevenue')) $('annualRevenue').value = '';
        if ($('primaryService')) {
            const keys = Object.keys(serviceCatalog());
            $('primaryService').value = keys.length ? keys[0] : '';
        }
        if ($('projectDescription')) $('projectDescription').value = '';
        document.querySelectorAll('input[name="suite"]').forEach(function (el) {
            el.checked = false;
        });
        document.querySelectorAll('#teamMembersList .team-member-item[data-email]').forEach(function (el) {
            el.remove();
        });
    }

    function openProjectModal() {
        populateServiceOptions();
        setFormMode('create');
        formState.editingId = null;
        clearProjectForm();
        if ($('newProjectModal')) {
            $('newProjectModal').style.display = 'flex';
            $('newProjectModal').classList.add('active');
        }
    }

    function closeProjectModal() {
        if ($('newProjectModal')) {
            $('newProjectModal').style.display = 'none';
            $('newProjectModal').classList.remove('active');
        }
    }

    function editProject(projectId) {
        populateServiceOptions();
        const project = state.projects.find(function (p) {
            return p.id === projectId;
        });
        if (!project) return toast('Engagement not found', true);
        setFormMode('edit');
        formState.editingId = projectId;
        if ($('clientName')) $('clientName').value = project.clientName || '';
        if ($('clientIndustry')) $('clientIndustry').value = project.industry || '';
        if ($('companySize')) $('companySize').value = project.companySize || '';
        if ($('annualRevenue')) $('annualRevenue').value = project.revenue || '';
        if ($('primaryService')) $('primaryService').value = project.primaryService || '';
        if ($('projectDescription')) $('projectDescription').value = project.description || '';
        document.querySelectorAll('input[name="suite"]').forEach(function (el) {
            el.checked = (project.suites || []).includes(el.value);
        });
        if ($('newProjectModal')) {
            $('newProjectModal').style.display = 'flex';
            $('newProjectModal').classList.add('active');
        }
    }

    function addTeamMemberChip(email, role) {
        const list = $('teamMembersList');
        if (!list) return;
        const normalized = String(email || '').trim().toLowerCase();
        if (!normalized) return;
        const exists = Array.from(list.querySelectorAll('.team-member-item[data-email]')).some(function (el) {
            return String(el.dataset.email || '').toLowerCase() === normalized;
        });
        if (exists) return toast('Team member already added');
        const item = document.createElement('div');
        item.className = 'team-member-item';
        item.dataset.email = normalized;
        item.dataset.role = role || 'collaborator';
        item.innerHTML =
            '<span class="avatar">' +
            escapeHtml(initials(normalized.split('@')[0])) +
            '</span><div><div>' +
            escapeHtml(normalized) +
            '</div><small>' +
            escapeHtml(role || 'collaborator') +
            '</small></div><button class="btn-link remove-team-member" type="button">Remove</button>';
        list.appendChild(item);
        item.querySelector('.remove-team-member').addEventListener('click', function () {
            item.remove();
        });
    }

    async function sendInvite(projectId, email, role) {
        const normalized = String(email || '').trim().toLowerCase();
        if (!normalized) throw new Error('email-required');
        const invite = {
            projectId: projectId,
            email: normalized,
            role: role || 'collaborator',
            invitedBy: state.currentUser ? state.currentUser.uid : null,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        };
        const doc = await db.collection('invites').add(invite);
        try {
            if (firebaseCompat && firebaseCompat.auth && firebaseCompat.auth().sendSignInLinkToEmail) {
                await firebaseCompat.auth().sendSignInLinkToEmail(normalized, {
                    url: window.location.origin + window.location.pathname + '?invited=true',
                    handleCodeInApp: true,
                });
                window.localStorage.setItem('lastInviteEmail', normalized);
            }
        } catch (e) {
            console.warn('Invite email failed', e);
        }
        return doc.id;
    }

    async function saveProject() {
        if (!state.currentUser) return toast('Not signed in', true);
        const clientName = String((($('clientName') && $('clientName').value) || '')).trim();
        const industry = String((($('clientIndustry') && $('clientIndustry').value) || '')).trim();
        const companySize = String((($('companySize') && $('companySize').value) || '')).trim();
        const revenue = String((($('annualRevenue') && $('annualRevenue').value) || '')).trim();
        const primaryService = String((($('primaryService') && $('primaryService').value) || '')).trim();
        const description = String((($('projectDescription') && $('projectDescription').value) || '')).trim();
        const suites = Array.from(document.querySelectorAll('input[name="suite"]:checked')).map(function (el) {
            return el.value;
        });
        const isEdit = formState.mode === 'edit' && !!formState.editingId;
        if (!clientName || (!isEdit && suites.length === 0)) {
            return toast('Enter client name and select at least one suite', true);
        }
        if (!isEdit && !primaryService) {
            return toast('Select a primary service for this engagement', true);
        }

        if (isEdit) {
            const existing =
                state.projects.find(function (p) {
                    return p.id === formState.editingId;
                }) || {};
            const assignedServices = primaryService
                ? [primaryService]
                : normalizeArray(existing.assignedServices);
            const updatePayload = {
                clientName: clientName,
                industry: industry,
                companySize: companySize,
                revenue: revenue,
                description: description,
                updatedAt: FieldValue.serverTimestamp(),
            };
            if (primaryService) {
                updatePayload.primaryService = primaryService;
                updatePayload.assignedServices = assignedServices;
                updatePayload.serviceDeliverables = mergeDeliverablesForServices(
                    existing.serviceDeliverables,
                    assignedServices
                );
            }
            await db.collection('projects').doc(formState.editingId).set(
                updatePayload,
                { merge: true }
            );
            await loadProjects(state.currentUser.uid);
            if (state.currentProject && state.currentProject.id === formState.editingId && window.renderProjectDetail) {
                const refreshed = await refreshProject(formState.editingId);
                if (refreshed) window.renderProjectDetail(refreshed);
            }
            closeProjectModal();
            setFormMode('create');
            formState.editingId = null;
            clearProjectForm();
            return toast('Engagement updated');
        }

        const teamFromModal = Array.from(
            document.querySelectorAll('#teamMembersList .team-member-item[data-email]')
        ).map(function (el) {
            return {
                email: String(el.dataset.email || '').trim().toLowerCase(),
                role: String(el.dataset.role || 'collaborator'),
            };
        });

        const uid = state.currentUser.uid;
        const assignedServices = primaryService ? [primaryService] : [];
        const data = {
            clientName: clientName,
            industry: industry,
            companySize: companySize,
            revenue: revenue,
            description: description,
            suites: suites,
            primaryService: primaryService,
            assignedServices: assignedServices,
            serviceDeliverables: buildDeliverablesForServices(assignedServices),
            projectPlan: buildBookProjectPlan(),
            engagementPeople: [],
            status: 'active',
            progress: 0,
            hoursLogged: 0,
            createdBy: uid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            teamMembers: [uid],
            team: [{ uid: uid, email: state.currentUser.email || '', role: 'lead' }],
            assessments: assessmentScaffold(suites),
        };
        const ref = await db.collection('projects').add(data);
        for (const member of teamFromModal) {
            await sendInvite(ref.id, member.email, member.role).catch(function () {});
        }
        closeProjectModal();
        clearProjectForm();
        await loadProjects(uid);
        toast('Engagement created');
    }

    async function refreshProject(projectId) {
        const snap = await db.collection('projects').doc(projectId).get();
        if (!snap.exists) return null;
        const p = normalizeProject(Object.assign({ id: snap.id }, snap.data ? snap.data() : {}));
        const i = state.projects.findIndex(function (x) {
            return x.id === p.id;
        });
        if (i >= 0) state.projects[i] = p;
        else state.projects.push(p);
        if (state.currentProject && state.currentProject.id === p.id) state.currentProject = p;
        return p;
    }

    async function addSuiteToProject(projectId, suiteKey) {
        const suites = window.diagnosticData || {};
        if (!suites[suiteKey]) throw new Error('Unknown suite: ' + suiteKey);
        const modules = {};
        Object.keys(suites[suiteKey].modules || {}).forEach(function (m) {
            modules[m] = { criteria: {}, score: null, progress: 0 };
        });
        const update = { suites: FieldValue.arrayUnion(suiteKey), updatedAt: FieldValue.serverTimestamp() };
        update['assessments.' + suiteKey] = {
            modules: modules,
            overallScore: null,
            status: 'not_started',
        };
        await db.collection('projects').doc(projectId).update(update);
        const refreshed = await refreshProject(projectId);
        renderProjects();
        updateDashboard();
        toast('Suite added to engagement');
        return refreshed;
    }

    async function deleteProject(projectId) {
        const ok = await confirmModal({
            title: 'Delete engagement',
            message: 'This will mark the engagement as deleted for all members.',
            confirmText: 'Delete engagement',
        });
        if (!ok) return;
        const ref = db.collection('projects').doc(projectId);
        const snap = await ref.get();
        if (!snap.exists) return toast('Engagement not found', true);
        const now = new Date().toISOString();
        await ref.set(
            { deleted: true, deletedAt: now, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
        );
        try {
            const invites = await db.collection('invites').where('projectId', '==', projectId).get();
            for (const d of invites.docs || []) await d.ref.delete().catch(function () {});
        } catch (e) {
            console.warn('Invite cleanup failed', e);
        }
        try {
            await db.collection('auditLogs').add({
                action: 'deleteProject',
                projectId: projectId,
                projectTitle: snap.data && snap.data().clientName,
                performedBy: state.currentUser ? state.currentUser.uid : null,
                performedAt: now,
            });
        } catch (e) {
            console.warn('Audit log failed', e);
        }
        await loadProjects(state.currentUser.uid);
        if (state.currentProject && state.currentProject.id === projectId) {
            state.currentProject = null;
            switchView('projects');
        }
        toast('Engagement marked deleted');
    }

    function exportProject(projectId) {
        const p = state.projects.find(function (x) {
            return x.id === projectId;
        });
        if (!p) return toast('Engagement not found', true);
        const blob = new Blob(
            [JSON.stringify({ exportedAt: new Date().toISOString(), project: p }, null, 2)],
            { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const base = String(p.clientName || 'engagement').replace(/[^a-z0-9_-]/gi, '-');
        a.href = url;
        a.download = base + '-' + p.id + '-report.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function openProject(projectId) {
        const p = visibleProjects().find(function (x) {
            return x.id === projectId;
        });
        if (!p) return toast('Engagement not found', true);
        state.currentProject = p;
        if (window.renderProjectDetail) window.renderProjectDetail(p);
        else if ($('diagnosticView')) {
            $('diagnosticView').innerHTML =
                "<div class='empty-state'><h4>Diagnostics loading</h4><p>Reload and try again.</p></div>";
        }
        switchView('diagnostic');
    }

    async function removeMember(projectId, uid) {
        const ref = db.collection('projects').doc(projectId);
        const snap = await ref.get();
        if (!snap.exists) return;
        const data = snap.data() || {};
        const team = (data.team || []).filter(function (x) {
            return x.uid !== uid;
        });
        const teamMembers = (data.teamMembers || []).filter(function (x) {
            return x !== uid;
        });
        await ref.update({ team: team, teamMembers: teamMembers, updatedAt: FieldValue.serverTimestamp() });
    }

    async function changeRole(projectId, uid, role) {
        const ref = db.collection('projects').doc(projectId);
        const snap = await ref.get();
        if (!snap.exists) return;
        const team = (snap.data().team || []).map(function (x) {
            return x.uid === uid ? Object.assign({}, x, { role: role }) : x;
        });
        await ref.update({ team: team, updatedAt: FieldValue.serverTimestamp() });
    }

    async function renderTeam(project) {
        const container = $('teamModalContent') || $('teamView');
        if (!container) return;
        container.innerHTML =
            '<div><h4>Team - ' +
            escapeHtml(project.clientName || project.id) +
            "</h4><p class='muted'>Invite members and manage project roles.</p></div>" +
            "<div><label>Email</label><input id='inviteEmail' type='email' placeholder='consultant@example.com' /></div>" +
            "<div><label>Role</label><select id='inviteRole'><option value='collaborator'>Collaborator</option><option value='consultant'>Consultant</option><option value='lead'>Lead</option></select></div>" +
            "<div><button id='sendInviteBtn' class='btn-primary' type='button'>Send Invite</button></div><div id='teamList'></div><div id='pendingInvites'></div>";

        $('sendInviteBtn').addEventListener('click', async function () {
            const email = String((($('inviteEmail') && $('inviteEmail').value) || '')).trim();
            const role = String((($('inviteRole') && $('inviteRole').value) || 'collaborator')).trim();
            if (!email) return toast('Enter invite email', true);
            await sendInvite(project.id, email, role);
            if ($('inviteEmail')) $('inviteEmail').value = '';
            const refreshed = await refreshProject(project.id);
            if (refreshed) {
                state.currentProject = refreshed;
                await renderTeam(refreshed);
            }
        });

        const members =
            project.team && project.team.length
                ? project.team
                : (project.teamMembers || []).map(function (uid) {
                      return { uid: uid, role: 'collaborator' };
                  });
        const users = [];
        for (const m of members) {
            try {
                const u = await db.collection('users').doc(m.uid).get();
                const d = u.exists ? u.data() || {} : {};
                users.push({
                    uid: m.uid,
                    email: d.email || m.email || m.uid,
                    role: m.role || d.role || 'collaborator',
                });
            } catch (e) {
                users.push({ uid: m.uid, email: m.email || m.uid, role: m.role || 'collaborator' });
            }
        }

        if ($('teamList')) {
            $('teamList').innerHTML = users
                .map(function (u) {
                    return (
                        '<div class="team-row" data-uid="' +
                        escapeHtml(u.uid) +
                        '"><div class="team-row-left"><span class="avatar">' +
                        escapeHtml(initials(u.email)) +
                        '</span><div><div>' +
                        escapeHtml(u.email) +
                        '</div><small>' +
                        escapeHtml(u.role) +
                        '</small></div></div><div class="team-row-actions"><select class="role-select"><option value="collaborator" ' +
                        (u.role === 'collaborator' ? 'selected' : '') +
                        '>Collaborator</option><option value="consultant" ' +
                        (u.role === 'consultant' ? 'selected' : '') +
                        '>Consultant</option><option value="lead" ' +
                        (u.role === 'lead' ? 'selected' : '') +
                        '>Lead</option></select><button class="btn-link remove-member" type="button">Remove</button></div></div>'
                    );
                })
                .join('');

            $('teamList').querySelectorAll('.remove-member').forEach(function (btn) {
                btn.addEventListener('click', async function (e) {
                    const row = e.target.closest('.team-row');
                    if (!row) return;
                    const ok = await confirmModal({
                        title: 'Remove team member',
                        message: 'Remove this user from the engagement?',
                        confirmText: 'Remove',
                    });
                    if (!ok) return;
                    await removeMember(project.id, row.dataset.uid);
                    const refreshed = await refreshProject(project.id);
                    if (refreshed) {
                        state.currentProject = refreshed;
                        await renderTeam(refreshed);
                    }
                });
            });
            $('teamList').querySelectorAll('.role-select').forEach(function (select) {
                select.addEventListener('change', async function (e) {
                    const row = e.target.closest('.team-row');
                    if (!row) return;
                    await changeRole(project.id, row.dataset.uid, e.target.value);
                    const refreshed = await refreshProject(project.id);
                    if (refreshed) {
                        state.currentProject = refreshed;
                        await renderTeam(refreshed);
                    }
                });
            });
        }

        if ($('pendingInvites')) {
            try {
                const snap = await db
                    .collection('invites')
                    .where('projectId', '==', project.id)
                    .where('status', '==', 'pending')
                    .get();
                if (!snap.docs || snap.docs.length === 0) {
                    $('pendingInvites').innerHTML = "<h4>Pending Invites</h4><p class='muted'>No pending invites.</p>";
                } else {
                    $('pendingInvites').innerHTML =
                        '<h4>Pending Invites</h4>' +
                        snap.docs
                            .map(function (d) {
                                const x = d.data() || {};
                                return (
                                    "<div class='team-row'><div>" +
                                    escapeHtml(x.email || '') +
                                    ' - ' +
                                    escapeHtml(x.role || 'collaborator') +
                                    '</div><button class="btn-link cancel-invite" data-id="' +
                                    escapeHtml(d.id) +
                                    '" type="button">Cancel</button></div>'
                                );
                            })
                            .join('');
                    $('pendingInvites').querySelectorAll('.cancel-invite').forEach(function (btn) {
                        btn.addEventListener('click', async function (e) {
                            const ok = await confirmModal({
                                title: 'Cancel invite',
                                message: 'Cancel this pending invite?',
                                confirmText: 'Cancel invite',
                            });
                            if (!ok) return;
                            await db.collection('invites').doc(e.target.dataset.id).update({
                                status: 'cancelled',
                                updatedAt: FieldValue.serverTimestamp(),
                            });
                            const refreshed = await refreshProject(project.id);
                            if (refreshed) {
                                state.currentProject = refreshed;
                                await renderTeam(refreshed);
                            }
                        });
                    });
                }
            } catch (e) {
                console.error(e);
                $('pendingInvites').innerHTML = "<p class='muted'>Could not load invites.</p>";
            }
        }
    }

    async function openTeamModal(projectId) {
        const project = state.projects.find(function (p) {
            return p.id === projectId;
        });
        if (!project) return toast('Engagement not found', true);
        state.currentProject = project;
        if ($('teamModal')) {
            $('teamModal').style.display = 'flex';
            $('teamModal').classList.add('active');
        }
        await renderTeam(project);
    }

    function closeTeamModal() {
        if ($('teamModal')) {
            $('teamModal').style.display = 'none';
            $('teamModal').classList.remove('active');
        }
    }

    function confirmModal(opts) {
        return new Promise(function (resolve) {
            if (!$('confirmModal')) return resolve(true);
            if ($('confirmTitle')) $('confirmTitle').textContent = opts.title || 'Confirm';
            if ($('confirmMessage')) $('confirmMessage').textContent = opts.message || 'Are you sure?';
            if ($('confirmOk')) $('confirmOk').textContent = opts.confirmText || 'Confirm';
            $('confirmModal').style.display = 'flex';
            $('confirmModal').classList.add('active');
            function clean(v) {
                $('confirmModal').style.display = 'none';
                $('confirmModal').classList.remove('active');
                $('confirmOk').removeEventListener('click', onOk);
                $('confirmCancel').removeEventListener('click', onCancel);
                $('confirmClose').removeEventListener('click', onCancel);
                resolve(v);
            }
            function onOk(e) {
                e.preventDefault();
                clean(true);
            }
            function onCancel(e) {
                if (e) e.preventDefault();
                clean(false);
            }
            $('confirmOk').addEventListener('click', onOk);
            $('confirmCancel').addEventListener('click', onCancel);
            $('confirmClose').addEventListener('click', onCancel);
        });
    }

    function populateDebugPanel() {
        if (!isLocalhost() || !$('debugPanel') || !$('debugUsers') || !db || !db._store || !db._store.users)
            return;
        const lines = Object.values(db._store.users).map(function (u) {
            return (
                String(u.uid || '') + ' - ' + String(u.email || '') + (u.password ? ' (password set)' : '')
            );
        });
        $('debugUsers').textContent = lines.join('\n');
        $('debugPanel').style.display = 'block';
    }

    async function maybeCompleteInviteSignIn() {
        if (
            !firebaseCompat ||
            !firebaseCompat.auth ||
            !firebaseCompat.auth().isSignInWithEmailLink ||
            !firebaseCompat.auth().isSignInWithEmailLink(window.location.href)
        )
            return;
        let email = window.localStorage.getItem('lastInviteEmail');
        if (!email) email = window.prompt('Enter your email to complete invite sign-in');
        if (!email) return;
        try {
            const cred = await firebaseCompat.auth().signInWithEmailLink(email, window.location.href);
            const user = cred.user;
            if (!user) return;
            const invites = await db
                .collection('invites')
                .where('email', '==', String(user.email || '').toLowerCase())
                .where('status', '==', 'pending')
                .get();
            for (const d of invites.docs || []) {
                const inv = d.data() || {};
                await db
                    .collection('users')
                    .doc(user.uid)
                    .set(
                        {
                            email: user.email || '',
                            name: user.displayName || user.email || '',
                            role: inv.role || 'collaborator',
                            updatedAt: FieldValue.serverTimestamp(),
                        },
                        { merge: true }
                    );
                await db.collection('projects').doc(inv.projectId).update({
                    teamMembers: FieldValue.arrayUnion(user.uid),
                    team: FieldValue.arrayUnion({
                        uid: user.uid,
                        email: user.email || '',
                        role: inv.role || 'collaborator',
                    }),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                await d.ref.update({
                    status: 'accepted',
                    acceptedAt: FieldValue.serverTimestamp(),
                    acceptedByUid: user.uid,
                });
            }
            window.localStorage.removeItem('lastInviteEmail');
            window.location.href = window.location.origin + window.location.pathname;
        } catch (e) {
            console.error('Invite sign-in failed', e);
        }
    }

    function closeTopPopupOnEscape() {
        if ($('confirmModal') && ($('confirmModal').classList.contains('active') || $('confirmModal').style.display === 'flex')) {
            if ($('confirmCancel')) $('confirmCancel').click();
            return true;
        }
        if ($('moduleAssessmentScreen') && window.closeModuleModal) {
            window.closeModuleModal();
            return true;
        }
        if ($('newProjectModal') && $('newProjectModal').classList.contains('active')) {
            closeProjectModal();
            return true;
        }
        if ($('teamModal') && ($('teamModal').classList.contains('active') || $('teamModal').style.display === 'flex')) {
            closeTeamModal();
            return true;
        }
        return false;
    }

    function delegatedActions() {
        document.addEventListener('click', function (event) {
            const el = event.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action;
            if (!action) return;
            switch (action) {
                case 'open-new-project':
                    event.preventDefault();
                    openProjectModal();
                    break;
                case 'open-project':
                    event.preventDefault();
                    if (el.dataset.id) openProject(el.dataset.id);
                    break;
                case 'open-team':
                    event.preventDefault();
                    if (el.dataset.id) openTeamModal(el.dataset.id);
                    break;
                case 'edit-project':
                    event.preventDefault();
                    if (el.dataset.id) editProject(el.dataset.id);
                    break;
                case 'delete-project':
                    event.preventDefault();
                    if (el.dataset.id) deleteProject(el.dataset.id).catch(console.error);
                    break;
                case 'switch-view':
                    event.preventDefault();
                    if (el.dataset.view) switchView(el.dataset.view);
                    break;
                case 'export-project':
                    event.preventDefault();
                    if (el.dataset.id) exportProject(el.dataset.id);
                    break;
                case 'add-suite':
                    event.preventDefault();
                    if (el.dataset.project && el.dataset.suite) {
                        addSuiteToProject(el.dataset.project, el.dataset.suite)
                            .then(function (p) {
                                if (p && window.renderProjectDetail) window.renderProjectDetail(p);
                            })
                            .catch(function (e) {
                                console.error(e);
                                toast('Could not add suite', true);
                            });
                    }
                    break;
                case 'switch-suite':
                    event.preventDefault();
                    if (el.dataset.suite && window.switchSuite) window.switchSuite(el.dataset.suite);
                    break;
                case 'open-module':
                    event.preventDefault();
                    if (el.dataset.suite && el.dataset.module && window.openModule) {
                        window.openModule(el.dataset.suite, el.dataset.module);
                    }
                    break;
                case 'close-module':
                    event.preventDefault();
                    if (window.closeModuleModal) window.closeModuleModal();
                    break;
                case 'select-score':
                    event.preventDefault();
                    if (window.selectScore) window.selectScore(el.dataset.key, Number(el.dataset.score));
                    break;
                case 'calculate-score':
                    event.preventDefault();
                    if (window.calculateModuleScore) {
                        window.calculateModuleScore(el.dataset.suite, el.dataset.module);
                    }
                    break;
                case 'save-assessment':
                    event.preventDefault();
                    if (window.saveAssessment) window.saveAssessment(el.dataset.suite, el.dataset.module);
                    break;
                case 'save-findings':
                    event.preventDefault();
                    if (window.saveFindings) window.saveFindings(el.dataset.suite, el.dataset.module);
                    break;
                case 'upload-document':
                    event.preventDefault();
                    if (window.uploadDocument) window.uploadDocument(Number(el.dataset.idx));
                    break;
                case 'add-document-link':
                    event.preventDefault();
                    if (window.addDocumentLink) window.addDocumentLink(Number(el.dataset.idx));
                    break;
                case 'add-priority':
                    event.preventDefault();
                    if (window.addPriorityAction) window.addPriorityAction();
                    break;
                case 'assign-primary-service':
                    event.preventDefault();
                    if (window.assignPrimaryService) window.assignPrimaryService();
                    break;
                case 'update-deliverable-status':
                    event.preventDefault();
                    if (window.updateDeliverableStatus) {
                        window.updateDeliverableStatus(el.dataset.deliverableId);
                    }
                    break;
                case 'add-deliverable-update':
                    event.preventDefault();
                    if (window.addDeliverableUpdate) {
                        window.addDeliverableUpdate(el.dataset.deliverableId);
                    }
                    break;
                case 'update-plan-status':
                    event.preventDefault();
                    if (window.updatePlanStatus) window.updatePlanStatus(el.dataset.phaseId);
                    break;
                case 'add-plan-update':
                    event.preventDefault();
                    if (window.addPlanUpdate) window.addPlanUpdate(el.dataset.phaseId);
                    break;
                case 'add-engagement-person':
                    event.preventDefault();
                    if (window.addEngagementPerson) window.addEngagementPerson();
                    break;
                case 'edit-engagement-person':
                    event.preventDefault();
                    if (window.editEngagementPerson) window.editEngagementPerson(el.dataset.personId);
                    break;
                case 'delete-engagement-person':
                    event.preventDefault();
                    if (window.deleteEngagementPerson) window.deleteEngagementPerson(el.dataset.personId);
                    break;
                default:
                    break;
            }
        });
    }

    function bindUI() {
        if (uiReady) return;
        uiReady = true;
        populateServiceOptions();

        document.querySelectorAll('.tab-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const tab = btn.dataset.tab || 'login';
                document.querySelectorAll('.tab-btn').forEach(function (x) {
                    x.classList.remove('active');
                });
                btn.classList.add('active');
                if ($('loginForm')) $('loginForm').style.display = tab === 'login' ? 'grid' : 'none';
                if ($('registerForm')) $('registerForm').style.display = tab === 'register' ? 'grid' : 'none';
            });
        });
        if ($('loginForm')) $('loginForm').addEventListener('submit', function (e) {
            e.preventDefault();
            login();
        });
        if ($('registerForm')) $('registerForm').addEventListener('submit', function (e) {
            e.preventDefault();
            register();
        });
        if ($('forgotPasswordLink')) $('forgotPasswordLink').addEventListener('click', function (e) {
            e.preventDefault();
            forgotPassword();
        });
        if ($('logoutBtn')) $('logoutBtn').addEventListener('click', async function (e) {
            e.preventDefault();
            await auth.signOut();
            if ($('userDropdown')) $('userDropdown').style.display = 'none';
        });
        if ($('userMenuBtn')) $('userMenuBtn').addEventListener('click', function (e) {
            e.stopPropagation();
            if (!$('userDropdown')) return;
            $('userDropdown').style.display = $('userDropdown').style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', function () {
            if ($('userDropdown')) $('userDropdown').style.display = 'none';
        });

        document.querySelectorAll('.sidebar-link[data-view]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                switchView(el.dataset.view);
            });
        });
        document.querySelectorAll('.sidebar-link[data-suite]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                state.filters.suite = el.dataset.suite || 'all';
                if ($('suiteFilter')) $('suiteFilter').value = state.filters.suite;
                switchView('projects');
                renderProjects();
            });
        });
        if ($('statusFilter')) $('statusFilter').addEventListener('change', function (e) {
            state.filters.status = e.target.value || 'all';
            renderProjects();
        });
        if ($('suiteFilter')) $('suiteFilter').addEventListener('change', function (e) {
            state.filters.suite = e.target.value || 'all';
            renderProjects();
        });
        if ($('searchProjects')) $('searchProjects').addEventListener('input', function (e) {
            state.filters.query = e.target.value || '';
            renderProjects();
        });

        if ($('newProjectBtn')) $('newProjectBtn').addEventListener('click', openProjectModal);
        if ($('newProjectBtn2')) $('newProjectBtn2').addEventListener('click', openProjectModal);
        if ($('closeModal')) $('closeModal').addEventListener('click', closeProjectModal);
        if ($('cancelModal')) $('cancelModal').addEventListener('click', closeProjectModal);
        if ($('createProjectBtn')) $('createProjectBtn').addEventListener('click', function () {
            saveProject().catch(function (e) {
                console.error(e);
                toast('Could not save engagement', true);
            });
        });
        if ($('addTeamMemberBtn')) $('addTeamMemberBtn').addEventListener('click', function () {
            const email = window.prompt('Enter team member email');
            if (!email) return;
            const normalized = String(email).trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return toast('Enter a valid email', true);
            addTeamMemberChip(normalized, 'collaborator');
        });

        if ($('teamModalClose')) $('teamModalClose').addEventListener('click', closeTeamModal);
        if ($('teamModalCancel')) $('teamModalCancel').addEventListener('click', closeTeamModal);

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (closeTopPopupOnEscape()) e.preventDefault();
        });

        delegatedActions();
    }

    function expose() {
        window.showToast = toast;
        window.switchView = switchView;
        window.loadProjects = loadProjects;
        window.updateDashboard = updateDashboard;
        window.renderProjects = renderProjects;
        window.openProject = openProject;
        window.openEditProjectModal = editProject;
        window.openTeamModal = openTeamModal;
        window.deleteProject = deleteProject;
        window.addSuiteToProject = addSuiteToProject;
        window.refreshProject = refreshProject;
        window.exportProject = exportProject;
        window.handleProjectFormSubmit = saveProject;
        window._modules = window._modules || {};
        window._modules.projects = window._modules.projects || {};
        window._modules.team = window._modules.team || {};
        Object.assign(window._modules.projects, {
            loadProjects: loadProjects,
            addSuiteToProject: addSuiteToProject,
            deleteProject: deleteProject,
            refreshProject: refreshProject,
        });
        Object.assign(window._modules.team, {
            sendInvite: sendInvite,
        });
        window.appApi = {
            auth: auth,
            db: db,
            FieldValue: FieldValue,
            showToast: toast,
            openConfirmModal: confirmModal,
            switchView: switchView,
            openProject: openProject,
            addSuiteToProject: addSuiteToProject,
            refreshProject: refreshProject,
            loadProjects: loadProjects,
            getVisibleProjects: visibleProjects,
            normalizeProject: normalizeProject,
            toDate: toDate,
            getServiceCatalog: serviceCatalog,
            getServiceLabel: serviceLabel,
            buildDeliverablesForServices: buildDeliverablesForServices,
            mergeDeliverablesForServices: mergeDeliverablesForServices,
            buildBookProjectPlan: buildBookProjectPlan,
            makeId: makeId,
        };
    }

    async function initialize() {
        bindUI();
        expose();
        await maybeCompleteInviteSignIn();
        if (!auth || !db) {
            authError('Firebase services are not available.');
            console.error('Missing firebase services', window.firebaseServices);
            return;
        }
        auth.onAuthStateChanged(async function (user) {
            if (!user) {
                state.currentUser = null;
                showLogin();
                return;
            }
            state.currentUser = user;
            showApp();
            try {
                await loadUserData(user);
                switchView(state.currentView || 'dashboard');
                if ($('authError')) $('authError').style.display = 'none';
            } catch (e) {
                console.error(e);
                toast('Could not load user data', true);
            }
        });
        setTimeout(populateDebugPanel, 300);
    }

    initialize();
})();
