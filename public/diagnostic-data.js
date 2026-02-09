// Diagnostic Framework Data
// This contains all the assessment criteria, interview protocols, and methodologies

const diagnosticData = {
    strategic: {
        name: 'Strategic Diagnostics',
        color: '#1F4E78',
        gradient: 'linear-gradient(135deg, #1F4E78, #4472C4)',
        modules: {
            businessRedesign: {
                id: 'businessRedesign',
                name: 'Business Redesign',
                chapter: 'Chapter 1: Declare AI a Business Redesign',
                duration: '2 weeks',
                sections: [
                    {
                        id: 'executiveOwnership',
                        name: 'Executive Ownership & Accountability',
                        weight: 'high',
                        criteria: [
                            {
                                id: 'ceo_ownership',
                                text: 'CEO explicitly owns AI transformation (not delegated to CTO/CIO)',
                                evidence:
                                    'Organizational announcement, reporting structure, CEO calendar time allocation',
                                weight: 'high',
                            },
                            {
                                id: 'bu_accountability',
                                text: 'Business unit leaders have AI outcomes in their P&L accountability',
                                evidence:
                                    'Performance contracts, P&L reporting, incentive structures',
                                weight: 'high',
                            },
                            {
                                id: 'exec_compensation',
                                text: 'Executive compensation includes AI transformation metrics',
                                evidence: 'Compensation committee documents, executive KPIs',
                                weight: 'medium',
                            },
                            {
                                id: 'ceo_time',
                                text: 'CEO dedicates ≥20% time to AI transformation activities',
                                evidence: 'Calendar analysis, meeting participation logs',
                                weight: 'medium',
                            },
                            {
                                id: 'decision_authority',
                                text: 'AI strategy decisions made by CEO and business leadership, not IT',
                                evidence:
                                    'Decision logs, strategy session participants, approval authorities',
                                weight: 'high',
                            },
                        ],
                    },
                    {
                        id: 'strategicIntegration',
                        name: 'Strategic Integration',
                        weight: 'high',
                        criteria: [
                            {
                                id: 'strategic_plan',
                                text: 'AI explicitly integrated into corporate strategic plan',
                                evidence:
                                    'Strategic plan document with specific AI initiatives and outcomes',
                                weight: 'high',
                            },
                            {
                                id: 'dedicated_budget',
                                text: 'AI transformation has dedicated budget line separate from IT',
                                evidence:
                                    'Budget documents showing AI investment vs. IT operations',
                                weight: 'medium',
                            },
                            {
                                id: 'board_review',
                                text: 'Board regularly reviews AI as strategic agenda item (not just updates)',
                                evidence:
                                    'Board minutes showing discussion, decisions, and time allocation',
                                weight: 'high',
                            },
                            {
                                id: 'business_value',
                                text: 'AI investment justified by business value, not technology exploration',
                                evidence:
                                    'Business cases with NPV, ROI, and P&L impact projections',
                                weight: 'high',
                            },
                            {
                                id: 'kill_process',
                                text: 'Clear process exists to kill AI initiatives not delivering business value',
                                evidence: 'Portfolio governance decisions, documented terminations',
                                weight: 'medium',
                            },
                        ],
                    },
                    {
                        id: 'processRedesign',
                        name: 'Business Process Redesign',
                        weight: 'medium',
                        criteria: [
                            {
                                id: 'explicit_processes',
                                text: 'AI strategy explicitly names business processes to be redesigned',
                                evidence:
                                    'Process maps, transformation plans, before/after designs',
                                weight: 'high',
                            },
                            {
                                id: 'process_ownership',
                                text: 'Process owners co-own AI initiatives affecting their domains',
                                evidence: 'RACI matrices, joint accountability structures',
                                weight: 'medium',
                            },
                            {
                                id: 'impact_assessment',
                                text: 'Impact assessment completed for core workflows',
                                evidence: 'Process impact analysis, change impact documents',
                                weight: 'medium',
                            },
                            {
                                id: 'prioritization',
                                text: 'Investment prioritization based on process criticality and value',
                                evidence:
                                    'Prioritization criteria, scoring models, approval decisions',
                                weight: 'high',
                            },
                            {
                                id: 'tradeoff_governance',
                                text: 'Clear governance for process vs. technology trade-offs',
                                evidence:
                                    'Decision frameworks, escalation mechanisms, resolved conflicts',
                                weight: 'medium',
                            },
                        ],
                    },
                ],
                interviewProtocol: {
                    ceo: {
                        duration: 90,
                        questions: [
                            {
                                category: 'Strategic Vision & Positioning',
                                time: 20,
                                questions: [
                                    {
                                        q: "How do you describe the role of AI in the company's future? What makes it different from previous technology transformations?",
                                        probes: [
                                            'Business model impact vs. process improvement',
                                            'Timeline expectations',
                                            'Market positioning',
                                        ],
                                    },
                                    {
                                        q: 'Walk me through the last three major decisions you made regarding AI. How did you make them?',
                                        probes: [
                                            'Decision criteria',
                                            'Who was involved',
                                            'Trade-offs considered',
                                            'How outcomes were defined',
                                        ],
                                    },
                                    {
                                        q: 'What would cause you to significantly reduce or redirect AI investments?',
                                        probes: [
                                            'Kill criteria',
                                            'Risk tolerance',
                                            'Monitoring mechanisms',
                                        ],
                                    },
                                ],
                            },
                            {
                                category: 'Ownership & Accountability',
                                time: 20,
                                questions: [
                                    {
                                        q: 'Who do you hold accountable when AI initiatives fail to deliver expected business value?',
                                        probes: [
                                            'Specific names',
                                            'Consequences',
                                            'How accountability is enforced',
                                        ],
                                    },
                                    {
                                        q: "How do your business unit leaders think about AI? Is it their responsibility or IT's responsibility?",
                                        probes: [
                                            'Perception gaps',
                                            'Cultural barriers',
                                            'Specific examples of ownership',
                                        ],
                                    },
                                    {
                                        q: "What percentage of your leadership team's variable compensation is tied to AI transformation outcomes?",
                                        probes: [
                                            'Specific metrics',
                                            'Thresholds',
                                            'Whether metrics are achievable',
                                            'Gaming potential',
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                },
                documents: [
                    {
                        type: 'Strategic Plan',
                        versions: 'Last 2 versions',
                        focus: 'AI prominence, integration, evolution',
                    },
                    {
                        type: 'Board Materials',
                        period: '12 months',
                        focus: 'Discussion quality, decision patterns, time allocation',
                    },
                    {
                        type: 'Budget/Finance',
                        items: 'AI investment tracking, business cases, actuals',
                        focus: 'P&L integration, ROI realization',
                    },
                    {
                        type: 'Org Charts',
                        versions: 'Current + planned',
                        focus: 'Reporting lines, span of control, AI placement',
                    },
                    {
                        type: 'Governance Docs',
                        items: 'Charters, decision authorities, RACI',
                        focus: 'Decision rights, escalation, accountability',
                    },
                ],
            },
            decisionArchitecture: {
                id: 'decisionArchitecture',
                name: 'Decision Architecture',
                chapter: 'Chapter 2: Redesign How Decisions Are Made',
                duration: '2 weeks',
                sections: [
                    {
                        id: 'decisionMapping',
                        name: 'Decision Mapping Completeness',
                        weight: 'high',
                        criteria: [
                            {
                                id: 'decisions_catalogued',
                                text: 'Critical business decisions catalogued and classified',
                                evidence:
                                    'Decision inventory with AI role classification (Advise/Decide/Human)',
                                weight: 'high',
                            },
                            {
                                id: 'authority_documented',
                                text: 'Decision authority explicitly documented for each process',
                                evidence: 'Authority matrices showing who decides what, when',
                                weight: 'high',
                            },
                            {
                                id: 'risk_assigned',
                                text: 'Risk level assigned to each AI-enabled decision point',
                                evidence: 'Risk assessment with impact and likelihood scoring',
                                weight: 'high',
                            },
                            {
                                id: 'quality_metrics',
                                text: 'Decision quality metrics defined and tracked',
                                evidence:
                                    'KPI definitions, measurement approach, historical tracking',
                                weight: 'medium',
                            },
                            {
                                id: 'review_thresholds',
                                text: 'Thresholds defined for when AI decisions require human review',
                                evidence:
                                    'Documented rules engine, confidence thresholds, exception criteria',
                                weight: 'high',
                            },
                        ],
                    },
                ],
            },
            // Additional modules would continue...
        },
    },
    operational: {
        name: 'Operational Diagnostics',
        color: '#C55A11',
        gradient: 'linear-gradient(135deg, #C55A11, #F4B183)',
        modules: {
            workflowEmbedding: {
                id: 'workflowEmbedding',
                name: 'Workflow Embedding',
                chapter: 'Chapter 3: Embed AI Into Core Workflows',
                duration: '2 weeks',
                sections: [
                    {
                        id: 'productionDeployment',
                        name: 'Production Deployment Maturity',
                        weight: 'high',
                        criteria: [
                            {
                                id: 'production_ratio',
                                text: '% of AI projects in production vs. pilot/POC',
                                evidence: 'Project portfolio with status classification',
                                weight: 'high',
                            },
                            {
                                id: 'system_integration',
                                text: 'AI solutions integrated into existing systems',
                                evidence: 'Architecture diagrams, API integration documentation',
                                weight: 'high',
                            },
                            {
                                id: 'deployment_time',
                                text: 'Average time from pilot to production deployment',
                                evidence: 'Project timelines, deployment cadence metrics',
                                weight: 'medium',
                            },
                            {
                                id: 'sla_monitoring',
                                text: 'Production AI systems have SLAs and monitoring',
                                evidence: 'SLA definitions, monitoring dashboards, alert logs',
                                weight: 'high',
                            },
                            {
                                id: 'rollback_capability',
                                text: 'Capability to rollback or disable AI features',
                                evidence: 'Deployment procedures, feature flags, rollback tests',
                                weight: 'medium',
                            },
                        ],
                    },
                ],
            },
        },
    },
    organizational: {
        name: 'Organizational Diagnostics',
        color: '#375623',
        gradient: 'linear-gradient(135deg, #375623, #70AD47)',
        modules: {
            workforceTransformation: {
                id: 'workforceTransformation',
                name: 'Workforce Transformation',
                chapter: 'Chapter 5: Recontract With Your Workforce',
                duration: '2 weeks',
                sections: [
                    {
                        id: 'roleImpact',
                        name: 'Role Impact & Workforce Planning',
                        weight: 'high',
                        criteria: [
                            {
                                id: 'impact_analysis',
                                text: 'Comprehensive role impact analysis completed',
                                evidence: 'Impact assessments showing which roles change and how',
                                weight: 'high',
                            },
                            {
                                id: 'workforce_scenarios',
                                text: 'Workforce planning scenarios for AI transformation',
                                evidence: 'Headcount models, skill mix evolution, hiring plans',
                                weight: 'high',
                            },
                            {
                                id: 'job_redesign',
                                text: 'Jobs redesigned (not just eliminated) for AI era',
                                evidence:
                                    'New role descriptions, career paths, progression frameworks',
                                weight: 'high',
                            },
                            {
                                id: 'clear_communication',
                                text: 'Clear communication on which roles safe/at risk/changing',
                                evidence:
                                    'Employee communications, FAQs, transparency on decisions',
                                weight: 'high',
                            },
                            {
                                id: 'transition_support',
                                text: 'Transition support for displaced or changed roles',
                                evidence: 'Severance, redeployment, outplacement programs',
                                weight: 'medium',
                            },
                        ],
                    },
                ],
            },
        },
    },
};

const maturityLevels = {
    1: {
        label: 'Ad Hoc / Denial',
        color: '#EF4444',
        description: 'Critical gaps, no systematic approach',
    },
    2: {
        label: 'Aware / Reactive',
        color: '#F59E0B',
        description: 'Aware of needs, nascent efforts',
    },
    3: {
        label: 'Structured / Planned',
        color: '#F59E0B',
        description: 'Some capability, inconsistent execution',
    },
    4: {
        label: 'Integrated / Executing',
        color: '#10B981',
        description: 'Strong capability, consistent execution',
    },
    5: {
        label: 'Optimizing / Thriving',
        color: '#10B981',
        description: 'Leading practice, sustainable excellence',
    },
};

// Service catalog aligned to the Oblongix website and The CEO's Guide framework.
const serviceCatalog = {
    'executive-ai-advisor': {
        id: 'executive-ai-advisor',
        name: 'Executive AI Advisor',
        category: 'Advisory',
        description:
            'CEO-level advisory that treats AI as business redesign, aligns initiatives to P&L and risk, and sets a focused transformation agenda.',
        deliverables: [
            { id: 'advisory-pack', title: 'Executive advisory pack (priorities, risks, decisions)' },
            { id: 'decision-briefs', title: 'Decision briefs (funding, vendors, organisational design)' },
            { id: 'leadership-narrative', title: 'Leadership narrative for internal alignment' },
        ],
    },
    'board-level-ai-advisory': {
        id: 'board-level-ai-advisory',
        name: 'Board-level AI Advisory',
        category: 'Advisory',
        description:
            'Board and executive oversight service for AI risk, value measurement, kill-switch governance, and accountability frameworks.',
        deliverables: [
            { id: 'board-briefing', title: 'Board briefing deck and decision notes' },
            { id: 'risk-posture', title: 'AI risk and opportunity posture statement' },
            { id: 'oversight-checklist', title: 'Governance and oversight checklist' },
        ],
    },
    'startup-advisory': {
        id: 'startup-advisory',
        name: 'Startup Advisory',
        category: 'Advisory',
        description:
            'Pragmatic founder and leadership advisory to position AI strategy around durable value, decision clarity, and measured execution.',
        deliverables: [
            { id: 'positioning-pack', title: 'Positioning and differentiation guidance' },
            { id: 'scale-plan', title: 'Scale and operating model plan' },
            { id: 'responsible-ai', title: 'Responsible AI operating principles' },
        ],
    },
    'ai-strategy-design': {
        id: 'ai-strategy-design',
        name: 'AI Strategy Design',
        category: 'Consulting',
        description:
            'Design AI strategy as business redesign by aligning initiatives to profit, cost, and risk outcomes rather than pilot activity.',
        deliverables: [
            { id: 'use-case-portfolio', title: 'Prioritised AI use-case portfolio' },
            { id: 'value-kpis', title: 'Value hypotheses and KPI definition' },
            { id: 'buy-build-partner', title: 'Buy/build/partner recommendation pack' },
        ],
    },
    'ai-transformation-roadmap': {
        id: 'ai-transformation-roadmap',
        name: 'AI Transformation Roadmap',
        category: 'Consulting',
        description:
            'Structured end-to-end roadmap from alignment through embed and govern, sequenced to deliver measurable outcomes early.',
        deliverables: [
            { id: 'phased-roadmap', title: '90-day / 6-month / 12-month roadmap' },
            { id: 'resourcing-budget', title: 'Resourcing and budget ranges' },
            { id: 'decision-rights', title: 'Governance and decision rights model' },
        ],
    },
    'delivery-oversight': {
        id: 'delivery-oversight',
        name: 'Delivery Oversight',
        category: 'Consulting',
        description:
            'Hands-on oversight to embed AI into core revenue or cost workflows with operational KPIs, controls, and accountable execution.',
        deliverables: [
            { id: 'steerco-pack', title: 'Steering committee and status pack' },
            { id: 'risk-log', title: 'Risk and issue log with actions' },
            { id: 'benefits-tracking', title: 'Benefits tracking against agreed outcomes' },
        ],
    },
    fundamentals: {
        id: 'fundamentals',
        name: 'Fundamentals',
        category: 'Consulting',
        description:
            'Data and operating foundation design focused on business ownership, quality accountability, and practical scale readiness.',
        deliverables: [
            { id: 'data-ownership', title: 'Data strategy and ownership model' },
            { id: 'tooling-plan', title: 'Tooling and workflow enablement plan' },
            { id: 'foundation-backlog', title: 'Prioritised foundational fixes backlog' },
        ],
    },
    assessments: {
        id: 'assessments',
        name: 'Assessments',
        category: 'Consulting',
        description:
            'Business and technical readiness assessments that surface red flags, shadow AI risk, dependency gaps, and control priorities.',
        deliverables: [
            { id: 'maturity-report', title: 'Maturity and gap assessment report' },
            { id: 'risk-constraints', title: 'Risk and constraint analysis' },
            { id: 'remediation-roadmap', title: 'Prioritised remediation roadmap' },
        ],
    },
    'reporting-analytics': {
        id: 'reporting-analytics',
        name: 'Reporting & Analytics',
        category: 'Consulting',
        description:
            'Decision intelligence reporting that links AI performance to business outcomes, with auditability and human override visibility.',
        deliverables: [
            { id: 'kpi-tree', title: 'KPI tree linked to business value' },
            { id: 'dashboard-pack', title: 'Dashboard and executive alert pack' },
            { id: 'forecast-scenarios', title: 'Forecasting and scenario model outputs' },
        ],
    },
    'executive-keynotes': {
        id: 'executive-keynotes',
        name: 'Executive Keynotes',
        category: 'Speaking',
        description:
            'Executive keynote briefings focused on practical AI transformation, governance, and measurable business value.',
        deliverables: [
            { id: 'keynote-delivery', title: 'Delivered keynote session' },
            { id: 'slide-deck', title: 'Leadership-grade keynote deck' },
            { id: 'narrative-pack', title: 'Reusable executive narrative pack' },
        ],
    },
    'private-corporate-talks': {
        id: 'private-corporate-talks',
        name: 'Private Corporate Talks',
        category: 'Speaking',
        description:
            'Private leadership talks tailored to enterprise context, covering strategy alignment, risk controls, and execution priorities.',
        deliverables: [
            { id: 'custom-talk', title: 'Custom leadership presentation' },
            { id: 'discussion-prompts', title: 'Facilitated discussion prompts' },
            { id: 'session-summary', title: 'Post-session executive summary' },
        ],
    },
    'conference-speaking-market-positioning': {
        id: 'conference-speaking-market-positioning',
        name: 'Conference Speaking & Market Positioning',
        category: 'Speaking',
        description:
            'Conference speaking that positions AI as disciplined business redesign with clear accountability, controls, and value outcomes.',
        deliverables: [
            { id: 'conference-slot', title: 'Conference keynote or panel delivery' },
            { id: 'conference-assets', title: 'Polished conference materials' },
            { id: 'thought-leadership', title: 'Optional thought-leadership adaptation' },
        ],
    },
    'executive-workshops': {
        id: 'executive-workshops',
        name: 'Executive Workshops (Half-Day / Full-Day)',
        category: 'Workshops',
        description:
            'Facilitated leadership workshops across align, diagnose, design, build, and embed to accelerate AI decisions into action.',
        deliverables: [
            { id: 'facilitated-workshop', title: 'Facilitated executive workshop' },
            { id: 'decision-summary', title: 'Decision summary and action plan' },
            { id: 'ownership-matrix', title: 'Named ownership and next-step matrix' },
        ],
    },
    'small-group-leadership-intensives': {
        id: 'small-group-leadership-intensives',
        name: 'Small-Group Leadership Intensives',
        category: 'Workshops',
        description:
            'Small-group intensives for senior leaders to resolve decision architecture, governance, and execution trade-offs quickly.',
        deliverables: [
            { id: 'intensive-session', title: 'Confidential leadership intensive session' },
            { id: 'decision-record', title: 'Decision record with unresolved issues' },
            { id: 'risk-followups', title: 'Risk-linked follow-up actions' },
        ],
    },
    'ai-literacy-non-technical-leaders': {
        id: 'ai-literacy-non-technical-leaders',
        name: 'AI Literacy for Non-Technical Leaders',
        category: 'Workshops',
        description:
            'Role-specific AI literacy for non-technical leaders to improve oversight, decision quality, and responsible adoption.',
        deliverables: [
            { id: 'literacy-pack', title: 'Executive AI literacy learning pack' },
            { id: 'leader-checklist', title: 'Leader checklist for AI oversight' },
            { id: 'mental-models', title: 'Shared vocabulary and mental models' },
        ],
    },
    'themed-education-sessions': {
        id: 'themed-education-sessions',
        name: 'Themed Education Sessions (Operating Model, Risk, Ethics)',
        category: 'Workshops',
        description:
            'Focused education on operating model, risk, and ethics to strengthen governance discipline across AI-enabled workflows.',
        deliverables: [
            { id: 'theme-session', title: 'Theme-specific executive education session' },
            { id: 'reference-templates', title: 'Reference templates and governance artifacts' },
            { id: 'operating-model-sketch', title: 'Operating model and control sketches' },
        ],
    },
    'ceo-guide-training-programme': {
        id: 'ceo-guide-training-programme',
        name: "The CEO's Guide to AI Transformation Training Programme",
        category: 'Training',
        description:
            'Leadership training programme to translate AI intent into accountable operating change, measurement, and sustained delivery.',
        deliverables: [
            { id: 'week-1', title: 'Week 1 leadership briefing and baseline assessment' },
            { id: 'week-2', title: 'Week 2 decision and workflow redesign clinic' },
            { id: 'week-3', title: 'Week 3 governance and risk operating model workshop' },
            { id: 'week-4', title: 'Week 4 implementation roadmap and leadership action plan' },
        ],
    },
    'oblongix-ai-transformation-platform': {
        id: 'oblongix-ai-transformation-platform',
        name: 'Oblongix - AI Transformation Platform',
        category: 'Platform',
        description:
            'An end-to-end AI consulting platform that automates the engagement lifecycle from discovery through delivery and sustainment.',
        deliverables: [
            { id: 'platform-setup', title: 'Platform setup and initiative structure' },
            { id: 'practice-playbooks', title: 'Best-practice playbooks and governance controls' },
            { id: 'progress-reporting', title: 'Progress tracking and executive reporting views' },
        ],
    },
};

// Book-aligned transformation plan used for every engagement.
const bookProjectPlanTemplate = [
    {
        id: 'declare-redesign',
        title: 'Declare AI as Business Redesign',
        bestPractice:
            'Executive sponsorship, clear ownership, and explicit value targets tied to P&L and risk.',
    },
    {
        id: 'decision-architecture',
        title: 'Redesign Decision Architecture',
        bestPractice:
            'Define where AI advises vs decides, assign named decision owners, and set override rules.',
    },
    {
        id: 'workflow-embedding',
        title: 'Embed AI into Core Workflows',
        bestPractice:
            'Prioritise revenue and cost workflows; avoid pilot-only delivery with no operating ownership.',
    },
    {
        id: 'foundations',
        title: 'Fix Data and Operating Foundations',
        bestPractice:
            'Establish data ownership, quality controls, and practical operating cadence for scale.',
    },
    {
        id: 'workforce',
        title: 'Recontract with Workforce',
        bestPractice:
            'Define role changes, incentives, and capability pathways with transparent leadership communication.',
    },
    {
        id: 'govern-risk',
        title: 'Govern AI as Enterprise Risk',
        bestPractice:
            'Board and executive oversight, escalation paths, and controls equivalent to material enterprise risks.',
    },
    {
        id: 'measure-value',
        title: 'Measure What Actually Matters',
        bestPractice:
            'Track decision quality, speed, learning velocity, and business impact, not activity metrics.',
    },
    {
        id: 'dependency-innovation',
        title: 'Manage Dependency and Innovation Optionality',
        bestPractice:
            'Actively manage vendor and ecosystem dependency while preserving reversibility and execution options.',
    },
];

// Export for use in application
window.diagnosticData = diagnosticData;
window.maturityLevels = maturityLevels;
window.serviceCatalog = serviceCatalog;
window.bookProjectPlanTemplate = bookProjectPlanTemplate;
