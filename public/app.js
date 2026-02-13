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
        currentUserProfile: null,
        currentProject: null,
        currentView: 'dashboard',
        projects: [],
        filters: { status: 'all', service: 'all', query: '' },
        ui: {
            showDeletedDashboardProjects: false,
            showDeletedProjects: false,
            showDeletedEngagementPeople: false,
            sidebarCollapsed: false,
            mobileSidebarOpen: false,
        },
        maturity: {
            scores: {},
            dataReadinessScores: {},
            overestimationChecks: {},
            dataGovernanceChecks: {},
            lastCalculatedAt: null,
        },
    };

    const maturityModelDimensions = [
        {
            id: 'businessRedesignLeadership',
            title: 'Dimension 1: Business Redesign Leadership',
            definition: 'Is AI owned as business transformation by the CEO or delegated as technology?',
            stopGate: {
                condition: 'Score below 3 and major AI investment is planned',
                risk: 'AI remains a technology initiative and fails to scale.',
                action: 'STOP and establish CEO ownership.',
            },
            levels: [
                {
                    level: 1,
                    name: 'Technology Initiative',
                    indicators: [
                        'No AI strategy exists beyond awareness.',
                        'Leadership reads about AI in media but has no formal strategy.',
                        'No dedicated budget or resources; scattered experiments without coordination.',
                    ],
                },
                {
                    level: 2,
                    name: 'Awareness',
                    indicators: [
                        'AI vision documented but not integrated.',
                        'Some budget allocated (about 0.5-1% of IT spend).',
                        'AI not connected to P&L or core business priorities.',
                    ],
                },
                {
                    level: 3,
                    name: 'Business-Led',
                    indicators: [
                        'AI strategy aligned to 2-3 business priorities.',
                        'Executive owner assigned with quarterly strategy reviews.',
                        'Multi-year roadmap and budget typically around 1-3% of revenue.',
                    ],
                },
                {
                    level: 4,
                    name: 'CEO-Driven',
                    indicators: [
                        'CEO personally champions AI transformation.',
                        'AI embedded in annual planning, budgeting, and board agenda.',
                        'AI is reshaping operating model and org structure (budget around 3-5% of revenue).',
                    ],
                },
                {
                    level: 5,
                    name: 'Business-Inseparable',
                    indicators: [
                        'AI and business strategy are effectively indistinguishable.',
                        'AI assumptions underpin strategic decisions with continuous adaptation.',
                        'Board includes AI expertise and market recognizes an AI competitive moat.',
                    ],
                },
            ],
        },
        {
            id: 'decisionArchitecture',
            title: 'Dimension 2: Decision Architecture',
            definition: 'How well recurring decisions are mapped with AI/human boundaries and accountability.',
            stopGate: {
                condition: 'Score below 3 while deploying AI in high-impact decisions',
                risk: 'Unclear accountability when AI fails.',
                action: 'STOP and map decisions, owners, escalation, and overrides.',
            },
            levels: [
                {
                    level: 1,
                    name: 'No Decision Mapping',
                    indicators: ['No mapped recurring decisions.', 'No defined AI/human boundaries.'],
                },
                {
                    level: 2,
                    name: 'Ad-Hoc Decision Use',
                    indicators: ['Some AI-assisted decisions exist.', 'Accountability still unclear.'],
                },
                {
                    level: 3,
                    name: 'Core Decisions Mapped',
                    indicators: ['Top decisions mapped.', 'Owners and overrides documented.'],
                },
                {
                    level: 4,
                    name: 'Comprehensive Architecture',
                    indicators: ['Material decisions mapped and governed.', 'Decision rights enforced.'],
                },
                {
                    level: 5,
                    name: 'Adaptive Decision Systems',
                    indicators: ['Dynamic decision rights and escalation.', 'Continuous optimization in place.'],
                },
            ],
        },
        {
            id: 'workflowEmbeddingValueDelivery',
            title: 'Dimension 3: Workflow Embedding and Value Delivery',
            definition: 'Whether AI is embedded in revenue and cost workflows rather than stuck in pilots.',
            stopGate: {
                condition: 'Score below 3 while most AI investment remains in pilots',
                risk: 'Pilot purgatory with no production value.',
                action: 'STOP and enforce pilot kill-or-embed discipline.',
            },
            levels: [
                {
                    level: 1,
                    name: 'Pilots Only',
                    indicators: ['POCs dominate activity.', 'No core workflow embedding.'],
                },
                {
                    level: 2,
                    name: 'Early Production',
                    indicators: ['One to two systems in production.', 'Pilots remain majority.'],
                },
                {
                    level: 3,
                    name: 'Core Integration',
                    indicators: ['AI embedded in core workflows.', 'P&L impact is measurable.'],
                },
                {
                    level: 4,
                    name: 'Systematic Embedding',
                    indicators: ['Pilot-to-production process is standardized.', 'Kill criteria enforced.'],
                },
                {
                    level: 5,
                    name: 'AI-Native Operations',
                    indicators: ['AI is inseparable from workflows.', 'Work execution speed becomes advantage.'],
                },
            ],
        },
        {
            id: 'dataFoundation',
            title: 'Dimension 4: Data Foundation',
            definition: 'Quality, accessibility, governance, and ownership of organizational data assets.',
            stopGate: {
                condition: 'Score below 3 while data quality for AI use cases is below 70%',
                risk: 'AI amplifies data quality issues.',
                action: 'STOP scaling and run data remediation first.',
            },
            levels: [
                {
                    level: 1,
                    name: 'Fragmented',
                    indicators: [
                        'Data is siloed and poor quality.',
                        'No clear ownership or stewardship.',
                        'Manual extraction is common.',
                    ],
                },
                {
                    level: 2,
                    name: 'Catalogued',
                    indicators: [
                        'Basic inventory and controls exist.',
                        'Inconsistent quality and access patterns remain.',
                        'Governance is partly documented.',
                    ],
                },
                {
                    level: 3,
                    name: 'Managed',
                    indicators: [
                        'Master data management active for key domains.',
                        'Quality above 80% for priority data.',
                        'Data ownership and governance board are operational.',
                    ],
                },
                {
                    level: 4,
                    name: 'Unified',
                    indicators: [
                        'Unified enterprise data platform.',
                        'Automated cataloging and quality controls.',
                        'Real-time access available where required.',
                    ],
                },
                {
                    level: 5,
                    name: 'Optimized',
                    indicators: [
                        'Domain-oriented data ownership model.',
                        'Data products with SLAs and real-time pipelines.',
                        'AI-powered quality monitoring.',
                    ],
                },
            ],
        },
        {
            id: 'technologyInfrastructureMlops',
            title: 'Dimension 5: Technology Infrastructure and MLOps',
            definition: 'Cloud platforms, MLOps, and production infrastructure to scale AI safely.',
            levels: [
                {
                    level: 1,
                    name: 'Legacy',
                    indicators: [
                        'Legacy systems and manual deployment.',
                        'No cloud-native platform or MLOps.',
                        'Minimal production AI capability.',
                    ],
                },
                {
                    level: 2,
                    name: 'Cloud Migration Begun',
                    indicators: [
                        'Hybrid cloud with some automation.',
                        'Basic APIs and pilot models exist.',
                        'Deployment remains mostly manual.',
                    ],
                },
                {
                    level: 3,
                    name: 'Modern Architecture',
                    indicators: [
                        'MLOps platform is operational.',
                        '5-20 production models with CI/CD.',
                        'Model versioning and tracking are in place.',
                    ],
                },
                {
                    level: 4,
                    name: 'Automated Pipelines',
                    indicators: [
                        'Automated training/deploy/monitor pipelines.',
                        'Real-time inference at scale (100+ models).',
                        'Infrastructure-as-code is standard.',
                    ],
                },
                {
                    level: 5,
                    name: 'AI-Native Platform',
                    indicators: [
                        'Event-driven architecture and agentic capability.',
                        'Continuous deployment supports very large model portfolios.',
                        'Platform is resilient and self-healing.',
                    ],
                },
            ],
        },
        {
            id: 'talentWorkforceTransformation',
            title: 'Dimension 6: Talent and Workforce Transformation',
            definition: 'Internal AI capability plus workforce transition planning for role redesign.',
            stopGate: {
                condition: 'Score below 3 while planning automation of critical roles',
                risk: 'Resistance and critical skill loss.',
                action: 'STOP and implement role-specific transition plans.',
            },
            levels: [
                {
                    level: 1,
                    name: 'No Capability or Planning',
                    indicators: [
                        'No internal AI talent and heavy vendor reliance.',
                        'No role impact analysis.',
                        'No workforce transition plan.',
                    ],
                },
                {
                    level: 2,
                    name: 'Nascent Capability',
                    indicators: [
                        'Small internal team with outsourcing dominance.',
                        'Role impact acknowledged but not quantified.',
                        'Transition planning remains ad-hoc.',
                    ],
                },
                {
                    level: 3,
                    name: 'Growing Team and Active Planning',
                    indicators: [
                        'AI team of 5-15 people.',
                        'Affected roles quantified with transition plans.',
                        'Role-specific reskilling is active.',
                    ],
                },
                {
                    level: 4,
                    name: 'Comprehensive Workforce Redesign',
                    indicators: [
                        'AI team of 15-50 with mostly internal delivery.',
                        'Transition timelines and adoption metrics are tracked.',
                        'Incentives are aligned to AI-augmented work.',
                    ],
                },
                {
                    level: 5,
                    name: 'Continuous Workforce Evolution',
                    indicators: [
                        '50+ AI professionals with strong retention.',
                        'Continuous workforce planning is operational.',
                        'AI is adopted as a tool, not treated as a threat.',
                    ],
                },
            ],
        },
        {
            id: 'governanceRiskControl',
            title: 'Dimension 7: Governance, Risk and Control',
            definition: 'AI risk governance with policies, controls, and tested failure response.',
            stopGate: {
                condition: 'Score below 3 while deploying AI in regulated/high-risk decisions',
                risk: 'Regulatory and reputational exposure.',
                action: 'STOP and establish tested governance controls first.',
            },
            levels: [
                {
                    level: 1,
                    name: 'No Governance',
                    indicators: [
                        'No AI governance framework or policies.',
                        'No tested failure response or fallback.',
                        'No oversight board.',
                    ],
                },
                {
                    level: 2,
                    name: 'Policies Documented',
                    indicators: [
                        'Basic guidelines documented.',
                        'Limited enforcement and manual oversight.',
                        'Failure responses mostly untested.',
                    ],
                },
                {
                    level: 3,
                    name: 'Operational Governance Board',
                    indicators: [
                        'Quarterly governance reviews in place.',
                        'Risk classification and core controls defined.',
                        'Selected failure scenarios tested.',
                    ],
                },
                {
                    level: 4,
                    name: 'Comprehensive Controls Proven',
                    indicators: [
                        'Automated compliance checks are active.',
                        'Incident response proven in practice.',
                        'Monthly governance reviews run consistently.',
                    ],
                },
                {
                    level: 5,
                    name: 'Real-Time Governance',
                    indicators: [
                        'Continuous monitoring and predictive risk alerts.',
                        'Automated kill/fallback controls are live.',
                        'Board-level AI risk capability is established.',
                    ],
                },
            ],
        },
        {
            id: 'valueMeasurementBusinessOutcomes',
            title: 'Dimension 8: Value Measurement and Business Outcomes',
            definition: 'Measure AI on business outcomes and P&L impact, not model activity alone.',
            stopGate: {
                condition: 'Score below 3 and AI ROI cannot be quantified',
                risk: 'No objective evidence that AI is working.',
                action: 'STOP and implement outcome-based measurement.',
            },
            levels: [
                { level: 1, name: 'No Measurement', indicators: ['No value tracking.', 'Model-count metrics dominate.'] },
                { level: 2, name: 'Technical Metrics Only', indicators: ['Accuracy/latency tracked.', 'No business linkage.'] },
                { level: 3, name: 'Business Linkage', indicators: ['Some initiatives tied to outcomes.', 'Pre/post baselines used.'] },
                { level: 4, name: 'Comprehensive', indicators: ['All initiatives tied to outcomes.', 'Monthly value reviews run.'] },
                { level: 5, name: 'Real-Time Optimization', indicators: ['Real-time value dashboards.', 'Dynamic funding by value.'] },
            ],
        },
        {
            id: 'dependencyManagement',
            title: 'Dimension 9: Dependency Management',
            definition: 'Manage dependencies on AI tools, data, models, vendors, and shadow AI usage.',
            levels: [
                { level: 1, name: 'Unmanaged', indicators: ['No dependency inventory.', 'No fallback plans.'] },
                { level: 2, name: 'Aware', indicators: ['Basic inventory exists.', 'Risks only partly understood.'] },
                { level: 3, name: 'Classified', indicators: ['Dependencies classified by criticality.', 'Fallbacks documented.'] },
                { level: 4, name: 'Managed', indicators: ['Fallbacks tested.', 'Single points mitigated.'] },
                { level: 5, name: 'Strategic Control', indicators: ['Dependency strategy is active.', 'Shadow AI is controlled.'] },
            ],
        },
        {
            id: 'strategicPositioning',
            title: 'Dimension 10: Strategic Positioning and Competitive Differentiation',
            definition: 'Define defensible advantage as AI capabilities commoditize over time.',
            levels: [
                { level: 1, name: 'No Strategic View', indicators: ['No differentiation logic.', 'No buy/partner/embed model.'] },
                { level: 2, name: 'Awareness', indicators: ['Commoditization recognized.', 'Response is ad-hoc.'] },
                { level: 3, name: 'Framework Applied', indicators: ['Buy/Partner/Embed decisions documented.', 'Moat sources identified.'] },
                { level: 4, name: 'Operationalized', indicators: ['Portfolio managed systematically.', 'Defensibility monitored.'] },
                { level: 5, name: 'Sustained Control', indicators: ['Compounding moat is market-visible.', 'Positioning supports valuation.'] },
            ],
        },
        {
            id: 'cultureChangeCapacity',
            title: 'Dimension 11: Culture and Change Capacity',
            definition: 'Organizational ability to adapt, experiment, and sustain transformation.',
            levels: [
                { level: 1, name: 'Resistant', indicators: ['Risk-averse and siloed.', 'Failure is punished.'] },
                { level: 2, name: 'Innovation in Pockets', indicators: ['Isolated experimentation.', 'Mixed agile adoption.'] },
                { level: 3, name: 'Data-Driven Emerging', indicators: ['Cross-functional teams forming.', 'Agile becoming standard.'] },
                { level: 4, name: 'Experimentation Culture', indicators: ['Rapid learning cycles.', 'Psychological safety present.'] },
                { level: 5, name: 'Innovation Embedded', indicators: ['Continuous learning norms.', 'Autonomous high-trust teams.'] },
            ],
        },
    ];

    const maturityScoreBands = [
        {
            min: 11,
            max: 22,
            level: 'Emerging - Not Ready',
            strategy: 'Build foundations before major AI investment',
            timeline: '12-24 month foundation program',
            focusAreas: [
                'CEO ownership and business framing',
                'Data quality and governance improvement',
                'Core talent and capability building',
                'Shadow AI and dependency control',
                'Cultural groundwork for transformation',
            ],
        },
        {
            min: 23,
            max: 33,
            level: 'Developing - Early Readiness',
            strategy: 'Begin with low-risk, low-complexity pilots only',
            timeline: '6-12 month pilot-to-production program',
            focusAreas: [
                'Select 1-2 low-risk pilots',
                'Map decisions and assign owners',
                'Prove value before scaling',
                'Establish pilot governance',
                'Demonstrate repeatable wins',
            ],
        },
        {
            min: 34,
            max: 44,
            level: 'Scaling - Production Ready',
            strategy: 'Scale proven use cases into core workflows',
            timeline: '12-18 month scaling program',
            focusAreas: [
                'Expand to 3-5 core workflows',
                'Execute workforce transformation',
                'Enforce value discipline',
                'Apply Buy/Partner/Embed',
                'Strengthen controls and governance',
            ],
        },
        {
            min: 45,
            max: 55,
            level: 'Transformational - Advanced',
            strategy: 'Optimize systems and explore frontier AI',
            timeline: 'Continuous optimization',
            focusAreas: [
                'Optimize production systems',
                'Explore agentic AI responsibly',
                'Scale platform operating model',
                'Industry leadership posture',
                'Sustain competitive moat',
            ],
        },
    ];

    const maturityOverestimationChecks = [
        { id: 'fewerThanFiveSystems', label: 'Fewer than 5 AI systems in production' },
        { id: 'unknownAccountableOwners', label: 'Cannot name accountable owners for each AI system' },
        { id: 'noSuccessfulIncidentResponse', label: 'No successful response to an AI incident yet' },
        { id: 'noPnLAttribution', label: "Cannot quantify AI's contribution to P&L" },
        { id: 'ceoNotOwner', label: 'CTO/CDO owns AI instead of CEO' },
    ];

    const dataReadinessDimensions = [
        {
            id: 'completeness',
            name: 'Completeness',
            definition: '% of required data fields populated',
            scale: '1:<50%, 2:50-65%, 3:65-80%, 4:80-95%, 5:>95%',
            measure: 'Check 100-record sample; calculate % with all required fields.',
        },
        {
            id: 'accuracy',
            name: 'Accuracy',
            definition: '% of records correct vs source of truth',
            scale: '1:<70%, 2:70-80%, 3:80-90%, 4:90-95%, 5:>95%',
            measure: 'Validate 100-record sample against authoritative source.',
        },
        {
            id: 'freshness',
            name: 'Freshness',
            definition: 'How current the data is',
            scale: '1:weeks-months, 2:days-weeks, 3:hours-days, 4:minutes-hours, 5:near real-time',
            measure: 'Check last update timestamps against current time.',
        },
        {
            id: 'consistency',
            name: 'Consistency',
            definition: 'Agreement across source systems',
            scale: '1:>20% variance, 2:10-20%, 3:5-10%, 4:1-5%, 5:single source of truth',
            measure: 'Compare same entity across systems; measure disagreement.',
        },
        {
            id: 'accessibility',
            name: 'Accessibility',
            definition: 'AI systems access latency and reliability',
            scale: '1:manual, 2:batch hours, 3:API minutes, 4:API <5s, 5:stream <500ms',
            measure: 'Test API/stream response under realistic load.',
        },
    ];

    const dataGovernanceChecklistItems = [
        'Data ownership assigned for all critical domains',
        'Data stewards identified, trained, and accountable',
        'Data catalog operational and maintained',
        'Data lineage tracked from source to use',
        'Privacy classification applied (PII/sensitive/public)',
        'Data retention policies documented and enforced',
        'Data quality metrics reviewed monthly',
        'Governance board meets with business leadership',
        'Slow approvals eliminated or automated',
    ];

    const shadowAIDiscoveryMethods = [
        'Employee survey on AI tools used for work',
        'Expense analysis for AI subscriptions',
        'Network traffic monitoring for AI endpoints',
        'Browser extension audit on managed devices',
        'IT help desk review for AI tool mentions',
    ];

    const shadowAIRiskTiers = [
        {
            tier: 'Critical Risk',
            trigger: 'Confidential data/PII/proprietary code in external AI',
            response: 'Immediate action, disable if possible, investigate exposure, legal review',
        },
        {
            tier: 'High Risk',
            trigger: 'Sensitive business data with unclear contracts/auditability',
            response: '30-day remediation plan, enforce logging and usage policy',
        },
        {
            tier: 'Medium Risk',
            trigger: 'General business content in unsanctioned tools',
            response: '90-day plan for sanctioning, training, and monitoring',
        },
        {
            tier: 'Low Risk',
            trigger: 'Personal use with no company data',
            response: 'Ongoing monitoring and boundary education',
        },
    ];

    const stakeholderMappingQuadrants = [
        {
            name: 'High Influence / High Interest - Champions',
            guidance: 'Engage deeply, include in governance, and make wins visible.',
        },
        {
            name: 'High Influence / Low Interest - Fence-sitters',
            guidance: 'Show relevance, quick wins, and competitive urgency.',
        },
        {
            name: 'Low Influence / High Interest - Supporters',
            guidance: 'Keep informed and use as local champions.',
        },
        {
            name: 'Low Influence / Low Interest - Monitor',
            guidance: 'Use light-touch communication and monitor movement.',
        },
    ];
    const formState = { mode: 'create', editingId: null };
    let uiReady = false;
    const SERVICE_CATALOG_STORAGE_KEY = 'aiDiagnosticsPlatform.serviceCatalog.v1';
    const DEFAULT_APPLICATION_LINK = 'service-application.html';
    const DEFAULT_APPLICATION_PAGE = 'default';
    const SERVICE_PAGE_CACHE_KEY = '20260213a';
    const defaultServiceCatalogSnapshot = JSON.parse(JSON.stringify(window.serviceCatalog || {}));
    const catalogEditorState = { selectedServiceId: '', draft: null };
    const DEFAULT_GUIDE_KEY_INPUTS = [
        'Strategic priorities',
        'Current-state baseline',
        'Risk and control constraints',
    ];
    const DEFAULT_GUIDE_STAKEHOLDERS = ['Executive sponsor', 'Delivery owner', 'Domain stakeholders'];
    const DEFAULT_GUIDE_STEPS = [
        { name: 'Align and Scope', focus: 'Set scope and objectives.' },
        { name: 'Diagnose Current State', focus: 'Assess current baseline and risks.' },
        { name: 'Design and Decide', focus: 'Design target approach and key decisions.' },
        { name: 'Embed and Transfer', focus: 'Finalize outputs and handover.' },
    ];

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
    function normalizeServiceId(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    function normalizeApplicationValue(value, fallback) {
        const text = String(value || '').trim();
        if (text) return text;
        return String(fallback || '').trim();
    }
    function normalizeCatalogText(value, fallback) {
        const text = String(value == null ? '' : value).trim();
        if (text) return text;
        return String(fallback == null ? '' : fallback).trim();
    }
    function normalizeCatalogList(value, fallbackList) {
        const out = Array.isArray(value)
            ? value
                  .map(function (item) {
                      return String(item == null ? '' : item).trim();
                  })
                  .filter(Boolean)
            : [];
        if (out.length) return out;
        return Array.isArray(fallbackList) ? fallbackList.slice() : [];
    }
    function splitTextareaLines(value) {
        return String(value == null ? '' : value)
            .split(/\r?\n/)
            .map(function (line) {
                return line.trim();
            })
            .filter(Boolean);
    }
    function listToMultilineText(list) {
        return (Array.isArray(list) ? list : [])
            .map(function (item) {
                return String(item == null ? '' : item).trim();
            })
            .filter(Boolean)
            .join('\n');
    }
    function uniqueCatalogList(list) {
        const seen = {};
        const out = [];
        (Array.isArray(list) ? list : []).forEach(function (item) {
            const text = String(item == null ? '' : item).trim();
            if (!text) return;
            if (seen[text]) return;
            seen[text] = true;
            out.push(text);
        });
        return out;
    }
    function normalizeCatalogGuide(rawGuide, service) {
        const guide = rawGuide && typeof rawGuide === 'object' ? rawGuide : {};
        const serviceName = normalizeCatalogText(service && service.name, 'Service');
        const serviceDescription = normalizeCatalogText(service && service.description, '');
        const deliverableCatalog = [];
        const deliverableIdLookup = {};
        const deliverableTitleLookup = {};
        (Array.isArray(service && service.deliverables) ? service.deliverables : []).forEach(function (item, index) {
            const title = normalizeCatalogText(item && item.title, '');
            if (!title) return;
            const requestedId = normalizeServiceId(item && item.id) || normalizeServiceId(title);
            const fallbackId = 'deliverable-' + String(index + 1);
            const id = requestedId || fallbackId;
            if (deliverableIdLookup[id]) return;
            deliverableCatalog.push({ id: id, title: title });
            deliverableIdLookup[id] = title;
            deliverableTitleLookup[String(title).toLowerCase()] = id;
        });
        function resolveDeliverableId(value) {
            const raw = String(value == null ? '' : value).trim();
            if (!raw) return '';
            const asId = normalizeServiceId(raw);
            if (asId && deliverableIdLookup[asId]) return asId;
            const byTitle = deliverableTitleLookup[String(raw).toLowerCase()];
            if (byTitle) return byTitle;
            return '';
        }
        let steps = (Array.isArray(guide.steps) ? guide.steps : [])
            .map(function (step, index) {
                if (step && typeof step === 'object') {
                    const explicitIds = normalizeCatalogList(
                        Array.isArray(step.deliverableIds)
                            ? step.deliverableIds
                            : step.deliverableId
                              ? [step.deliverableId]
                              : [],
                        []
                    )
                        .map(resolveDeliverableId)
                        .filter(Boolean);
                    const legacyRefs = normalizeCatalogList(step.deliverables, []);
                    const resolvedLegacyIds = [];
                    const unresolvedLegacyRefs = [];
                    legacyRefs.forEach(function (item) {
                        const id = resolveDeliverableId(item);
                        if (id) resolvedLegacyIds.push(id);
                        else unresolvedLegacyRefs.push(item);
                    });
                    const outputs = uniqueCatalogList(
                        normalizeCatalogList(step.outputs || step.additionalOutputs, []).concat(
                            unresolvedLegacyRefs
                        )
                    );
                    return {
                        name: normalizeCatalogText(step.name, 'Step ' + String(index + 1)),
                        focus: normalizeCatalogText(
                            step.focus,
                            'Focus area for consultants during this phase.'
                        ),
                        deliverableIds: uniqueCatalogList(explicitIds.concat(resolvedLegacyIds)),
                        outputs: outputs,
                    };
                }
                return {
                    name: normalizeCatalogText(step, 'Step ' + String(index + 1)),
                    focus: 'Focus area for consultants during this phase.',
                    deliverableIds: [],
                    outputs: [],
                };
            })
            .filter(function (step) {
                return step && step.name;
            });
        if (!steps.length) {
            steps = DEFAULT_GUIDE_STEPS.map(function (step) {
                return {
                    name: step.name,
                    focus: step.focus,
                    deliverableIds: [],
                    outputs: ['Step decision note', 'Step completion summary'],
                };
            });
        }
        const hasDeliverableAssignments = steps.some(function (step) {
            return Array.isArray(step.deliverableIds) && step.deliverableIds.length;
        });
        if (!hasDeliverableAssignments && deliverableCatalog.length) {
            steps.forEach(function (step) {
                if (!Array.isArray(step.deliverableIds)) step.deliverableIds = [];
            });
            deliverableCatalog.forEach(function (item, index) {
                const stepIndex = index % steps.length;
                steps[stepIndex].deliverableIds.push(item.id);
            });
        }
        steps = steps.map(function (step, index) {
            const ids = uniqueCatalogList(
                normalizeCatalogList(step.deliverableIds, [])
                    .map(resolveDeliverableId)
                    .filter(Boolean)
            );
            const outputs = uniqueCatalogList(normalizeCatalogList(step.outputs, []));
            return {
                name: normalizeCatalogText(step.name, 'Step ' + String(index + 1)),
                focus: normalizeCatalogText(step.focus, 'Focus area for consultants during this phase.'),
                deliverableIds: ids,
                outputs: outputs,
                deliverables: ids.map(function (id) {
                    return deliverableIdLookup[id] || id;
                }),
            };
        });
        return {
            fullDescription: normalizeCatalogText(
                guide.fullDescription,
                serviceDescription ||
                    serviceName + ' consultant guide covering inputs, stakeholders, delivery steps, and outcomes.'
            ),
            keyInputs: normalizeCatalogList(guide.keyInputs, DEFAULT_GUIDE_KEY_INPUTS),
            stakeholders: normalizeCatalogList(guide.stakeholders, DEFAULT_GUIDE_STAKEHOLDERS),
            steps: steps,
            outcomeExample: normalizeCatalogText(
                guide.outcomeExample,
                serviceName + ' engagement completes with signed-off deliverables and clear next-step ownership.'
            ),
        };
    }
    function normalizeCatalogService(serviceId, rawService) {
        const raw = rawService || {};
        const serviceApplication = raw.application || {};
        const out = {
            id: serviceId,
            name: String(raw.name || serviceId).trim() || serviceId,
            category: String(raw.category || 'Consulting').trim() || 'Consulting',
            description: String(raw.description || '').trim(),
            application: {
                link: normalizeApplicationValue(
                    serviceApplication.link || raw.applicationLink,
                    DEFAULT_APPLICATION_LINK
                ),
                page: normalizeApplicationValue(
                    serviceApplication.page || raw.applicationPage,
                    serviceId || DEFAULT_APPLICATION_PAGE
                ),
            },
            deliverables: [],
            guide: null,
        };
        const usedIds = new Set();
        const list = Array.isArray(raw.deliverables) ? raw.deliverables : [];
        list.forEach(function (item, index) {
            const title = String((item && item.title) || '').trim();
            if (!title) return;
            const requestedId = normalizeServiceId((item && item.id) || title) || 'deliverable-' + String(index + 1);
            let id = requestedId;
            let counter = 2;
            while (usedIds.has(id)) {
                id = requestedId + '-' + String(counter);
                counter += 1;
            }
            usedIds.add(id);
            const deliverableApplication = (item && item.application) || {};
            out.deliverables.push({
                id: id,
                title: title,
                    application: {
                        link: normalizeApplicationValue(
                            deliverableApplication.link || (item && item.applicationLink),
                            out.application.link
                        ),
                        page: normalizeApplicationValue(
                            deliverableApplication.page || (item && item.applicationPage),
                            id || out.application.page
                        ),
                    },
            });
        });
        const fallbackGuide =
            raw.guide ||
            raw.serviceGuide ||
            (window.serviceGuides && window.serviceGuides[serviceId] ? window.serviceGuides[serviceId] : null);
        out.guide = normalizeCatalogGuide(fallbackGuide, out);
        return out;
    }
    function normalizeCatalogData(rawCatalog) {
        const source = rawCatalog && typeof rawCatalog === 'object' ? rawCatalog : {};
        const out = {};
        Object.keys(source).forEach(function (rawKey) {
            const candidate = source[rawKey] || {};
            const serviceId = normalizeServiceId(candidate.id || rawKey || candidate.name);
            if (!serviceId) return;
            out[serviceId] = normalizeCatalogService(serviceId, candidate);
        });
        return out;
    }
    function persistServiceCatalog() {
        try {
            const catalog = serviceCatalog();
            window.localStorage.setItem(SERVICE_CATALOG_STORAGE_KEY, JSON.stringify(catalog));
        } catch (e) {
            console.warn('Could not persist service catalog', e);
        }
    }
    function hasStoredServiceCatalog() {
        try {
            return !!window.localStorage.getItem(SERVICE_CATALOG_STORAGE_KEY);
        } catch (e) {
            return false;
        }
    }
    async function persistServiceCatalogForUser(userId, catalogValue) {
        const uid = String(userId || '').trim();
        if (!uid || !db) return false;
        const normalized = normalizeCatalogData(catalogValue);
        if (!Object.keys(normalized).length) return false;
        await db.collection('users').doc(uid).set(
            {
                serviceCatalog: normalized,
                serviceCatalogUpdatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );
        return true;
    }
    function hydrateServiceCatalogFromStorage() {
        try {
            const raw = window.localStorage.getItem(SERVICE_CATALOG_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            const normalized = normalizeCatalogData(parsed);
            if (!Object.keys(normalized).length) return;
            window.serviceCatalog = normalized;
        } catch (e) {
            console.warn('Invalid service catalog in local storage; using defaults.', e);
            try {
                window.localStorage.removeItem(SERVICE_CATALOG_STORAGE_KEY);
            } catch (removeErr) {
                console.warn('Could not clear invalid service catalog key', removeErr);
            }
        }
    }
    function emptyCatalogDraft() {
        return {
            id: '',
            name: '',
            category: 'Consulting',
            description: '',
            application: {
                link: DEFAULT_APPLICATION_LINK,
                page: DEFAULT_APPLICATION_PAGE,
            },
            guide: {
                fullDescription: '',
                keyInputs: DEFAULT_GUIDE_KEY_INPUTS.slice(),
                stakeholders: DEFAULT_GUIDE_STAKEHOLDERS.slice(),
                steps: DEFAULT_GUIDE_STEPS.map(function (step) {
                    return {
                        name: step.name,
                        focus: step.focus,
                        deliverableIds: [],
                        outputs: ['Step decision note', 'Step completion summary'],
                    };
                }),
                outcomeExample: '',
            },
            deliverables: [
                {
                    id: '',
                    title: '',
                    application: {
                        link: DEFAULT_APPLICATION_LINK,
                        page: DEFAULT_APPLICATION_PAGE,
                    },
                },
            ],
        };
    }
    function setCatalogDraftForService(serviceId) {
        const catalog = serviceCatalog();
        const current = catalog[String(serviceId || '')];
        if (!current) {
            catalogEditorState.selectedServiceId = '';
            catalogEditorState.draft = emptyCatalogDraft();
            return;
        }
        const draftDeliverables = (Array.isArray(current.deliverables) ? current.deliverables : []).map(function (item) {
            const itemApp = (item && item.application) || {};
            return {
                id: String((item && item.id) || ''),
                title: String((item && item.title) || ''),
                application: {
                    link: normalizeApplicationValue(itemApp.link || (item && item.applicationLink), ''),
                    page: normalizeApplicationValue(itemApp.page || (item && item.applicationPage), ''),
                },
            };
        });
        const fallbackGuide =
            window.serviceGuides && window.serviceGuides[String(serviceId || '')]
                ? window.serviceGuides[String(serviceId || '')]
                : null;
        const draftServiceShape = {
            id: current.id || serviceId,
            name: current.name || '',
            category: current.category || 'Consulting',
            description: current.description || '',
            application: {
                link: normalizeApplicationValue(
                    current.application && current.application.link,
                    DEFAULT_APPLICATION_LINK
                ),
                page: normalizeApplicationValue(
                    current.application && current.application.page,
                    DEFAULT_APPLICATION_PAGE
                ),
            },
            deliverables: draftDeliverables,
        };
        catalogEditorState.selectedServiceId = String(serviceId);
        catalogEditorState.draft = {
            id: draftServiceShape.id,
            name: draftServiceShape.name,
            category: draftServiceShape.category,
            description: draftServiceShape.description,
            application: draftServiceShape.application,
            deliverables: draftDeliverables,
            guide: normalizeCatalogGuide(current.guide || fallbackGuide, draftServiceShape),
        };
        if (!catalogEditorState.draft.deliverables.length) {
            catalogEditorState.draft.deliverables = [
                {
                    id: '',
                    title: '',
                    application: {
                        link: catalogEditorState.draft.application.link,
                        page: catalogEditorState.draft.application.page,
                    },
                },
            ];
        }
    }
    function readCatalogEditorForm() {
        if (!$('catalogServiceName')) {
            if (!catalogEditorState.draft) catalogEditorState.draft = emptyCatalogDraft();
            return catalogEditorState.draft;
        }
        const deliverables = Array.from(document.querySelectorAll('#catalogDeliverablesList .catalog-deliverable-row'))
            .map(function (row) {
                const idInput = row.querySelector('.catalog-deliverable-id');
                const titleInput = row.querySelector('.catalog-deliverable-title');
                const linkInput = row.querySelector('.catalog-deliverable-link');
                const pageInput = row.querySelector('.catalog-deliverable-page');
                return {
                    id: String((idInput && idInput.value) || '').trim(),
                    title: String((titleInput && titleInput.value) || '').trim(),
                    application: {
                        link: String((linkInput && linkInput.value) || '').trim(),
                        page: String((pageInput && pageInput.value) || '').trim(),
                    },
                };
            })
            .filter(function (item) {
                return item.title;
            });
        const guideSteps = Array.from(document.querySelectorAll('#catalogGuideStepsList .catalog-step-row'))
            .map(function (row) {
                const stepNameInput = row.querySelector('.catalog-step-name');
                const stepFocusInput = row.querySelector('.catalog-step-focus');
                const deliverableInputs = Array.from(
                    row.querySelectorAll('.catalog-step-deliverable-assignment:checked')
                );
                const stepOutputsInput = row.querySelector('.catalog-step-outputs');
                return {
                    name: String((stepNameInput && stepNameInput.value) || '').trim(),
                    focus: String((stepFocusInput && stepFocusInput.value) || '').trim(),
                    deliverableIds: deliverableInputs
                        .map(function (input) {
                            return String((input && input.value) || '').trim();
                        })
                        .filter(Boolean),
                    outputs: splitTextareaLines((stepOutputsInput && stepOutputsInput.value) || ''),
                };
            })
            .filter(function (step) {
                return step.name || step.focus || step.deliverableIds.length || step.outputs.length;
            });
        const draft = {
            id: String((($('catalogServiceId') && $('catalogServiceId').value) || '')).trim(),
            name: String((($('catalogServiceName') && $('catalogServiceName').value) || '')).trim(),
            category: String((($('catalogServiceCategory') && $('catalogServiceCategory').value) || '')).trim(),
            description: String((($('catalogServiceDescription') && $('catalogServiceDescription').value) || '')).trim(),
            application: {
                link: String((($('catalogApplicationLink') && $('catalogApplicationLink').value) || '')).trim(),
                page: String((($('catalogApplicationPage') && $('catalogApplicationPage').value) || '')).trim(),
            },
            deliverables: deliverables.length
                ? deliverables
                : [
                      {
                          id: '',
                          title: '',
                          application: {
                              link: '',
                              page: '',
                          },
                      },
                  ],
        };
        draft.guide = normalizeCatalogGuide(
            {
                fullDescription: String(
                    (($('catalogGuideFullDescription') && $('catalogGuideFullDescription').value) || '')
                ).trim(),
                keyInputs: splitTextareaLines(
                    (($('catalogGuideKeyInputs') && $('catalogGuideKeyInputs').value) || '')
                ),
                stakeholders: splitTextareaLines(
                    (($('catalogGuideStakeholders') && $('catalogGuideStakeholders').value) || '')
                ),
                steps: guideSteps,
                outcomeExample: String(
                    (($('catalogGuideOutcomeExample') && $('catalogGuideOutcomeExample').value) || '')
                ).trim(),
            },
            draft
        );
        catalogEditorState.draft = draft;
        return draft;
    }
    function applyCatalogUpdate(nextCatalog, opts) {
        const normalized = normalizeCatalogData(nextCatalog);
        if (!Object.keys(normalized).length) {
            toast('Catalog must contain at least one service.', true);
            return false;
        }
        window.serviceCatalog = normalized;
        window.serviceGuides = {};
        Object.keys(normalized).forEach(function (serviceId) {
            window.serviceGuides[serviceId] = normalizeCatalogGuide(
                normalized[serviceId].guide,
                normalized[serviceId]
            );
        });
        persistServiceCatalog();
        const selected = opts && opts.selectedServiceId ? String(opts.selectedServiceId) : '';
        if (selected && normalized[selected]) setCatalogDraftForService(selected);
        else {
            catalogEditorState.selectedServiceId = '';
            catalogEditorState.draft = null;
        }
        populateServiceOptions();
        populateServiceFilterOptions();
        populateSidebarServices();
        if (state.currentView === 'dashboard') updateDashboard();
        if (state.currentView === 'projects') renderProjects();
        if (state.currentView === 'catalogEditor') renderCatalogEditor();
        if (state.currentProject && window.renderProjectDetail) {
            window.renderProjectDetail(state.currentProject);
        }
        if (opts && opts.toastMessage) toast(opts.toastMessage);
        return true;
    }
    function canPublishCatalogToAllAccounts() {
        const profile = state.currentUserProfile || {};
        return !!profile.platformAdmin;
    }
    function serviceCatalog() {
        return window.serviceCatalog || {};
    }
    function serviceApplicationConfig(serviceId) {
        const catalog = serviceCatalog();
        const service = catalog[String(serviceId || '')] || {};
        const serviceApp = service.application || {};
        return {
            link: normalizeApplicationValue(serviceApp.link, DEFAULT_APPLICATION_LINK),
            page: normalizeApplicationValue(serviceApp.page, String(serviceId || DEFAULT_APPLICATION_PAGE)),
        };
    }
    function deliverableApplicationConfig(serviceId, deliverableId) {
        const catalog = serviceCatalog();
        const service = catalog[String(serviceId || '')] || {};
        const defaults = serviceApplicationConfig(serviceId);
        if (!deliverableId || !Array.isArray(service.deliverables)) return defaults;
        const wantedId = String(deliverableId || '')
            .replace(String(serviceId || '') + '__', '')
            .trim();
        const found = service.deliverables.find(function (item) {
            return String((item && item.id) || '') === wantedId;
        });
        if (!found) return defaults;
        const app = (found && found.application) || {};
        return {
            link: normalizeApplicationValue(app.link || found.applicationLink, defaults.link),
            page: normalizeApplicationValue(app.page || found.applicationPage, defaults.page),
        };
    }
    function buildApplicationLaunchUrl(serviceId, config, deliverableId) {
        const effective = config || serviceApplicationConfig(serviceId);
        const base = normalizeApplicationValue(effective.link, DEFAULT_APPLICATION_LINK);
        const page = normalizeApplicationValue(effective.page, DEFAULT_APPLICATION_PAGE);
        const project = state.currentProject || null;
        const projectId = String((project && project.id) || '').trim();
        const projectName = String(
            (project && (project.clientName || project.name || project.title)) || ''
        ).trim();
        try {
            const url = new URL(base, window.location.href);
            if (!url.searchParams.has('serviceId')) url.searchParams.set('serviceId', String(serviceId || ''));
            if (!url.searchParams.has('page')) url.searchParams.set('page', page);
            if (deliverableId && !url.searchParams.has('deliverableId')) {
                url.searchParams.set('deliverableId', String(deliverableId || ''));
            }
            if (base.indexOf('service-application.html') >= 0 && !url.searchParams.has('_v')) {
                url.searchParams.set('_v', SERVICE_PAGE_CACHE_KEY);
            }
            if (projectId && !url.searchParams.has('projectId')) {
                url.searchParams.set('projectId', projectId);
            }
            if (projectName && !url.searchParams.has('projectName')) {
                url.searchParams.set('projectName', projectName);
            }
            return url.toString();
        } catch (e) {
            const sep = base.includes('?') ? '&' : '?';
            let out =
                base +
                sep +
                'serviceId=' +
                encodeURIComponent(String(serviceId || '')) +
                '&page=' +
                encodeURIComponent(page);
            if (deliverableId) out += '&deliverableId=' + encodeURIComponent(String(deliverableId || ''));
            if (base.indexOf('service-application.html') >= 0) {
                out += '&_v=' + encodeURIComponent(SERVICE_PAGE_CACHE_KEY);
            }
            if (projectId) out += '&projectId=' + encodeURIComponent(projectId);
            if (projectName) out += '&projectName=' + encodeURIComponent(projectName);
            return out;
        }
    }
    function launchServiceApplication(serviceId) {
        const id = String(serviceId || '').trim();
        if (!id) return toast('No catalog item selected.', true);
        const url = buildApplicationLaunchUrl(id, {
            link: DEFAULT_APPLICATION_LINK,
            page: id || DEFAULT_APPLICATION_PAGE,
        });
        window.location.assign(url);
    }
    function launchDeliverableApplication(deliverableId, serviceIdHint) {
        const serviceId =
            String(serviceIdHint || '').trim() ||
            String(
                ((state.currentProject && (state.currentProject.primaryService || '')) ||
                    (state.currentProject &&
                        Array.isArray(state.currentProject.assignedServices) &&
                        state.currentProject.assignedServices[0])) ||
                    ''
            ).trim();
        if (!serviceId) return toast('Service not found for this deliverable.', true);
        const projectDeliverable =
            state.currentProject &&
            Array.isArray(state.currentProject.serviceDeliverables) &&
            state.currentProject.serviceDeliverables.find(function (item) {
                return String((item && item.id) || '') === String(deliverableId || '');
            });
        const config = projectDeliverable
            ? {
                  link: DEFAULT_APPLICATION_LINK,
                  page: String(serviceId || DEFAULT_APPLICATION_PAGE),
              }
            : {
                  link: DEFAULT_APPLICATION_LINK,
                  page: String(serviceId || DEFAULT_APPLICATION_PAGE),
              };
        const url = buildApplicationLaunchUrl(serviceId, config, deliverableId);
        window.location.assign(url);
    }
    function renderCatalogEditor() {
        const content = $('catalogEditorContent');
        if (!content) return;
        const catalog = serviceCatalog();
        const keys = Object.keys(catalog).sort(function (a, b) {
            return String(catalog[a].name || a).localeCompare(String(catalog[b].name || b));
        });
        if (!catalogEditorState.selectedServiceId && keys.length && !catalogEditorState.draft) {
            setCatalogDraftForService(keys[0]);
        }
        if (
            catalogEditorState.selectedServiceId &&
            !catalog[catalogEditorState.selectedServiceId] &&
            !catalogEditorState.draft
        ) {
            if (keys.length) setCatalogDraftForService(keys[0]);
            else setCatalogDraftForService('');
        }
        if (!catalogEditorState.draft) {
            setCatalogDraftForService(catalogEditorState.selectedServiceId || '');
        }
        const draft = catalogEditorState.draft || emptyCatalogDraft();
        draft.guide = normalizeCatalogGuide(draft.guide, draft);
        const canPublishAll = canPublishCatalogToAllAccounts();
        const hasSelection = !!(
            catalogEditorState.selectedServiceId && catalog[catalogEditorState.selectedServiceId]
        );
        const serviceRows = keys.length
            ? keys
                  .map(function (key) {
                      const item = catalog[key] || {};
                      const active = key === catalogEditorState.selectedServiceId ? ' active' : '';
                      const deliverableCount = Array.isArray(item.deliverables) ? item.deliverables.length : 0;
                      return (
                          '<button type="button" class="catalog-service-item' +
                          active +
                          '" data-action="select-catalog-service" data-service-id="' +
                          escapeHtml(key) +
                          '"><span class="catalog-service-name">' +
                          escapeHtml(item.name || key) +
                          '</span><span class="catalog-service-meta">' +
                          escapeHtml(key) +
                          ' • ' +
                          escapeHtml(item.category || 'Uncategorized') +
                          ' • ' +
                          String(deliverableCount) +
                          ' deliverables</span></button>'
                      );
                  })
                  .join('')
            : '<div class="empty-state"><h4>No services yet</h4><p>Create your first service.</p></div>';
        const deliverableChoices = [];
        (Array.isArray(draft.deliverables) ? draft.deliverables : []).forEach(function (item, index) {
            const title = String((item && item.title) || '').trim();
            if (!title) return;
            const fallbackId = normalizeServiceId((item && item.id) || title) || 'deliverable-' + String(index + 1);
            if (deliverableChoices.some(function (choice) { return choice.id === fallbackId; })) return;
            deliverableChoices.push({
                id: fallbackId,
                title: title,
            });
        });
        const guideStepRows = (
            Array.isArray(draft.guide && draft.guide.steps) && draft.guide.steps.length
                ? draft.guide.steps
                : [{ name: '', focus: '', deliverableIds: [], outputs: [] }]
        )
            .map(function (step, index) {
                const assignedIds = Array.isArray(step && step.deliverableIds) ? step.deliverableIds : [];
                const outputsText = listToMultilineText(step && step.outputs);
                const deliverableAssignmentHtml = deliverableChoices.length
                    ? '<div class="catalog-step-deliverable-picker">' +
                      deliverableChoices
                          .map(function (choice, choiceIndex) {
                              const inputId =
                                  'catalog_step_' +
                                  String(index) +
                                  '_' +
                                  String(choiceIndex) +
                                  '_' +
                                  String(choice.id);
                              const checked = assignedIds.indexOf(choice.id) >= 0 ? ' checked' : '';
                              return (
                                  '<label class="catalog-step-deliverable-option" for="' +
                                  escapeHtml(inputId) +
                                  '"><input id="' +
                                  escapeHtml(inputId) +
                                  '" class="catalog-step-deliverable-assignment" type="checkbox" value="' +
                                  escapeHtml(choice.id) +
                                  '"' +
                                  checked +
                                  ' /><span>' +
                                  escapeHtml(choice.title) +
                                  '</span></label>'
                              );
                          })
                          .join('') +
                      '</div>'
                    : '<p class="small muted">Add service deliverables first, then attach them to this step.</p>';
                return (
                    '<div class="catalog-step-row"><label>Step Name<input class="catalog-step-name" type="text" value="' +
                    escapeHtml(String((step && step.name) || '')) +
                    '" placeholder="Align and Scope" /></label><label>Focus<textarea class="catalog-step-focus" rows="3" placeholder="What consultants execute in this phase.">' +
                    escapeHtml(String((step && step.focus) || '')) +
                    '</textarea></label><label>Attached Deliverables' +
                    deliverableAssignmentHtml +
                    '</label><label>Additional Step Outputs (not deliverables)<textarea class="catalog-step-outputs" rows="4" placeholder="Workshop notes\\nDecision log\\nStakeholder actions">' +
                    escapeHtml(outputsText) +
                    '</textarea></label><button type="button" class="btn-secondary" data-action="remove-catalog-step" data-index="' +
                    String(index) +
                    '">Remove</button></div>'
                );
            })
            .join('');
        const deliverableRows = (Array.isArray(draft.deliverables) ? draft.deliverables : [{ id: '', title: '' }])
            .map(function (item, index) {
                const deliverableApp = (item && item.application) || {};
                return (
                    '<div class="catalog-deliverable-row"><label>Deliverable ID<input class="catalog-deliverable-id" type="text" value="' +
                    escapeHtml(String((item && item.id) || '')) +
                    '" placeholder="executive-brief" /></label><label>Title<input class="catalog-deliverable-title" type="text" value="' +
                    escapeHtml(String((item && item.title) || '')) +
                    '" placeholder="Executive advisory pack" /></label><label>Application Link<input class="catalog-deliverable-link" type="text" value="' +
                    escapeHtml(
                        normalizeApplicationValue(deliverableApp.link, draft.application && draft.application.link)
                    ) +
                    '" placeholder="service-application.html" /></label><label>Page<input class="catalog-deliverable-page" type="text" value="' +
                    escapeHtml(
                        normalizeApplicationValue(deliverableApp.page, draft.application && draft.application.page)
                    ) +
                    '" placeholder="default" /></label><button type="button" class="btn-secondary" data-action="remove-catalog-deliverable" data-index="' +
                    String(index) +
                    '">Remove</button></div>'
                );
            })
            .join('');
        content.innerHTML =
            '<div class="catalog-summary">Define service deliverables first, then attach deliverables to steps. Steps can also include additional non-deliverable outputs. Clicking a service in the sidebar opens that application in a new page.</div>' +
            '<div class="catalog-editor-grid"><div class="catalog-panel"><div class="catalog-panel-header"><h3>Services</h3><button type="button" class="btn-secondary" data-action="new-catalog-service">New Service</button></div><div class="catalog-service-list">' +
            serviceRows +
            '</div></div><div class="catalog-panel"><div class="catalog-panel-header"><h3>' +
            (hasSelection ? 'Edit Service' : 'Create Service') +
            '</h3></div><form id="catalogEditorForm" class="catalog-form-grid"><label>Service ID<input id="catalogServiceId" type="text" value="' +
            escapeHtml(draft.id || '') +
            '" placeholder="ai-strategy-design" /></label><label>Name<input id="catalogServiceName" type="text" value="' +
            escapeHtml(draft.name || '') +
            '" placeholder="AI Strategy Design" /></label><label>Category<input id="catalogServiceCategory" type="text" value="' +
            escapeHtml(draft.category || '') +
            '" placeholder="Consulting" /></label><label>Deliverables Count<input type="text" value="' +
            String((Array.isArray(draft.deliverables) ? draft.deliverables.length : 0) || 0) +
            '" readonly /></label><label>Default Application Link<input id="catalogApplicationLink" type="text" value="' +
            escapeHtml((draft.application && draft.application.link) || DEFAULT_APPLICATION_LINK) +
            '" placeholder="service-application.html" /></label><label>Default Page<input id="catalogApplicationPage" type="text" value="' +
            escapeHtml((draft.application && draft.application.page) || DEFAULT_APPLICATION_PAGE) +
            '" placeholder="default" /></label><label class="full">Description<textarea id="catalogServiceDescription" rows="4" placeholder="What this service delivers and why it matters.">' +
            escapeHtml(draft.description || '') +
            '</textarea></label><label class="full">Guide Full Description<textarea id="catalogGuideFullDescription" rows="4" placeholder="Full consultant-facing service description.">' +
            escapeHtml((draft.guide && draft.guide.fullDescription) || '') +
            '</textarea></label><label class="full">Key Inputs (one per line)<textarea id="catalogGuideKeyInputs" rows="4" placeholder="Strategic priorities\\nCurrent-state baseline\\nRisk constraints">' +
            escapeHtml(listToMultilineText(draft.guide && draft.guide.keyInputs)) +
            '</textarea></label><label class="full">Stakeholders (one per line)<textarea id="catalogGuideStakeholders" rows="4" placeholder="Executive sponsor\\nDelivery owner\\nDomain stakeholders">' +
            escapeHtml(listToMultilineText(draft.guide && draft.guide.stakeholders)) +
            '</textarea></label><div class="full"><div class="section-header compact"><h4>Deliverables</h4><button type="button" class="btn-secondary" data-action="add-catalog-deliverable">Add Deliverable</button></div><div id="catalogDeliverablesList" class="catalog-deliverables">' +
            deliverableRows +
            '</div></div><div class="full"><div class="section-header compact"><h4>Execution Steps (Attach Deliverables + Add Other Outputs)</h4><button type="button" class="btn-secondary" data-action="add-catalog-step">Add Step</button></div><div id="catalogGuideStepsList" class="catalog-steps">' +
            guideStepRows +
            '</div></div><label class="full">Outcome Example<textarea id="catalogGuideOutcomeExample" rows="4" placeholder="Example of final client outcome for this service.">' +
            escapeHtml((draft.guide && draft.guide.outcomeExample) || '') +
            '</textarea></label>' +
            '</div></div></form><div class="catalog-actions"><div><button type="button" class="btn-danger" data-action="reset-catalog-defaults">Reset to Defaults</button> <button type="button" class="btn-secondary" data-action="publish-catalog-all-accounts"' +
            (canPublishAll ? '' : ' disabled') +
            '>Update All Accounts</button></div><div><button type="button" class="btn-secondary" data-action="delete-catalog-service" data-service-id="' +
            escapeHtml(catalogEditorState.selectedServiceId || '') +
            '"' +
            (hasSelection ? '' : ' disabled') +
            '>Delete Service</button> <button type="button" class="btn-primary" data-action="save-catalog-service">Save Service</button></div></div>' +
            (canPublishAll
                ? ''
                : '<p class="small">Update All Accounts is available to platform admins only.</p>') +
            '</div></div>';
    }
    function startNewCatalogService() {
        catalogEditorState.selectedServiceId = '';
        catalogEditorState.draft = emptyCatalogDraft();
        renderCatalogEditor();
    }
    function selectCatalogService(serviceId) {
        setCatalogDraftForService(serviceId);
        renderCatalogEditor();
    }
    function addCatalogDeliverable() {
        const draft = readCatalogEditorForm();
        draft.deliverables = Array.isArray(draft.deliverables) ? draft.deliverables : [];
        draft.deliverables.push({
            id: '',
            title: '',
            application: {
                link: (draft.application && draft.application.link) || DEFAULT_APPLICATION_LINK,
                page: (draft.application && draft.application.page) || DEFAULT_APPLICATION_PAGE,
            },
        });
        catalogEditorState.draft = draft;
        renderCatalogEditor();
    }
    function removeCatalogDeliverable(index) {
        const idx = Number(index);
        if (!Number.isFinite(idx)) return;
        const draft = readCatalogEditorForm();
        draft.deliverables = Array.isArray(draft.deliverables) ? draft.deliverables : [];
        if (draft.deliverables.length <= 1) {
            draft.deliverables = [
                {
                    id: '',
                    title: '',
                    application: {
                        link: (draft.application && draft.application.link) || DEFAULT_APPLICATION_LINK,
                        page: (draft.application && draft.application.page) || DEFAULT_APPLICATION_PAGE,
                    },
                },
            ];
        } else {
            draft.deliverables.splice(Math.max(0, idx), 1);
        }
        catalogEditorState.draft = draft;
        renderCatalogEditor();
    }
    function addCatalogGuideStep() {
        const draft = readCatalogEditorForm();
        draft.guide = normalizeCatalogGuide(draft.guide, draft);
        draft.guide.steps = Array.isArray(draft.guide.steps) ? draft.guide.steps : [];
        draft.guide.steps.push({
            name: '',
            focus: '',
            deliverableIds: [],
            outputs: [],
        });
        catalogEditorState.draft = draft;
        renderCatalogEditor();
    }
    function removeCatalogGuideStep(index) {
        const idx = Number(index);
        if (!Number.isFinite(idx)) return;
        const draft = readCatalogEditorForm();
        draft.guide = normalizeCatalogGuide(draft.guide, draft);
        draft.guide.steps = Array.isArray(draft.guide.steps) ? draft.guide.steps : [];
        if (draft.guide.steps.length <= 1) {
            draft.guide.steps = [
                {
                    name: 'Align and Scope',
                    focus: 'Set scope and objectives.',
                    deliverableIds: [],
                    outputs: ['Step decision note', 'Step completion summary'],
                },
            ];
        } else {
            draft.guide.steps.splice(Math.max(0, idx), 1);
        }
        catalogEditorState.draft = draft;
        renderCatalogEditor();
    }
    async function saveCatalogService() {
        const draft = readCatalogEditorForm();
        const existingCatalog = deepClone(serviceCatalog());
        const currentId = String(catalogEditorState.selectedServiceId || '');
        const requestedId = String(draft.id || draft.name || '').trim();
        const nextId = normalizeServiceId(requestedId);
        if (!nextId) return toast('Service ID or name is required.', true);
        if (!String(draft.name || '').trim()) return toast('Service name is required.', true);
        if (existingCatalog[nextId] && nextId !== currentId) {
            return toast('A service with that ID already exists.', true);
        }
        if (currentId && currentId !== nextId) delete existingCatalog[currentId];
        existingCatalog[nextId] = normalizeCatalogService(nextId, draft);
        const applied = applyCatalogUpdate(existingCatalog, { selectedServiceId: nextId });
        if (!applied) return;
        try {
            if (!state.currentUser || !state.currentUser.uid) {
                toast('Service catalog updated locally. Sign in to persist permanently.', true);
                return;
            }
            await persistServiceCatalogForUser(state.currentUser.uid, serviceCatalog());
            toast('Service catalog updated permanently.');
        } catch (e) {
            console.error('Could not persist service catalog to Firestore', e);
            toast('Service catalog saved locally, but permanent save failed.', true);
        }
    }
    async function deleteCatalogService(serviceId) {
        const targetId = String(serviceId || catalogEditorState.selectedServiceId || '').trim();
        if (!targetId) return;
        const catalog = deepClone(serviceCatalog());
        if (!catalog[targetId]) return toast('Service not found.', true);
        if (Object.keys(catalog).length <= 1) {
            return toast('At least one service must remain in the catalog.', true);
        }
        const usageCount = state.projects.filter(function (p) {
            return String((p && p.primaryService) || '') === targetId;
        }).length;
        const message =
            usageCount > 0
                ? 'This service is assigned to ' +
                  String(usageCount) +
                  ' project(s). Delete it anyway? Existing projects will keep the raw ID.'
                : 'Delete this service from the catalog?';
        const ok = await confirmModal({
            title: 'Delete Service',
            message: message,
            confirmText: 'Delete',
        });
        if (!ok) return;
        delete catalog[targetId];
        if (state.filters.service === targetId) state.filters.service = 'all';
        const applied = applyCatalogUpdate(catalog);
        if (!applied) return;
        try {
            if (!state.currentUser || !state.currentUser.uid) {
                toast('Catalog updated locally. Sign in to persist permanently.', true);
                return;
            }
            await persistServiceCatalogForUser(state.currentUser.uid, serviceCatalog());
            toast('Service removed permanently.');
        } catch (e) {
            console.error('Could not persist service catalog deletion to Firestore', e);
            toast('Service removed locally, but permanent save failed.', true);
        }
    }
    async function resetCatalogToDefaults() {
        const ok = await confirmModal({
            title: 'Reset Service Catalog',
            message: 'Reset your catalog to the default services shipped with this app?',
            confirmText: 'Reset',
        });
        if (!ok) return;
        window.serviceCatalog = deepClone(defaultServiceCatalogSnapshot);
        catalogEditorState.selectedServiceId = '';
        catalogEditorState.draft = null;
        try {
            window.localStorage.removeItem(SERVICE_CATALOG_STORAGE_KEY);
        } catch (e) {
            console.warn('Could not clear service catalog storage key', e);
        }
        populateServiceOptions();
        populateServiceFilterOptions();
        populateSidebarServices();
        if (state.currentView === 'catalogEditor') renderCatalogEditor();
        if (state.currentView === 'projects') renderProjects();
        if (state.currentView === 'dashboard') updateDashboard();
        if (state.currentProject && window.renderProjectDetail) {
            window.renderProjectDetail(state.currentProject);
        }
        try {
            if (!state.currentUser || !state.currentUser.uid) {
                toast('Catalog reset locally. Sign in to persist permanently.', true);
                return;
            }
            await persistServiceCatalogForUser(state.currentUser.uid, serviceCatalog());
            toast('Service catalog reset permanently.');
        } catch (e) {
            console.error('Could not persist service catalog reset to Firestore', e);
            toast('Catalog reset locally, but permanent save failed.', true);
        }
    }
    async function publishCatalogToAllAccounts() {
        if (!state.currentUser || !state.currentUser.uid) {
            return toast('Sign in first.', true);
        }
        if (!canPublishCatalogToAllAccounts()) {
            return toast('Only platform admins can update all accounts.', true);
        }
        if (!db || !db.collection) return toast('Database is not available.', true);
        let userDocs = [];
        try {
            const snap = await db.collection('users').get();
            userDocs = Array.isArray(snap.docs) ? snap.docs : [];
        } catch (e) {
            console.error('Could not load users for global catalog publish', e);
            return toast('Could not load user accounts.', true);
        }
        if (!userDocs.length) return toast('No user accounts found.', true);
        const ok = await confirmModal({
            title: 'Update All Accounts',
            message:
                'Apply the current service catalog to all ' +
                String(userDocs.length) +
                ' user accounts?',
            confirmText: 'Update All',
        });
        if (!ok) return;
        const catalog = serviceCatalog();
        let updated = 0;
        let failed = 0;
        for (const doc of userDocs) {
            try {
                await db.collection('users').doc(doc.id).set(
                    {
                        serviceCatalog: catalog,
                        serviceCatalogUpdatedAt: FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                );
                updated += 1;
            } catch (e) {
                failed += 1;
                console.error('Could not update service catalog for user', doc.id, e);
            }
        }
        if (failed > 0) {
            toast('Updated ' + updated + ' account(s). Failed: ' + failed + '.', true);
            return;
        }
        toast('Updated service catalog for ' + updated + ' account(s).');
    }
    function planTemplate() {
        return Array.isArray(window.bookProjectPlanTemplate) ? window.bookProjectPlanTemplate : [];
    }
    function serviceLabel(serviceId) {
        const catalog = serviceCatalog();
        return (catalog[serviceId] && catalog[serviceId].name) || serviceId || 'Service not assigned';
    }
    function primaryServiceDescription(serviceId) {
        const catalog = serviceCatalog();
        const service = catalog[String(serviceId || '')];
        if (!service) return '';
        const explicit = String(service.description || '').trim();
        if (explicit) return explicit;
        const category = String(service.category || '').trim();
        const deliverables = Array.isArray(service.deliverables)
            ? service.deliverables
                  .map(function (item) {
                      return String((item && item.title) || '').trim();
                  })
                  .filter(Boolean)
            : [];
        const prefix = category ? category + ' service.' : 'Service.';
        if (!deliverables.length) return prefix;
        const preview = deliverables.slice(0, 2).join('; ');
        const more = deliverables.length > 2 ? ' +' + (deliverables.length - 2) + ' more deliverables.' : '.';
        return prefix + ' Key deliverables: ' + preview + more;
    }
    function updatePrimaryServiceDescription() {
        const box = $('primaryServiceDescriptionBox');
        const text = $('primaryServiceDescriptionText');
        const select = $('primaryService');
        if (!box || !text || !select) return;
        const description = primaryServiceDescription(select.value);
        if (!description) {
            box.style.display = 'none';
            text.textContent = '';
            return;
        }
        box.style.display = 'block';
        text.textContent = description;
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
                    const deliverableApp = (d && d.application) || {};
                    const serviceApp = (service && service.application) || {};
                    out.push({
                        id: String(serviceId) + '__' + String(d.id || makeId('deliverable')),
                        serviceId: serviceId,
                        catalogDeliverableId: String(d.id || ''),
                        serviceName: service.name,
                        title: d.title || 'Deliverable',
                        applicationLink: normalizeApplicationValue(
                            deliverableApp.link || d.applicationLink,
                            serviceApp.link || service.applicationLink || DEFAULT_APPLICATION_LINK
                        ),
                        applicationPage: normalizeApplicationValue(
                            deliverableApp.page || d.applicationPage,
                            serviceApp.page || service.applicationPage || DEFAULT_APPLICATION_PAGE
                        ),
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
        applySidebarState();
    }

    function switchView(view) {
        state.currentView = view;
        if (isMobileLayout() && state.ui.mobileSidebarOpen) {
            state.ui.mobileSidebarOpen = false;
            applySidebarState();
        }
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
        if (view === 'catalogEditor') renderCatalogEditor();
    }
    function isMobileLayout() {
        return !!(window.matchMedia && window.matchMedia('(max-width: 1000px)').matches);
    }
    function applySidebarState() {
        const app = $('mainApp');
        const mobileBtn = $('mobileSidebarBtn');
        const edgeToggleBtn = $('sidebarEdgeToggleBtn');
        const backdrop = $('sidebarBackdrop');
        const mobile = isMobileLayout();
        if (app) {
            if (mobile) {
                app.classList.remove('sidebar-collapsed');
                app.classList.toggle('mobile-sidebar-open', !!state.ui.mobileSidebarOpen);
            } else {
                state.ui.mobileSidebarOpen = false;
                app.classList.remove('mobile-sidebar-open');
                if (state.ui.sidebarCollapsed) app.classList.add('sidebar-collapsed');
                else app.classList.remove('sidebar-collapsed');
            }
        }
        if (edgeToggleBtn) {
            edgeToggleBtn.textContent = state.ui.sidebarCollapsed ? '>>' : '<<';
            edgeToggleBtn.setAttribute('aria-expanded', state.ui.sidebarCollapsed ? 'false' : 'true');
            edgeToggleBtn.setAttribute('aria-label', state.ui.sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar');
        }
        if (mobileBtn) {
            mobileBtn.textContent = state.ui.mobileSidebarOpen ? 'Close' : 'Menu';
            mobileBtn.setAttribute('aria-expanded', state.ui.mobileSidebarOpen ? 'true' : 'false');
        }
        if (backdrop) {
            backdrop.setAttribute('aria-hidden', state.ui.mobileSidebarOpen ? 'false' : 'true');
        }
    }
    function toggleSidebar() {
        if (isMobileLayout()) {
            toggleMobileSidebar();
            return;
        }
        if (!state.ui) state.ui = {};
        state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
        applySidebarState();
    }
    function toggleMobileSidebar() {
        if (!state.ui) state.ui = {};
        state.ui.mobileSidebarOpen = !state.ui.mobileSidebarOpen;
        applySidebarState();
    }
    function closeMobileSidebar() {
        if (!state.ui || !state.ui.mobileSidebarOpen) return;
        state.ui.mobileSidebarOpen = false;
        applySidebarState();
    }
    function ensureCatalogEditorScaffold() {
        const sidebar = $('appSidebar');
        if (sidebar && !sidebar.querySelector('.sidebar-link[data-view="catalogEditor"]')) {
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'sidebar-link';
            link.dataset.view = 'catalogEditor';
            link.textContent = 'Catalog Editor';
            const maturityLink = sidebar.querySelector('.sidebar-link[data-view="maturity"]');
            if (maturityLink && maturityLink.parentNode) maturityLink.insertAdjacentElement('afterend', link);
            else {
                const servicesWrap = $('sidebarServices');
                if (servicesWrap && servicesWrap.parentNode === sidebar) sidebar.insertBefore(link, servicesWrap);
                else sidebar.appendChild(link);
            }
        }
        if (!$('catalogEditorView')) {
            const main = document.querySelector('.main-content');
            if (!main) return;
            const section = document.createElement('section');
            section.id = 'catalogEditorView';
            section.className = 'view-content';
            section.style.display = 'none';
            section.innerHTML =
                '<div class="page-header"><div><h2>Catalog Editor</h2><p class="muted">Manage the service catalog used by projects, filters, and workflows.</p></div></div><div id="catalogEditorContent"></div>';
            const diagnosticView = $('diagnosticView');
            if (diagnosticView && diagnosticView.parentNode === main)
                main.insertBefore(section, diagnosticView);
            else main.appendChild(section);
        }
    }
    function getShowDeletedEngagementPeople() {
        return !!(state.ui && state.ui.showDeletedEngagementPeople);
    }
    function setShowDeletedEngagementPeople(value) {
        if (!state.ui) state.ui = {};
        state.ui.showDeletedEngagementPeople = !!value;
    }

    function emptyState(message) {
        return '<div class="empty-state"><h4>No projects found</h4><p>' + escapeHtml(message) + '</p></div>';
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
        if (!state.maturity)
            state.maturity = {
                scores: {},
                dataReadinessScores: {},
                overestimationChecks: {},
                dataGovernanceChecks: {},
                lastCalculatedAt: null,
            };
        if (!state.maturity.scores) state.maturity.scores = {};
        if (!state.maturity.dataReadinessScores) state.maturity.dataReadinessScores = {};
        if (!state.maturity.overestimationChecks) state.maturity.overestimationChecks = {};
        if (!state.maturity.dataGovernanceChecks) state.maturity.dataGovernanceChecks = {};
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
        maturityOverestimationChecks.forEach(function (item) {
            if (typeof state.maturity.overestimationChecks[item.id] === 'undefined') {
                state.maturity.overestimationChecks[item.id] = false;
            }
        });
        dataGovernanceChecklistItems.forEach(function (item) {
            const key = String(item);
            if (typeof state.maturity.dataGovernanceChecks[key] === 'undefined') {
                state.maturity.dataGovernanceChecks[key] = false;
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

    function selectedOverestimationChecks() {
        return maturityOverestimationChecks.filter(function (item) {
            return !!state.maturity.overestimationChecks[item.id];
        });
    }

    function adjustedScoreRange(total) {
        const flagged = selectedOverestimationChecks();
        if (total <= 40 || flagged.length === 0) return null;
        return {
            flagged: flagged,
            min: Math.max(11, total - 15),
            max: Math.max(11, total - 10),
        };
    }

    function stopGateFindings() {
        return maturityModelDimensions
            .filter(function (dimension) {
                const score = Number(state.maturity.scores[dimension.id] || 0);
                return score > 0 && score < 3 && dimension.stopGate;
            })
            .map(function (dimension) {
                return {
                    title: dimension.title,
                    score: Number(state.maturity.scores[dimension.id] || 0),
                    stopGate: dimension.stopGate,
                };
            });
    }

    function completedDataGovernanceChecks() {
        return dataGovernanceChecklistItems.filter(function (item) {
            return !!state.maturity.dataGovernanceChecks[String(item)];
        }).length;
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
                '<article class="maturity-report-panel"><h3>Assessment Report</h3><p class="muted">Score all ' +
                maturityModelDimensions.length +
                ' dimensions to generate a full report.</p><ul class="maturity-mini-list">' +
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
        const externalValidationWarning =
            total > 44
                ? "<p class='maturity-warning'>Score above 44. Validate externally to counter optimism bias.</p>"
                : '';
        const highScorePrompt =
            total > 40
                ? "<p class='small'>For scores above 40, apply warning-sign checks and reduce score by 10-15 points if any apply.</p>"
                : '';
        const adjustedRange = adjustedScoreRange(total);
        const adjustedRangeWarning = adjustedRange
            ? "<p class='maturity-warning'>Overestimation warning signs selected. Reassess using an adjusted score range of " +
              adjustedRange.min +
              '-' +
              adjustedRange.max +
              '.</p>'
            : '';
        const stopFindings = stopGateFindings();
        const stopGateWarning = stopFindings.length
            ? "<div class='maturity-warning'><strong>STOP Red Flags:</strong><ul class='maturity-mini-list'>" +
              stopFindings
                  .map(function (finding) {
                      return (
                          '<li>' +
                          escapeHtml(finding.title) +
                          ' scored ' +
                          finding.score +
                          '. ' +
                          escapeHtml(finding.stopGate.action) +
                          '</li>'
                      );
                  })
                  .join('') +
              "</ul><p class='small'>Rule: if any STOP dimension is below 3, do not proceed with major transformation investment.</p></div>"
            : '';
        const governanceComplete = completedDataGovernanceChecks();
        const governanceBlock =
            "<div class='maturity-data-readiness'><h4>Data Governance Checklist</h4><p><strong>Completed:</strong> " +
            governanceComplete +
            ' / ' +
            dataGovernanceChecklistItems.length +
            '</p></div>';
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
            ' / 55</div></div><div><span class="muted">Readiness Level</span><div class="maturity-band">' +
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
            highScorePrompt +
            externalValidationWarning +
            adjustedRangeWarning +
            stopGateWarning +
            "<p class='small'>Conservative scoring rule: if between levels, choose the lower level.</p>" +
            dataReadinessBlock +
            governanceBlock +
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
            '<div class="page-header"><div><h2>Maturity Model</h2><p class="muted">Assess readiness across eleven dimensions and generate a leadership report.</p></div><div class="project-actions"><button id="maturityResetBtn" class="btn-secondary" type="button">Reset</button><button id="maturityGenerateBtn" class="btn-primary" type="button">Generate Report</button></div></div><div class="maturity-grid">' +
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
                        '</p><p class="small"><strong>Scale:</strong> ' +
                        escapeHtml(dimension.scale || '') +
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
            '</div></article><article class="maturity-deep-dive"><h3>Critical Validation Checks</h3><p class="small">If score is above 40 and any warning applies, reduce score by 10-15 points and reassess.</p><div class="maturity-deep-grid">' +
            maturityOverestimationChecks
                .map(function (item) {
                    return (
                        '<label class="maturity-data-card"><input type="checkbox" class="maturity-warning-check" data-warning-id="' +
                        escapeHtml(item.id) +
                        '" ' +
                        (state.maturity.overestimationChecks[item.id] ? 'checked' : '') +
                        ' /> ' +
                        escapeHtml(item.label) +
                        '</label>'
                    );
                })
                .join('') +
            '</div></article><article class="maturity-deep-dive"><h3>Data Governance Maturity Checklist</h3><div class="maturity-deep-grid">' +
            dataGovernanceChecklistItems
                .map(function (item) {
                    return (
                        '<label class="maturity-data-card"><input type="checkbox" class="maturity-governance-check" data-governance-key="' +
                        escapeHtml(item) +
                        '" ' +
                        (state.maturity.dataGovernanceChecks[String(item)] ? 'checked' : '') +
                        ' /> ' +
                        escapeHtml(item) +
                        '</label>'
                    );
                })
                .join('') +
            '</div></article><article class="maturity-deep-dive"><h3>Shadow AI Audit Guide</h3><p class="small"><strong>Discovery methods:</strong></p><ul class="maturity-mini-list">' +
            shadowAIDiscoveryMethods
                .map(function (method) {
                    return '<li>' + escapeHtml(method) + '</li>';
                })
                .join('') +
            '</ul><p class="small"><strong>Risk tiers:</strong></p><ul class="maturity-mini-list">' +
            shadowAIRiskTiers
                .map(function (tier) {
                    return (
                        '<li><strong>' +
                        escapeHtml(tier.tier) +
                        ':</strong> ' +
                        escapeHtml(tier.trigger) +
                        ' | ' +
                        escapeHtml(tier.response) +
                        '</li>'
                    );
                })
                .join('') +
            '</ul></article><article class="maturity-deep-dive"><h3>Stakeholder Mapping</h3><p class="small">Map 15-25 stakeholders by Influence and Interest; define engagement plans for each quadrant.</p><ul class="maturity-mini-list">' +
            stakeholderMappingQuadrants
                .map(function (quadrant) {
                    return '<li><strong>' + escapeHtml(quadrant.name) + ':</strong> ' + escapeHtml(quadrant.guidance) + '</li>';
                })
                .join('') +
            '</ul></article><section id="maturityReport"></section>';

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
        document.querySelectorAll('.maturity-warning-check').forEach(function (checkbox) {
            checkbox.addEventListener('change', function (e) {
                const key = String(e.target.dataset.warningId || '');
                state.maturity.overestimationChecks[key] = !!e.target.checked;
                refreshMaturityReport();
            });
        });
        document.querySelectorAll('.maturity-governance-check').forEach(function (checkbox) {
            checkbox.addEventListener('change', function (e) {
                const key = String(e.target.dataset.governanceKey || '');
                state.maturity.dataGovernanceChecks[key] = !!e.target.checked;
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
                maturityOverestimationChecks.forEach(function (item) {
                    state.maturity.overestimationChecks[item.id] = false;
                });
                dataGovernanceChecklistItems.forEach(function (item) {
                    state.maturity.dataGovernanceChecks[String(item)] = false;
                });
                state.maturity.lastCalculatedAt = null;
                renderMaturityModel();
            });
        }
        if ($('maturityGenerateBtn')) {
            $('maturityGenerateBtn').addEventListener('click', function () {
                if (!allMaturityDimensionsScored()) {
                    toast('Score all ' + maturityModelDimensions.length + ' dimensions to generate the report', true);
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
            platformAdmin: false,
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
        state.currentUserProfile = profile || null;
        const name = profile.name || user.displayName || user.email || 'User';
        if ($('userName')) $('userName').textContent = name;
        if ($('userAvatar')) $('userAvatar').textContent = initials(name);
        if ($('currentUserName')) $('currentUserName').textContent = name;
        await loadProjects(user.uid);
        const profileCatalog = normalizeCatalogData(profile && profile.serviceCatalog ? profile.serviceCatalog : {});
        if (Object.keys(profileCatalog).length) {
            applyCatalogUpdate(profileCatalog);
            return;
        }
        if (hasStoredServiceCatalog()) {
            try {
                await persistServiceCatalogForUser(user.uid, serviceCatalog());
            } catch (e) {
                console.warn('Could not migrate local service catalog to Firestore', e);
            }
        }
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
                        platformAdmin: false,
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
        updatePrimaryServiceDescription();
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
        state.filters.service = select.value || 'all';
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
                link.dataset.action = 'launch-service-application';
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
        updatePrimaryServiceDescription();
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
        updatePrimaryServiceDescription();
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
    function consumePostLoginUrlActions() {
        try {
            const url = new URL(window.location.href);
            const action = String(url.searchParams.get('action') || '').trim().toLowerCase();
            const requestedView = String(url.searchParams.get('view') || '').trim();
            const requestedProjectId = String(url.searchParams.get('projectId') || '').trim();
            const validViews = ['dashboard', 'projects', 'maturity', 'catalogEditor', 'team', 'diagnostic'];
            let consumed = false;
            if (requestedView && validViews.includes(requestedView)) {
                switchView(requestedView);
                consumed = true;
            }
            if (action === 'new-project') {
                openProjectModal();
                consumed = true;
            }
            if (requestedProjectId) {
                openProject(requestedProjectId);
                consumed = true;
            }
            if (!consumed) return;
            url.searchParams.delete('action');
            url.searchParams.delete('view');
            url.searchParams.delete('projectId');
            url.searchParams.delete('projectName');
            const nextQuery = url.searchParams.toString();
            const nextUrl = url.pathname + (nextQuery ? '?' + nextQuery : '') + url.hash;
            window.history.replaceState({}, '', nextUrl);
        } catch (e) {
            console.warn('Could not process post-login URL actions', e);
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
                case 'filter-service':
                    event.preventDefault();
                    state.filters.service = el.dataset.service || 'all';
                    if ($('serviceFilter')) $('serviceFilter').value = state.filters.service;
                    switchView('projects');
                    renderProjects();
                    break;
                case 'launch-service-application':
                    event.preventDefault();
                    launchServiceApplication(el.dataset.service);
                    break;
                case 'launch-deliverable-application':
                    event.preventDefault();
                    launchDeliverableApplication(el.dataset.deliverableId, el.dataset.serviceId);
                    break;
                case 'new-catalog-service':
                    event.preventDefault();
                    startNewCatalogService();
                    break;
                case 'select-catalog-service':
                    event.preventDefault();
                    if (el.dataset.serviceId) selectCatalogService(el.dataset.serviceId);
                    break;
                case 'save-catalog-service':
                    event.preventDefault();
                    saveCatalogService().catch(console.error);
                    break;
                case 'delete-catalog-service':
                    event.preventDefault();
                    deleteCatalogService(el.dataset.serviceId).catch(console.error);
                    break;
                case 'reset-catalog-defaults':
                    event.preventDefault();
                    resetCatalogToDefaults().catch(console.error);
                    break;
                case 'publish-catalog-all-accounts':
                    event.preventDefault();
                    publishCatalogToAllAccounts().catch(console.error);
                    break;
                case 'add-catalog-deliverable':
                    event.preventDefault();
                    addCatalogDeliverable();
                    break;
                case 'remove-catalog-deliverable':
                    event.preventDefault();
                    removeCatalogDeliverable(el.dataset.index);
                    break;
                case 'add-catalog-step':
                    event.preventDefault();
                    addCatalogGuideStep();
                    break;
                case 'remove-catalog-step':
                    event.preventDefault();
                    removeCatalogGuideStep(el.dataset.index);
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
        ensureCatalogEditorScaffold();
        populateServiceOptions();
        populateServiceFilterOptions();
        populateSidebarServices();
        applySidebarState();

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
        if ($('sidebarEdgeToggleBtn')) $('sidebarEdgeToggleBtn').addEventListener('click', toggleSidebar);
        if ($('mobileSidebarBtn')) $('mobileSidebarBtn').addEventListener('click', toggleMobileSidebar);
        if ($('sidebarBackdrop')) $('sidebarBackdrop').addEventListener('click', closeMobileSidebar);
        window.addEventListener('resize', applySidebarState);

        document.querySelectorAll('.sidebar-link[data-view]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                switchView(el.dataset.view);
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
        if ($('primaryService')) $('primaryService').addEventListener('change', updatePrimaryServiceDescription);
        if ($('searchProjects')) $('searchProjects').addEventListener('input', function (e) {
            state.filters.query = e.target.value || '';
            renderProjects();
        });
        if ($('catalogEditorContent')) {
            $('catalogEditorContent').addEventListener('submit', function (e) {
                if (!e.target || e.target.id !== 'catalogEditorForm') return;
                e.preventDefault();
                saveCatalogService().catch(console.error);
            });
        }
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
            launchServiceApplication: launchServiceApplication,
            launchDeliverableApplication: launchDeliverableApplication,
            makeId: makeId,
        };
    }

    async function initialize() {
        hydrateServiceCatalogFromStorage();
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
                state.currentUserProfile = null;
                showLogin();
                return;
            }
            state.currentUser = user;
            showApp();
            try {
                await loadUserData(user);
                switchView(state.currentView || 'dashboard');
                consumePostLoginUrlActions();
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
