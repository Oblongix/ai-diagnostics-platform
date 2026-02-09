(function () {
    const services = window.firebaseServices || {};
    const auth = services.auth;
    const db = services.db;
    const isMockDataStore = !!(db && db._store);
    const firebaseCompat = isMockDataStore ? services.firebase || null : window.firebase || services.firebase || null;
    function getCompatAuth() {
        if (!firebaseCompat || !firebaseCompat.auth) return null;
        try {
            if (Array.isArray(firebaseCompat.apps) && firebaseCompat.apps.length === 0) return null;
            return firebaseCompat.auth();
        } catch (e) {
            return null;
        }
    }
    const FieldValue =
        services &&
        services.firebase &&
        services.firebase.firestore &&
        services.firebase.firestore.FieldValue
            ? services.firebase.firestore.FieldValue
            : firebaseCompat &&
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
        filters: { status: 'all', service: 'all', query: '' },
        ui: {
            showDeletedDashboardProjects: false,
            showDeletedProjects: false,
            showDeletedEngagementPeople: false,
        },
        maturity: {
            scores: {},
            dataReadinessScores: {},
            lastCalculatedAt: null,
        },
    };

    const maturityModelDimensions = [
        {
            id: 'strategyAlignment',
            title: 'Dimension 1: Strategy Alignment',
            definition: 'How well AI strategy is integrated with overall business strategy.',
            levels: [
                {
                    level: 1,
                    name: 'Emerging',
                    indicators: [
                        'No AI strategy exists beyond awareness.',
                        'Leadership reads about AI in media but has no formal strategy.',
                        'No dedicated budget or resources; scattered experiments without coordination.',
                    ],
                },
                {
                    level: 2,
                    name: 'Aware',
                    indicators: [
                        'AI vision documented but not integrated.',
                        'Some budget allocated (about 0.5-1% of IT spend).',
                        'AI not connected to P&L or core business priorities.',
                    ],
                },
                {
                    level: 3,
                    name: 'Investing',
                    indicators: [
                        'AI strategy aligned to 2-3 business priorities.',
                        'Executive owner assigned with quarterly strategy reviews.',
                        'Multi-year roadmap and budget typically around 1-3% of revenue.',
                    ],
                },
                {
                    level: 4,
                    name: 'Integrating',
                    indicators: [
                        'CEO personally champions AI transformation.',
                        'AI embedded in annual planning, budgeting, and board agenda.',
                        'AI is reshaping operating model and org structure (budget around 3-5% of revenue).',
                    ],
                },
                {
                    level: 5,
                    name: 'Transforming',
                    indicators: [
                        'AI and business strategy are effectively indistinguishable.',
                        'AI assumptions underpin strategic decisions with continuous adaptation.',
                        'Board includes AI expertise and market recognizes an AI competitive moat.',
                    ],
                },
            ],
        },
        {
            id: 'dataFoundation',
            title: 'Dimension 2: Data Foundation',
            definition: 'Quality, accessibility, and governance of organizational data assets.',
            levels: [
                {
                    level: 1,
                    name: 'Fragmented',
                    indicators: [
                        'Data is siloed, poor quality, and lacks governance.',
                        'Manual extraction is common; no catalog, lineage, or stewardship.',
                        'Data completeness typically below 60%.',
                    ],
                },
                {
                    level: 2,
                    name: 'Cataloged',
                    indicators: [
                        'Basic inventory and quality controls exist but are inconsistent.',
                        'Data catalog and governance policies exist but may be incomplete.',
                        'Data quality typically 60-75% with limited business ownership.',
                    ],
                },
                {
                    level: 3,
                    name: 'Managed',
                    indicators: [
                        'Master data management operational for critical domains.',
                        'Data quality above 80% for priority datasets with API access to key systems.',
                        'Governance board active with ownership assigned.',
                    ],
                },
                {
                    level: 4,
                    name: 'Unified',
                    indicators: [
                        'Enterprise data platform with comprehensive governance.',
                        'Data quality above 90% and automated cataloging.',
                        'Real-time access available where needed with broad self-service analytics.',
                    ],
                },
                {
                    level: 5,
                    name: 'Optimized',
                    indicators: [
                        'Domain-oriented data ownership and data products with SLAs.',
                        'Real-time pipelines and automated data quality monitoring are standard.',
                        'Federated computational governance with AI-powered data quality.',
                    ],
                },
            ],
        },
        {
            id: 'technologyInfrastructure',
            title: 'Dimension 3: Technology Infrastructure',
            definition: 'Readiness of core technology stack for production AI at scale.',
            levels: [
                {
                    level: 1,
                    name: 'Legacy',
                    indicators: [
                        'Legacy systems, manual processes, and no cloud foundation.',
                        'On-prem data centers and waterfall delivery dominate.',
                        'No ML platform capability.',
                    ],
                },
                {
                    level: 2,
                    name: 'Hybridizing',
                    indicators: [
                        'Cloud migration has started with partial automation.',
                        'Hybrid cloud and basic APIs exist.',
                        'Only pilot ML models are in play.',
                    ],
                },
                {
                    level: 3,
                    name: 'Operationalizing',
                    indicators: [
                        'Modern cloud architecture with MLOps in place.',
                        'Multi-cloud strategy and production ML footprint (about 5-20 models).',
                        'Operational controls are repeatable.',
                    ],
                },
                {
                    level: 4,
                    name: 'Cloud Native',
                    indicators: [
                        'Cloud-native stack with automated ML pipelines.',
                        'Kubernetes-based infrastructure and real-time inference at scale (100+ models).',
                        'Delivery and operations are highly automated.',
                    ],
                },
                {
                    level: 5,
                    name: 'Agentic Ready',
                    indicators: [
                        'Event-driven microservices architecture with agentic AI platform capability.',
                        'Continuous deployment norms support very large model estates (500+ models).',
                        'Platform supports rapid experimentation and release.',
                    ],
                },
            ],
        },
        {
            id: 'talentCapability',
            title: 'Dimension 4: Talent and Capability',
            definition: 'Depth and distribution of internal AI skills and execution capability.',
            levels: [
                {
                    level: 1,
                    name: 'Vendor Reliant',
                    indicators: [
                        'No internal AI talent and near-total vendor dependence.',
                        '0 data scientists and outsourced delivery.',
                        'IT primarily manages vendors.',
                    ],
                },
                {
                    level: 2,
                    name: 'Nascent',
                    indicators: [
                        'Early capability with 1-2 data scientists.',
                        'Limited ML engineering and heavy outsourcing (80%+).',
                        'Internal capability is fragile.',
                    ],
                },
                {
                    level: 3,
                    name: 'Growing Team',
                    indicators: [
                        'AI team of about 5-15 people.',
                        'Mix of internal and external delivery (roughly 50/50).',
                        'Internal project capability is building.',
                    ],
                },
                {
                    level: 4,
                    name: 'Center of Excellence',
                    indicators: [
                        'AI team of about 15-50 people with mostly internal development.',
                        'Strong talent retention (above 85%).',
                        'Shared standards and reusable practices are established.',
                    ],
                },
                {
                    level: 5,
                    name: 'Distributed Capability',
                    indicators: [
                        '50+ AI professionals with broad organizational distribution.',
                        'Strong employer brand as an AI talent magnet.',
                        'Low attrition (below 10%) and resilient bench strength.',
                    ],
                },
            ],
        },
        {
            id: 'governanceRisk',
            title: 'Dimension 5: Governance and Risk Management',
            definition: 'Ability to govern AI safely with enforceable controls and risk oversight.',
            levels: [
                {
                    level: 1,
                    name: 'No Governance',
                    indicators: [
                        'No AI governance framework or formal policies.',
                        'Risk management is ad hoc with no oversight board.',
                        'Controls are reactive and inconsistent.',
                    ],
                },
                {
                    level: 2,
                    name: 'Documented',
                    indicators: [
                        'Basic policies and guidelines are documented.',
                        'Risk awareness exists, but enforcement is weak.',
                        'Governance structure is not yet operational.',
                    ],
                },
                {
                    level: 3,
                    name: 'Operational Board',
                    indicators: [
                        'Governance board running regular reviews (typically quarterly).',
                        'Risk classification framework in place with early controls.',
                        'Oversight processes are repeatable.',
                    ],
                },
                {
                    level: 4,
                    name: 'Comprehensive Controls',
                    indicators: [
                        'Automated compliance checks and proven incident response capability.',
                        'Governance reviews move to monthly cadence.',
                        'Controls cover major model lifecycle risks.',
                    ],
                },
                {
                    level: 5,
                    name: 'Real-Time Governance',
                    indicators: [
                        'Risk-based real-time monitoring and automated control enforcement.',
                        'Governance is continuous rather than periodic.',
                        'Practices benchmark as industry-leading.',
                    ],
                },
            ],
        },
        {
            id: 'cultureChangeCapacity',
            title: 'Dimension 6: Culture and Change Capacity',
            definition: 'Organizational willingness and capacity to adapt ways of working for AI.',
            levels: [
                {
                    level: 1,
                    name: 'Resistant',
                    indicators: [
                        'Risk-averse culture with low tolerance for experimentation.',
                        'Functions are siloed and delivery mindset is waterfall.',
                        'Change initiatives struggle to gain traction.',
                    ],
                },
                {
                    level: 2,
                    name: 'Pockets of Innovation',
                    indicators: [
                        'Innovation exists in pockets with mixed agile adoption.',
                        'Some cross-functional collaboration appears, but inconsistently.',
                        'Experimentation remains limited.',
                    ],
                },
                {
                    level: 3,
                    name: 'Data-Driven Emerging',
                    indicators: [
                        'Protected innovation spaces are active.',
                        'Cross-functional teams are forming and agile is becoming standard.',
                        'Decision-making increasingly uses data.',
                    ],
                },
                {
                    level: 4,
                    name: 'Experimentation Culture',
                    indicators: [
                        'Rapid learning cycles with psychological safety for iteration.',
                        'DevOps and MLOps are standard operating practice.',
                        'Change adoption is faster and more reliable.',
                    ],
                },
                {
                    level: 5,
                    name: 'Innovation Embedded',
                    indicators: [
                        'Continuous learning and high-trust collaboration are cultural norms.',
                        'Autonomous teams execute with strong alignment.',
                        'Innovation behavior is embedded, not event-driven.',
                    ],
                },
            ],
        },
        {
            id: 'operatingModel',
            title: 'Dimension 7: Operating Model',
            definition: 'How work, decision rights, and delivery structures support AI value creation.',
            levels: [
                {
                    level: 1,
                    name: 'Siloed IT-Led',
                    indicators: [
                        'Functional hierarchy with IT-led technology ownership.',
                        'Delivery is project-based and waterfall-heavy.',
                        'Business ownership is limited.',
                    ],
                },
                {
                    level: 2,
                    name: 'Project-Based AI',
                    indicators: [
                        'Some collaboration across functions with pilot-oriented AI work.',
                        'Early agile adoption underway.',
                        'Operating model remains largely temporary and project-driven.',
                    ],
                },
                {
                    level: 3,
                    name: 'Center of Excellence',
                    indicators: [
                        'AI Center of Excellence in place with product teams emerging.',
                        'Agile is standard and some value streams are defined.',
                        'Operating model begins to scale repeatability.',
                    ],
                },
                {
                    level: 4,
                    name: 'Hub and Spoke',
                    indicators: [
                        'Value-stream oriented organization with business-led AI ownership.',
                        'DevOps and MLOps embedded in delivery.',
                        'Shared enablement with domain execution.',
                    ],
                },
                {
                    level: 5,
                    name: 'Federated Platform',
                    indicators: [
                        'Federated model with autonomous teams and self-service AI platform.',
                        'AI-first operating norms across business units.',
                        'Execution scales through platform leverage, not central bottlenecks.',
                    ],
                },
            ],
        },
    ];

    const maturityScoreBands = [
        {
            min: 7,
            max: 14,
            level: 'Emerging',
            strategy: 'Build foundations before transformation',
            timeline: '12-18 months',
            focusAreas: [
                'Data quality improvement',
                'Cloud migration',
                'Talent recruitment',
                'Basic governance',
                'Cultural groundwork',
            ],
        },
        {
            min: 15,
            max: 21,
            level: 'Developing',
            strategy: 'Begin with 1-2 pilot workflows',
            timeline: '6-12 months to production',
            focusAreas: [
                'Select low-risk pilots',
                'Prove value',
                'Build capability',
                'Establish governance',
                'Demonstrate wins',
            ],
        },
        {
            min: 22,
            max: 28,
            level: 'Scaling',
            strategy: 'Scale proven use cases',
            timeline: '3-5 workflows simultaneously',
            focusAreas: [
                'Expand successful pilots',
                'Standardize approaches',
                'Grow team',
                'Strengthen governance',
                'Measure rigorously',
            ],
        },
        {
            min: 29,
            max: 35,
            level: 'Transformational',
            strategy: 'Optimize and explore advanced AI',
            timeline: '10+ production systems',
            focusAreas: [
                'Continuous optimization',
                'Agentic AI exploration',
                'Platform approach',
                'Industry leadership',
                'Competitive moat',
            ],
        },
    ];

    const dataReadinessDimensions = [
        {
            id: 'completeness',
            name: 'Completeness',
            definition: '% of required data fields populated',
            measure: 'Check 100-record sample and calculate % with all required fields.',
        },
        {
            id: 'accuracy',
            name: 'Accuracy',
            definition: '% of records correct vs source of truth',
            measure: 'Manual validation of 100-record sample against authoritative source.',
        },
        {
            id: 'freshness',
            name: 'Freshness',
            definition: 'How current the data is',
            measure: 'Check timestamp of last update vs current time.',
        },
        {
            id: 'consistency',
            name: 'Consistency',
            definition: 'Agreement across source systems',
            measure: 'Compare same entity across 2-3 systems and quantify disagreement rate.',
        },
        {
            id: 'accessibility',
            name: 'Accessibility',
            definition: 'AI systems access latency and reliability',
            measure: 'Test API response time under realistic load.',
        },
    ];
    const formState = { mode: 'create', editingId: null };
    let uiReady = false;

    window.appState = state;

    function $(id) {
        return document.getElementById(id);
    }
    function isLocalEnvironment() {
        const host = String((window.location && window.location.hostname) || '').toLowerCase();
        return (
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host.endsWith('.local') ||
            host.startsWith('192.168.') ||
            host.startsWith('10.') ||
            host.startsWith('172.')
        );
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
    function isProjectDeleted(project) {
        if (!project) return false;
        if (project.deleted === true) return true;
        return String(project.status || '').toLowerCase() === 'deleted';
    }
    function visibleProjects(opts) {
        const includeDeleted = !!(opts && opts.includeDeleted);
        return state.projects.filter(function (p) {
            return includeDeleted || !isProjectDeleted(p);
        });
    }
    function filteredProjects() {
        const q = String(state.filters.query || '').trim().toLowerCase();
        return visibleProjects({ includeDeleted: state.ui.showDeletedProjects }).filter(function (p) {
            if (state.filters.status !== 'all' && (p.status || 'active') !== state.filters.status)
                return false;
            if (state.filters.service !== 'all' && String(p.primaryService || '') !== state.filters.service)
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
        if (view === 'maturity') renderMaturityModel();
    }
    function getShowDeletedEngagementPeople() {
        return !!(state.ui && state.ui.showDeletedEngagementPeople);
    }
    function setShowDeletedEngagementPeople(value) {
        if (!state.ui) state.ui = {};
        state.ui.showDeletedEngagementPeople = !!value;
    }

    function emptyState(message) {
        return (
            '<div class="empty-state"><h4>No projects found</h4><p>' +
            escapeHtml(message) +
            '</p><button class="btn-primary" data-action="open-new-project">Create Project</button></div>'
        );
    }

    function projectCard(p) {
        const isDeleted = isProjectDeleted(p);
        const service = p.primaryService
            ? '<span class="badge">' + escapeHtml(serviceLabel(p.primaryService)) + '</span>'
            : '<span class="badge">Service not assigned</span>';
        const deletedBadge = isDeleted ? '<span class="badge badge-deleted">Deleted</span>' : '';
        const actions = isDeleted
            ? '<span class="small">Deleted project</span>'
            : '<button class="btn-secondary" data-action="open-team" data-id="' +
              escapeHtml(p.id) +
              '">Team</button><button class="btn-secondary" data-action="edit-project" data-id="' +
              escapeHtml(p.id) +
              '">Edit</button><button class="btn-danger" data-action="delete-project" data-id="' +
              escapeHtml(p.id) +
              '">Delete</button>';
        const progress = Math.max(0, Math.min(100, Number(p.progress) || 0));
        return (
            '<article class="project-card ' +
            (isDeleted ? 'deleted-item' : '') +
            '" data-action="open-project" data-id="' +
            escapeHtml(p.id) +
            '"><h4>' +
            escapeHtml(p.clientName || p.id) +
            '</h4><div class="project-meta">' +
            escapeHtml(p.industry || 'Industry not set') +
            ' • Updated ' +
            escapeHtml(relDate(p.updatedAt)) +
            '</div><div class="badges">' +
            service +
            deletedBadge +
            '</div><div class="progress-wrap"><div class="progress-head"><span>Progress</span><span>' +
            progress +
            '%</span></div><div class="progress-bar"><div class="progress-fill" style="width:' +
            progress +
            '%"></div></div></div><div class="project-actions">' +
            actions +
            '</div></article>'
        );
    }

    function projectRow(p) {
        const isDeleted = isProjectDeleted(p);
        const serviceText = p.primaryService
            ? serviceLabel(p.primaryService)
            : 'Service not assigned';
        const rowStatus = isDeleted
            ? '<span class="status deleted">deleted</span>'
            : '<span class="status ' + escapeHtml(p.status || 'active') + '">' + escapeHtml(p.status || 'active') + '</span>';
        const rowActions = isDeleted
            ? '<span class="small">Deleted project</span>'
            : '<button class="btn-secondary" data-action="open-team" data-id="' +
              escapeHtml(p.id) +
              '">Team</button><button class="btn-secondary" data-action="edit-project" data-id="' +
              escapeHtml(p.id) +
              '">Edit</button><button class="btn-danger" data-action="delete-project" data-id="' +
              escapeHtml(p.id) +
              '">Delete</button>';
        return (
            '<article class="project-list-item ' +
            (isDeleted ? 'deleted-item' : '') +
            '" data-id="' +
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
            '</div></div><div class="project-actions">' +
            rowStatus +
            rowActions +
            '</div></article>'
        );
    }

    function renderRecentProjects() {
        if (!$('recentProjects')) return;
        const list = visibleProjects({ includeDeleted: state.ui.showDeletedDashboardProjects })
            .slice()
            .sort(function (a, b) {
                return toDate(b.updatedAt) - toDate(a.updatedAt);
            })
            .slice(0, 6);
        $('recentProjects').innerHTML = list.length
            ? list.map(projectCard).join('')
            : emptyState('Create your first diagnostic project.');
    }

    function renderProjects() {
        if (!$('projectsList')) return;
        const list = filteredProjects();
        if ($('projectsCount')) {
            const total = visibleProjects({ includeDeleted: state.ui.showDeletedProjects }).length;
            $('projectsCount').textContent =
                list.length + ' of ' + total + ' projects shown';
        }
        $('projectsList').innerHTML = list.length
            ? list.map(projectRow).join('')
            : emptyState('Adjust filters or create a new project.');
    }

    function updateDashboard() {
        const projects = visibleProjects();
        const active = projects.filter(function (p) {
            return (p.status || 'active') === 'active';
        }).length;
        const completed = projects.filter(function (p) {
            return (p.status || '').toLowerCase() === 'completed';
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
        if ($('completedProjects')) $('completedProjects').textContent = String(completed);
        if ($('totalHours')) $('totalHours').textContent = String(hours);
        if ($('teamSize')) $('teamSize').textContent = String(Math.max(1, members.size));
        if ($('avgCompletion')) $('avgCompletion').textContent = avg + '%';
        renderRecentProjects();
    }

    function ensureMaturityState() {
        if (!state.maturity) state.maturity = { scores: {}, dataReadinessScores: {}, lastCalculatedAt: null };
        if (!state.maturity.scores) state.maturity.scores = {};
        if (!state.maturity.dataReadinessScores) state.maturity.dataReadinessScores = {};
        maturityModelDimensions.forEach(function (dimension) {
            if (typeof state.maturity.scores[dimension.id] === 'undefined') {
                state.maturity.scores[dimension.id] = '';
            }
        });
        dataReadinessDimensions.forEach(function (dimension) {
            if (typeof state.maturity.dataReadinessScores[dimension.id] === 'undefined') {
                state.maturity.dataReadinessScores[dimension.id] = '';
            }
        });
    }

    function maturityLevelMeta(dimensionId, level) {
        const dimension = maturityModelDimensions.find(function (d) {
            return d.id === dimensionId;
        });
        if (!dimension) return null;
        return (dimension.levels || []).find(function (x) {
            return Number(x.level) === Number(level);
        }) || null;
    }

    function allMaturityDimensionsScored() {
        return maturityModelDimensions.every(function (dimension) {
            const value = Number(state.maturity.scores[dimension.id]);
            return value >= 1 && value <= 5;
        });
    }

    function maturityTotalScore() {
        return maturityModelDimensions.reduce(function (sum, dimension) {
            return sum + Number(state.maturity.scores[dimension.id] || 0);
        }, 0);
    }

    function maturityBandForScore(score) {
        return (
            maturityScoreBands.find(function (band) {
                return score >= band.min && score <= band.max;
            }) || null
        );
    }

    function allDataReadinessScored() {
        return dataReadinessDimensions.every(function (dimension) {
            const value = Number(state.maturity.dataReadinessScores[dimension.id]);
            return value >= 1 && value <= 5;
        });
    }

    function dataReadinessAverage() {
        if (!allDataReadinessScored()) return null;
        const total = dataReadinessDimensions.reduce(function (sum, dimension) {
            return sum + Number(state.maturity.dataReadinessScores[dimension.id] || 0);
        }, 0);
        return Number((total / dataReadinessDimensions.length).toFixed(2));
    }

    function dataReadinessInterpretation(avg) {
        if (!Number.isFinite(avg)) return null;
        if (avg >= 4) {
            return {
                label: 'Data ready for AI use',
                guidance: 'Proceed with confidence while maintaining quality controls.',
            };
        }
        if (avg >= 3) {
            return {
                label: 'Usable with remediation',
                guidance: 'Plan a focused 3-6 month improvement plan before scaling.',
            };
        }
        if (avg >= 2) {
            return {
                label: 'Significant gaps',
                guidance: 'Plan a 6-12 month data quality program before broad rollout.',
            };
        }
        return {
            label: 'Not viable yet',
            guidance: 'Requires major data transformation (typically 12-24 months).',
        };
    }

    function buildMaturityReportHtml() {
        const complete = allMaturityDimensionsScored();
        const dataReadyAvg = dataReadinessAverage();
        const dataReadiness = dataReadinessInterpretation(dataReadyAvg);

        if (!complete) {
            const remaining = maturityModelDimensions
                .filter(function (dimension) {
                    const value = Number(state.maturity.scores[dimension.id]);
                    return !(value >= 1 && value <= 5);
                })
                .map(function (dimension) {
                    return '<li>' + escapeHtml(dimension.title) + '</li>';
                })
                .join('');
            return (
                '<article class="maturity-report-panel"><h3>Assessment Report</h3><p class="muted">Score all seven dimensions to generate a full report.</p><ul class="maturity-mini-list">' +
                remaining +
                '</ul></article>'
            );
        }

        const total = maturityTotalScore();
        const band = maturityBandForScore(total);
        const rows = maturityModelDimensions
            .map(function (dimension) {
                const score = Number(state.maturity.scores[dimension.id] || 0);
                const meta = maturityLevelMeta(dimension.id, score);
                return (
                    '<tr><td>' +
                    escapeHtml(dimension.title.replace('Dimension ', '').replace(': ', ' - ')) +
                    '</td><td>' +
                    score +
                    '</td><td>' +
                    escapeHtml((meta && meta.name) || 'Level ' + score) +
                    '</td></tr>'
                );
            })
            .join('');

        const focusList = band
            ? band.focusAreas
                  .map(function (item) {
                      return '<li>' + escapeHtml(item) + '</li>';
                  })
                  .join('')
            : '';

        const highScoreWarning =
            total > 25
                ? "<p class='maturity-warning'>Critical: score above 25. Validate with external assessment because internal scoring often trends optimistic.</p>"
                : '';

        const dataReadinessBlock = Number.isFinite(dataReadyAvg)
            ? '<div class="maturity-data-readiness"><h4>Data Readiness Deep Dive</h4><p><strong>Average score:</strong> ' +
              dataReadyAvg +
              ' / 5.0</p><p><strong>Interpretation:</strong> ' +
              escapeHtml(dataReadiness.label) +
              '</p><p class="small">' +
              escapeHtml(dataReadiness.guidance) +
              '</p></div>'
            : "<div class='maturity-data-readiness'><h4>Data Readiness Deep Dive</h4><p class='small'>Optional section not fully scored yet.</p></div>";

        return (
            '<article class="maturity-report-panel"><h3>Assessment Report</h3><div class="maturity-report-summary"><div><span class="muted">Total Score</span><div class="maturity-total">' +
            total +
            ' / 35</div></div><div><span class="muted">Readiness Level</span><div class="maturity-band">' +
            escapeHtml((band && band.level) || 'Unclassified') +
            '</div></div><div><span class="muted">Timeline</span><div>' +
            escapeHtml((band && band.timeline) || 'N/A') +
            '</div></div></div><p><strong>Strategy:</strong> ' +
            escapeHtml((band && band.strategy) || 'N/A') +
            '</p><table class="maturity-score-table"><thead><tr><th>Dimension</th><th>Score</th><th>Level</th></tr></thead><tbody>' +
            rows +
            '</tbody></table><h4>Recommended Focus Areas</h4><ul class="maturity-mini-list">' +
            focusList +
            '</ul>' +
            highScoreWarning +
            "<p class='small'>Conservative scoring rule: if between levels, choose the lower level to avoid overestimation.</p>" +
            dataReadinessBlock +
            '</article>'
        );
    }

    function refreshMaturityReport() {
        const target = $('maturityReport');
        if (!target) return;
        target.innerHTML = buildMaturityReportHtml();
    }

    function renderMaturityModel() {
        ensureMaturityState();
        const target = $('maturityView');
        if (!target) return;

        target.innerHTML =
            '<div class="page-header"><div><h2>Maturity Model</h2><p class="muted">Assess readiness across seven enterprise dimensions and generate a leadership report.</p></div><div class="project-actions"><button id="maturityResetBtn" class="btn-secondary" type="button">Reset</button><button id="maturityGenerateBtn" class="btn-primary" type="button">Generate Report</button></div></div><div class="maturity-grid">' +
            maturityModelDimensions
                .map(function (dimension) {
                    const current = Number(state.maturity.scores[dimension.id] || 0);
                    const options = ['<option value="">Select level</option>']
                        .concat(
                            dimension.levels.map(function (level) {
                                return (
                                    '<option value="' +
                                    level.level +
                                    '" ' +
                                    (Number(current) === Number(level.level) ? 'selected' : '') +
                                    '>Level ' +
                                    level.level +
                                    ' - ' +
                                    escapeHtml(level.name) +
                                    '</option>'
                                );
                            })
                        )
                        .join('');
                    const levelsHtml = dimension.levels
                        .map(function (level) {
                            return (
                                '<div class="maturity-level"><h5>Level ' +
                                level.level +
                                ' - ' +
                                escapeHtml(level.name) +
                                '</h5><ul class="maturity-mini-list">' +
                                level.indicators
                                    .map(function (indicator) {
                                        return '<li>' + escapeHtml(indicator) + '</li>';
                                    })
                                    .join('') +
                                '</ul></div>'
                            );
                        })
                        .join('');
                    return (
                        '<article class="maturity-dimension-card"><h3>' +
                        escapeHtml(dimension.title) +
                        '</h3><p class="small">' +
                        escapeHtml(dimension.definition) +
                        '</p><label>Score</label><select class="maturity-score-select" data-dimension-id="' +
                        escapeHtml(dimension.id) +
                        '">' +
                        options +
                        '</select><div class="maturity-level-grid">' +
                        levelsHtml +
                        '</div></article>'
                    );
                })
                .join('') +
            '</div><article class="maturity-deep-dive"><h3>Section 1.3: Data Readiness Deep Dive (Optional)</h3><p class="small">Score each criterion from 1-5 based on current data readiness for priority AI workflows.</p><div class="maturity-deep-grid">' +
            dataReadinessDimensions
                .map(function (dimension) {
                    const current = Number(state.maturity.dataReadinessScores[dimension.id] || 0);
                    return (
                        '<div class="maturity-data-card"><h4>' +
                        escapeHtml(dimension.name) +
                        '</h4><p class="small">' +
                        escapeHtml(dimension.definition) +
                        '</p><label>Score</label><select class="data-readiness-score-select" data-readiness-id="' +
                        escapeHtml(dimension.id) +
                        '"><option value="">Select level</option><option value="1" ' +
                        (current === 1 ? 'selected' : '') +
                        '>1</option><option value="2" ' +
                        (current === 2 ? 'selected' : '') +
                        '>2</option><option value="3" ' +
                        (current === 3 ? 'selected' : '') +
                        '>3</option><option value="4" ' +
                        (current === 4 ? 'selected' : '') +
                        '>4</option><option value="5" ' +
                        (current === 5 ? 'selected' : '') +
                        '>5</option></select><p class="small">' +
                        escapeHtml(dimension.measure) +
                        '</p></div>'
                    );
                })
                .join('') +
            '</div></article><section id="maturityReport"></section>';

        document.querySelectorAll('.maturity-score-select').forEach(function (select) {
            select.addEventListener('change', function (e) {
                const dimensionId = String(e.target.dataset.dimensionId || '');
                const value = e.target.value ? Number(e.target.value) : '';
                state.maturity.scores[dimensionId] = value;
                refreshMaturityReport();
            });
        });
        document.querySelectorAll('.data-readiness-score-select').forEach(function (select) {
            select.addEventListener('change', function (e) {
                const readinessId = String(e.target.dataset.readinessId || '');
                const value = e.target.value ? Number(e.target.value) : '';
                state.maturity.dataReadinessScores[readinessId] = value;
                refreshMaturityReport();
            });
        });
        if ($('maturityResetBtn')) {
            $('maturityResetBtn').addEventListener('click', function () {
                maturityModelDimensions.forEach(function (dimension) {
                    state.maturity.scores[dimension.id] = '';
                });
                dataReadinessDimensions.forEach(function (dimension) {
                    state.maturity.dataReadinessScores[dimension.id] = '';
                });
                state.maturity.lastCalculatedAt = null;
                renderMaturityModel();
            });
        }
        if ($('maturityGenerateBtn')) {
            $('maturityGenerateBtn').addEventListener('click', function () {
                if (!allMaturityDimensionsScored()) {
                    toast('Score all seven dimensions to generate the report', true);
                } else {
                    state.maturity.lastCalculatedAt = Date.now();
                }
                refreshMaturityReport();
            });
        }

        refreshMaturityReport();
    }

    function assessmentScaffold() {
        const all = window.diagnosticData || {};
        const out = {};
        Object.keys(all).forEach(function (suiteKey) {
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
        if (title) title.textContent = edit ? 'Edit Project' : 'Create New Project';
        if ($('createProjectBtn')) $('createProjectBtn').textContent = edit ? 'Save Changes' : 'Create Project';
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
    function populateServiceFilterOptions() {
        const select = $('serviceFilter');
        if (!select) return;
        const selected = select.value || 'all';
        const catalog = serviceCatalog();
        const keys = Object.keys(catalog);
        select.innerHTML = '<option value="all">All Services</option>';
        keys.forEach(function (key) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = catalog[key].name || key;
            select.appendChild(option);
        });
        select.value = keys.includes(selected) || selected === 'all' ? selected : 'all';
    }
    function populateSidebarServices() {
        const wrap = $('sidebarServices');
        if (!wrap) return;
        const catalog = serviceCatalog();
        const groupOrder = [
            { id: 'advisory', label: 'Advisory' },
            { id: 'consulting', label: 'Consulting' },
            { id: 'speaking', label: 'Speaking' },
            { id: 'workshops-education', label: 'Workshops and Education' },
        ];
        const groups = {
            advisory: [],
            consulting: [],
            speaking: [],
            'workshops-education': [],
        };

        function groupForCategory(category) {
            const c = String(category || '').toLowerCase();
            if (c === 'advisory') return 'advisory';
            if (c === 'consulting' || c === 'platform') return 'consulting';
            if (c === 'speaking') return 'speaking';
            if (c === 'workshops' || c === 'training') return 'workshops-education';
            return 'consulting';
        }

        Object.keys(catalog).forEach(function (key) {
            const service = catalog[key] || {};
            const bucket = groupForCategory(service.category);
            groups[bucket].push({
                id: key,
                name: service.name || key,
            });
        });

        wrap.innerHTML = '';
        groupOrder.forEach(function (group) {
            const items = (groups[group.id] || []).slice().sort(function (a, b) {
                return String(a.name).localeCompare(String(b.name));
            });
            if (!items.length) return;

            const label = document.createElement('div');
            label.className = 'sidebar-label';
            label.textContent = group.label;
            wrap.appendChild(label);

            items.forEach(function (item) {
                const link = document.createElement('a');
                link.href = '#';
                link.className = 'sidebar-link';
                link.dataset.service = item.id;
                link.textContent = item.name;
                wrap.appendChild(link);
            });
        });
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
        if ($('teamMemberEmailInput')) $('teamMemberEmailInput').value = '';
        if ($('teamMemberRoleInput')) $('teamMemberRoleInput').value = 'collaborator';
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
        if ($('clientName')) $('clientName').focus();
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
        if (!project) return toast('Project not found', true);
        setFormMode('edit');
        formState.editingId = projectId;
        if ($('clientName')) $('clientName').value = project.clientName || '';
        if ($('clientIndustry')) $('clientIndustry').value = project.industry || '';
        if ($('companySize')) $('companySize').value = project.companySize || '';
        if ($('annualRevenue')) $('annualRevenue').value = project.revenue || '';
        if ($('primaryService')) $('primaryService').value = project.primaryService || '';
        if ($('projectDescription')) $('projectDescription').value = project.description || '';
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
            const compatAuth = getCompatAuth();
            if (compatAuth && compatAuth.sendSignInLinkToEmail) {
                await compatAuth.sendSignInLinkToEmail(normalized, {
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
        const isEdit = formState.mode === 'edit' && !!formState.editingId;
        if (!clientName) {
            return toast('Enter client name', true);
        }
        if (!isEdit && !primaryService) {
            return toast('Select a primary service for this project', true);
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
            return toast('Project updated');
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
            assessments: assessmentScaffold(),
        };
        const ref = await db.collection('projects').add(data);
        for (const member of teamFromModal) {
            await sendInvite(ref.id, member.email, member.role).catch(function () {});
        }
        closeProjectModal();
        clearProjectForm();
        await loadProjects(uid);
        toast('Project created');
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

    async function deleteProject(projectId) {
        const ok = await confirmModal({
            title: 'Delete project',
            message: 'This will mark the project as deleted for all members.',
            confirmText: 'Delete project',
        });
        if (!ok) return;
        const ref = db.collection('projects').doc(projectId);
        const snap = await ref.get();
        if (!snap.exists) return toast('Project not found', true);
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
        toast('Project marked deleted');
    }

    function exportProject(projectId) {
        const p = state.projects.find(function (x) {
            return x.id === projectId;
        });
        if (!p) return toast('Project not found', true);
        const blob = new Blob(
            [JSON.stringify({ exportedAt: new Date().toISOString(), project: p }, null, 2)],
            { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const base = String(p.clientName || 'project').replace(/[^a-z0-9_-]/gi, '-');
        a.href = url;
        a.download = base + '-' + p.id + '-report.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function openProject(projectId) {
        const p = state.projects.find(function (x) {
            return x.id === projectId;
        });
        if (!p) return toast('Project not found', true);
        if (
            isProjectDeleted(p) &&
            !state.ui.showDeletedProjects &&
            !state.ui.showDeletedDashboardProjects
        ) {
            return toast('Deleted projects are hidden. Enable Show Deleted to view.', true);
        }
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
        const memberCount = Array.isArray(project.teamMembers) ? project.teamMembers.length : 0;
        container.innerHTML =
            '<section class="team-workspace">' +
            '<div class="team-head"><div><h4>Team - ' +
            escapeHtml(project.clientName || project.id) +
            "</h4><p class='muted'>Invite members and manage project roles.</p></div><span class='badge'>" +
            escapeHtml(String(memberCount)) +
            " members</span></div>" +
            '<div class="team-invite-grid">' +
            "<div><label>Email</label><input id='inviteEmail' type='email' placeholder='consultant@example.com' /></div>" +
            "<div><label>Role</label><select id='inviteRole'><option value='collaborator'>Collaborator</option><option value='consultant'>Consultant</option><option value='lead'>Lead</option></select></div>" +
            "<div class='team-invite-action'><button id='sendInviteBtn' class='btn-primary' type='button'>Send Invite</button></div>" +
            "</div><div id='teamList'></div><div id='pendingInvites'></div></section>";

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
            $('teamList').innerHTML =
                '<h4 class="section-subtitle">Current Team</h4>' +
                users
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
                        message: 'Remove this user from the project?',
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
                    $('pendingInvites').innerHTML =
                        "<h4 class='section-subtitle'>Pending Invites</h4><p class='muted'>No pending invites.</p>";
                } else {
                    $('pendingInvites').innerHTML =
                        "<h4 class='section-subtitle'>Pending Invites</h4>" +
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
        if (!project) return toast('Project not found', true);
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
        if (
            !isLocalEnvironment() ||
            !$('debugPanel') ||
            !$('debugUsers') ||
            !db ||
            !db._store ||
            !db._store.users
        )
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
        const compatAuth = getCompatAuth();
        if (
            !compatAuth ||
            !compatAuth.isSignInWithEmailLink ||
            !compatAuth.isSignInWithEmailLink(window.location.href)
        )
            return;
        let email = window.localStorage.getItem('lastInviteEmail');
        if (!email) email = window.prompt('Enter your email to complete invite sign-in');
        if (!email) return;
        try {
            const cred = await compatAuth.signInWithEmailLink(email, window.location.href);
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
                case 'open-module':
                    event.preventDefault();
                    if (window.openModule) {
                        const moduleKey = el.dataset.moduleKey || '';
                        if (moduleKey) window.openModule(moduleKey);
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
                        const moduleKey = el.dataset.moduleKey || '';
                        if (moduleKey) window.calculateModuleScore(moduleKey);
                    }
                    break;
                case 'save-assessment':
                    event.preventDefault();
                    if (window.saveAssessment) {
                        const moduleKey = el.dataset.moduleKey || '';
                        if (moduleKey) window.saveAssessment(moduleKey);
                    }
                    break;
                case 'save-findings':
                    event.preventDefault();
                    if (window.saveFindings) {
                        const moduleKey = el.dataset.moduleKey || '';
                        if (moduleKey) window.saveFindings(moduleKey);
                    }
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
        populateServiceFilterOptions();
        populateSidebarServices();

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
        document.querySelectorAll('.sidebar-link[data-service]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                state.filters.service = el.dataset.service || 'all';
                if ($('serviceFilter')) $('serviceFilter').value = state.filters.service;
                switchView('projects');
                renderProjects();
            });
        });
        if ($('statusFilter')) $('statusFilter').addEventListener('change', function (e) {
            state.filters.status = e.target.value || 'all';
            renderProjects();
        });
        if ($('serviceFilter')) $('serviceFilter').addEventListener('change', function (e) {
            state.filters.service = e.target.value || 'all';
            renderProjects();
        });
        if ($('searchProjects')) $('searchProjects').addEventListener('input', function (e) {
            state.filters.query = e.target.value || '';
            renderProjects();
        });
        if ($('dashboardShowDeleted')) {
            $('dashboardShowDeleted').checked = !!state.ui.showDeletedDashboardProjects;
            $('dashboardShowDeleted').addEventListener('change', function (e) {
                state.ui.showDeletedDashboardProjects = !!e.target.checked;
                renderRecentProjects();
            });
        }
        if ($('projectsShowDeleted')) {
            $('projectsShowDeleted').checked = !!state.ui.showDeletedProjects;
            $('projectsShowDeleted').addEventListener('change', function (e) {
                state.ui.showDeletedProjects = !!e.target.checked;
                renderProjects();
            });
        }

        if ($('newProjectBtn')) $('newProjectBtn').addEventListener('click', openProjectModal);
        if ($('newProjectBtn2')) $('newProjectBtn2').addEventListener('click', openProjectModal);
        if ($('closeModal')) $('closeModal').addEventListener('click', closeProjectModal);
        if ($('cancelModal')) $('cancelModal').addEventListener('click', closeProjectModal);
        if ($('createProjectBtn')) $('createProjectBtn').addEventListener('click', function () {
            saveProject().catch(function (e) {
                console.error(e);
                toast('Could not save project', true);
            });
        });
        if ($('addTeamMemberBtn')) $('addTeamMemberBtn').addEventListener('click', function () {
            let email = String((($('teamMemberEmailInput') && $('teamMemberEmailInput').value) || '')).trim();
            let role = String((($('teamMemberRoleInput') && $('teamMemberRoleInput').value) || 'collaborator')).trim();
            if (!email) {
                email = window.prompt('Enter team member email') || '';
            }
            if (!email) return;
            const normalized = String(email).trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return toast('Enter a valid email', true);
            if (!role) role = 'collaborator';
            addTeamMemberChip(normalized, role);
            if ($('teamMemberEmailInput')) $('teamMemberEmailInput').value = '';
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
        window.refreshProject = refreshProject;
        window.exportProject = exportProject;
        window.handleProjectFormSubmit = saveProject;
        window._modules = window._modules || {};
        window._modules.projects = window._modules.projects || {};
        window._modules.team = window._modules.team || {};
        Object.assign(window._modules.projects, {
            loadProjects: loadProjects,
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
            refreshProject: refreshProject,
            loadProjects: loadProjects,
            getVisibleProjects: visibleProjects,
            normalizeProject: normalizeProject,
            toDate: toDate,
            getServiceCatalog: serviceCatalog,
            getServiceLabel: serviceLabel,
            getShowDeletedEngagementPeople: getShowDeletedEngagementPeople,
            setShowDeletedEngagementPeople: setShowDeletedEngagementPeople,
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
