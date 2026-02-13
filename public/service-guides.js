// Consultant guide templates aligned to the Oblongix service portfolio.
(function () {
    const guides = {
        'executive-ai-advisor': {
            fullDescription:
                'CEO-level advisory to set AI as business redesign with disciplined governance and measurable value outcomes.',
            keyInputs: ['Corporate strategy and board agenda', 'Current AI initiatives', 'Risk posture'],
            stakeholders: ['CEO', 'COO/CFO', 'Business unit leaders', 'Risk/legal leaders'],
            steps: ['Align executive priorities', 'Prioritize decisions', 'Define governance', 'Activate leadership cadence'],
            outcomeExample: 'Leadership approves a focused 90-day value plan with named owners and risk controls.',
        },
        'board-level-ai-advisory': {
            fullDescription: 'Board-focused advisory to strengthen AI oversight, risk controls, and accountability.',
            keyInputs: ['Board governance calendar', 'AI risk data', 'Policy/control baseline'],
            stakeholders: ['Board chair', 'Audit/risk committee', 'CEO', 'General counsel'],
            steps: ['Assess board readiness', 'Define oversight metrics', 'Set escalation rules', 'Embed board routines'],
            outcomeExample: 'Board uses a repeatable AI oversight framework with intervention triggers.',
        },
        'startup-advisory': {
            fullDescription:
                'Founder advisory to turn AI ambition into durable positioning, practical execution, and investor confidence.',
            keyInputs: ['GTM and product roadmap', 'Unit economics', 'Team capability baseline'],
            stakeholders: ['Founder/CEO', 'Product and engineering leads', 'GTM lead', 'Investors'],
            steps: ['Frame value thesis', 'Design offer model', 'Prioritize build roadmap', 'Run execution rhythm'],
            outcomeExample: 'Startup aligns growth roadmap with clear differentiation and accountable milestones.',
        },
        'ai-strategy-design': {
            fullDescription: 'Enterprise AI strategy design tied to growth, margin, and risk outcomes.',
            keyInputs: ['Strategic priorities', 'Process pain points', 'Data/platform constraints'],
            stakeholders: ['Executive sponsor', 'Business owners', 'Data/tech leadership', 'Finance'],
            steps: ['Map value pools', 'Prioritize use cases', 'Design operating model', 'Define investment path'],
            outcomeExample: 'Board-ready strategy pack with prioritized initiatives, owners, and business targets.',
        },
        'ai-transformation-roadmap': {
            fullDescription: 'Phased transformation roadmap from alignment through embed/govern execution.',
            keyInputs: ['Approved strategy', 'Capacity model', 'Dependencies and constraints'],
            stakeholders: ['Transformation lead', 'PMO', 'Business owners', 'Risk/compliance'],
            steps: ['Plan implementation waves', 'Map resources and budget', 'Define risk mitigations', 'Launch tracking cadence'],
            outcomeExample: 'One shared roadmap with milestones, owners, and governance checkpoints.',
        },
        'delivery-oversight': {
            fullDescription: 'Hands-on oversight to keep delivery on track and benefits measurable.',
            keyInputs: ['Initiative plans', 'Status reports', 'Benefits baselines'],
            stakeholders: ['Program sponsor', 'Delivery leads', 'Product owners', 'Risk/control leads'],
            steps: ['Baseline delivery health', 'Reinforce governance', 'Track benefits realization', 'Stabilize and handover'],
            outcomeExample: 'Delivery rhythm shifts from activity reporting to value-focused execution control.',
        },
        fundamentals: {
            fullDescription: 'Foundational service to improve data, ownership, and operational readiness for scale.',
            keyInputs: ['Data quality evidence', 'Current tooling/workflows', 'Ownership map'],
            stakeholders: ['Data owners', 'Operations leaders', 'Technology leads'],
            steps: ['Diagnose foundation gaps', 'Design ownership model', 'Define control baseline', 'Sequence priority fixes'],
            outcomeExample: 'Core foundation backlog is prioritized with owners, controls, and immediate next actions.',
        },
        assessments: {
            fullDescription: 'Readiness and risk assessment to identify gaps and define remediation priorities.',
            keyInputs: ['Interview notes', 'Initiative inventory', 'Policies and control evidence'],
            stakeholders: ['Executive sponsor', 'Risk/compliance', 'Business and tech leads'],
            steps: ['Assess maturity', 'Analyze gaps and risks', 'Map constraints', 'Prioritize remediation'],
            outcomeExample: 'Leadership gets a clear go/no-go view and a practical remediation path.',
        },
        'reporting-analytics': {
            fullDescription: 'Decision intelligence reporting linking AI activity to business outcomes.',
            keyInputs: ['KPI/KRI baseline', 'Current dashboard landscape', 'Executive reporting needs'],
            stakeholders: ['Executive sponsor', 'Finance', 'Analytics team', 'Process owners'],
            steps: ['Design metric architecture', 'Define reporting model', 'Add scenario intelligence', 'Embed reporting cadence'],
            outcomeExample: 'One trusted reporting layer used for governance, escalation, and value tracking.',
        },
        'executive-keynotes': {
            fullDescription: 'Executive keynote engagements focused on practical AI transformation leadership.',
            keyInputs: ['Audience profile', 'Event objectives', 'Strategic context'],
            stakeholders: ['Event sponsor', 'Executive audience', 'Communications lead'],
            steps: ['Frame narrative', 'Build keynote content', 'Deliver session', 'Activate follow-through'],
            outcomeExample: 'Leaders leave with a common transformation narrative and immediate actions.',
        },
        'private-corporate-talks': {
            fullDescription: 'Private corporate talks tailored to specific enterprise context and challenges.',
            keyInputs: ['Company priorities', 'Audience roles', 'Current maturity and friction points'],
            stakeholders: ['Executive sponsor', 'Leadership team', 'Strategy/communications'],
            steps: ['Discover context', 'Customize talk', 'Deliver and facilitate', 'Summarize actions'],
            outcomeExample: 'Leadership gains a context-specific plan for strategy, governance, and execution.',
        },
        'conference-speaking-market-positioning': {
            fullDescription: 'Conference speaking to position market narrative around disciplined AI transformation.',
            keyInputs: ['Conference theme', 'Audience and positioning objective', 'Narrative pillars'],
            stakeholders: ['Speaker sponsor', 'Conference organizer', 'Marketing/brand team'],
            steps: ['Define positioning', 'Build speaking assets', 'Deliver at event', 'Extend thought leadership'],
            outcomeExample: 'Conference content drives market positioning and reusable thought-leadership assets.',
        },
        'executive-workshops': {
            fullDescription: 'Facilitated workshops that convert leadership debate into decisions and actions.',
            keyInputs: ['Workshop goals', 'Decision topics', 'Baseline diagnostics'],
            stakeholders: ['Executive sponsor', 'Cross-functional leaders', 'Facilitator'],
            steps: ['Design workshop agenda', 'Align on baseline', 'Facilitate decisions', 'Launch action plan'],
            outcomeExample: 'Workshop outputs become a 30/60/90-day plan with clear accountability.',
        },
        'small-group-leadership-intensives': {
            fullDescription: 'Confidential small-group intensives for high-stakes decision resolution.',
            keyInputs: ['Critical unresolved decisions', 'Constraint and risk context', 'Deadline pressure'],
            stakeholders: ['CEO/executive sponsor', 'Selected leadership group', 'Facilitator'],
            steps: ['Scope intensive', 'Review trade-offs', 'Resolve decisions', 'Track follow-through'],
            outcomeExample: 'Stalled strategic decisions are resolved and converted into owned execution tasks.',
        },
        'ai-literacy-non-technical-leaders': {
            fullDescription: 'Leadership literacy programme for non-technical decision-makers and overseers.',
            keyInputs: ['Participant baseline', 'Role requirements', 'Governance decision needs'],
            stakeholders: ['Leadership participants', 'Executive sponsor', 'L&D lead'],
            steps: ['Assess literacy baseline', 'Teach core concepts', 'Apply to live decisions', 'Reinforce adoption'],
            outcomeExample: 'Leaders build practical confidence to govern and challenge AI decisions responsibly.',
        },
        'themed-education-sessions': {
            fullDescription: 'Focused education sessions on operating model, risk, and ethics themes.',
            keyInputs: ['Theme scope', 'Audience profile', 'Policy and workflow context'],
            stakeholders: ['Session sponsor', 'Leadership participants', 'Risk/ethics representatives'],
            steps: ['Scope theme', 'Build practical content', 'Deliver facilitated session', 'Translate to operating changes'],
            outcomeExample: 'Participants leave with actionable policy/process updates tied to the selected theme.',
        },
        'ceo-guide-training-programme': {
            fullDescription: 'Structured leadership training based on The CEO\'s Guide to AI Transformation.',
            keyInputs: ['Leadership commitment', 'Current maturity baseline', 'Decision/workflow priorities'],
            stakeholders: ['CEO and executive team', 'Transformation office', 'Programme facilitator'],
            steps: ['Baseline and brief', 'Redesign decisions/workflows', 'Define governance model', 'Activate implementation plan'],
            outcomeExample: 'Executive team completes a structured programme and aligns on implementation ownership.',
        },
        'oblongix-ai-transformation-platform': {
            fullDescription:
                'Platform-led delivery service to run consulting engagements with structured controls and visibility.',
            keyInputs: ['Engagement scope', 'Roles/permissions', 'Milestones and reporting requirements'],
            stakeholders: ['Engagement lead', 'Consulting team', 'Client sponsor', 'Governance stakeholders'],
            steps: ['Configure workspace', 'Activate playbooks', 'Track delivery and risks', 'Scale operating cadence'],
            outcomeExample: 'Teams deliver with consistent controls, reusable playbooks, and transparent reporting.',
        },
    };

    const categoryDefaults = {
        advisory: {
            keyInputs: ['Executive strategy priorities', 'Decision backlog', 'Risk posture and policy constraints'],
            stakeholders: ['CEO/Executive sponsor', 'Business leadership', 'Risk and legal leadership'],
        },
        consulting: {
            keyInputs: ['Business objectives', 'Current process/data baseline', 'Delivery constraints'],
            stakeholders: ['Program sponsor', 'Business/process owners', 'Data and technology leads'],
        },
        speaking: {
            keyInputs: ['Audience profile', 'Session objectives', 'Context and narrative requirements'],
            stakeholders: ['Event sponsor', 'Leadership audience', 'Communications lead'],
        },
        workshops: {
            keyInputs: ['Workshop goals', 'Participant context', 'Decision focus areas'],
            stakeholders: ['Executive sponsor', 'Workshop participants', 'Facilitation lead'],
        },
        training: {
            keyInputs: ['Learning objectives', 'Participant baseline', 'Expected behavior change'],
            stakeholders: ['Programme sponsor', 'Participants', 'Learning lead'],
        },
        platform: {
            keyInputs: ['Engagement scope', 'Team roles and permissions', 'Reporting and governance requirements'],
            stakeholders: ['Engagement lead', 'Consulting team', 'Client sponsor'],
        },
        default: {
            keyInputs: ['Strategic priorities', 'Current-state baseline', 'Risk and control constraints'],
            stakeholders: ['Executive sponsor', 'Delivery owner', 'Domain stakeholders'],
        },
    };

    const defaultStepNames = [
        'Align and Scope',
        'Diagnose Current State',
        'Design and Decide',
        'Embed and Transfer',
    ];

    function normalizeText(value, fallback) {
        const text = String(value == null ? '' : value).trim();
        return text || String(fallback || '').trim();
    }

    function categoryKey(service) {
        const raw = String((service && service.category) || '').toLowerCase();
        if (raw === 'advisory') return 'advisory';
        if (raw === 'consulting') return 'consulting';
        if (raw === 'speaking') return 'speaking';
        if (raw === 'workshops') return 'workshops';
        if (raw === 'training') return 'training';
        if (raw === 'platform') return 'platform';
        return 'default';
    }

    function pickList(list, fallback) {
        const out = Array.isArray(list)
            ? list
                  .map(function (item) {
                      return String(item == null ? '' : item).trim();
                  })
                  .filter(Boolean)
            : [];
        return out.length ? out : fallback.slice();
    }

    function buildStepObjects(rawSteps, serviceDeliverables) {
        const stepsIn = Array.isArray(rawSteps) && rawSteps.length ? rawSteps : defaultStepNames;
        const steps = stepsIn.map(function (item, index) {
            if (item && typeof item === 'object') {
                const named = normalizeText(item.name, 'Step ' + String(index + 1));
                const focus = normalizeText(item.focus, 'Focus area for this service phase.');
                const deliverables = pickList(item.deliverables, []);
                return { name: named, focus: focus, deliverables: deliverables };
            }
            return {
                name: normalizeText(item, 'Step ' + String(index + 1)),
                focus: 'Focus area for this service phase.',
                deliverables: [],
            };
        });
        while (steps.length < 4) {
            const idx = steps.length;
            steps.push({
                name: defaultStepNames[idx] || 'Step ' + String(idx + 1),
                focus: 'Focus area for this service phase.',
                deliverables: [],
            });
        }

        const serviceItems = (Array.isArray(serviceDeliverables) ? serviceDeliverables : [])
            .map(function (d) {
                return normalizeText(d && d.title, '');
            })
            .filter(Boolean);

        const assigned = {};
        steps.forEach(function (step) {
            step.deliverables.forEach(function (title) {
                assigned[title] = true;
            });
        });
        const remaining = serviceItems.filter(function (title) {
            return !assigned[title];
        });
        if (remaining.length) {
            let ptr = 0;
            while (ptr < remaining.length) {
                const stepIndex = ptr % steps.length;
                steps[stepIndex].deliverables.push(remaining[ptr]);
                ptr += 1;
            }
        }

        steps.forEach(function (step) {
            if (!step.deliverables.length) {
                step.deliverables = ['Step decision note', 'Step completion summary'];
            }
        });
        return steps;
    }

    function normalizeGuide(serviceId, service, guide) {
        const defaults = categoryDefaults[categoryKey(service)] || categoryDefaults.default;
        const name = normalizeText(service && service.name, serviceId);
        return {
            fullDescription: normalizeText(
                guide && guide.fullDescription,
                (service && service.description) ||
                    (name + ' consultant guide covering inputs, stakeholders, delivery steps, and outcomes.')
            ),
            keyInputs: pickList(guide && guide.keyInputs, defaults.keyInputs),
            stakeholders: pickList(guide && guide.stakeholders, defaults.stakeholders),
            steps: buildStepObjects(guide && guide.steps, service && service.deliverables),
            outcomeExample: normalizeText(
                guide && guide.outcomeExample,
                name + ' engagement completes with signed-off deliverables and clear next-step ownership.'
            ),
        };
    }

    const catalog = window.serviceCatalog || {};
    const normalized = {};
    Object.keys(catalog).forEach(function (serviceId) {
        normalized[serviceId] = normalizeGuide(serviceId, catalog[serviceId], guides[serviceId] || null);
    });

    window.serviceGuides = normalized;
})();
