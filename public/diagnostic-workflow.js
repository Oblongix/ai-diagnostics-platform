// Diagnostic Workflow Management
(function () {
    const { db } = window.firebaseServices;
    const escapeHtml =
        window.safeHtml && window.safeHtml.escapeHtml
            ? window.safeHtml.escapeHtml
            : (s) => String(s === undefined || s === null ? '' : s);
    const diagnosticData = window.diagnosticData || {};
    const maturityLevels = window.maturityLevels || {};
    let moduleViewState = null;

    function renderProjectDetail(project) {
        const view = document.getElementById('diagnosticView');
        appState.currentProject = project;

        view.innerHTML = `
        <div class="diagnostic-container">
            <div class="diagnostic-header">
                <div class="breadcrumb">
                    <a href="#" data-action="switch-view" data-view="projects">Engagements</a>
                    <span>›</span>
                    <span>${escapeHtml(project.clientName)}</span>
                </div>
                <div class="project-title-section">
                    <h1>${escapeHtml(project.clientName)}</h1>
                    <div class="project-meta-row">
                        <span class="meta-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="8" cy="8" r="6"/>
                            </svg>
                            ${escapeHtml(project.industry || 'Industry')}
                        </span>
                        <span class="meta-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M2 6L8 2L14 6V12L8 16L2 12V6Z"/>
                            </svg>
                            ${escapeHtml(project.companySize || 'Company Size')}
                        </span>
                        <span class="status-badge ${String(project.status || 'active')
                            .replace(/[^a-z0-9_-]/gi, '-')
                            .toLowerCase()}">${escapeHtml(project.status || 'active')}</span>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="btn-secondary" data-action="export-project" data-id="${escapeHtml(project.id)}">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 10V13C14 13.5304 13.7893 14.0391 13.4142 14.4142C13.0391 14.7893 12.5304 15 12 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V10"/>
                            <path d="M5 6L8 3L11 6"/>
                            <path d="M8 3V10"/>
                        </svg>
                        Export Report
                    </button>
                    <button class="btn-primary" data-action="open-team" data-id="${escapeHtml(project.id)}">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 5C11 6.65685 9.65685 8 8 8C6.34315 8 5 6.65685 5 5C5 3.34315 6.34315 2 8 2C9.65685 2 11 3.34315 11 5Z"/>
                            <path d="M2 14C2 11.7909 3.79086 10 6 10H10C12.2091 10 14 11.7909 14 14"/>
                        </svg>
                        Team
                    </button>
                </div>
            </div>
            
            <!-- Progress Overview -->
            <div class="progress-overview">
                <div class="overview-card">
                    <div class="overview-stat">
                        <div class="stat-value">${escapeHtml(project.progress || 0)}%</div>
                        <div class="stat-label">Overall Completion</div>
                    </div>
                    <div class="circular-progress">
                        <svg width="80" height="80" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="36" fill="none" stroke="#E5E7EB" stroke-width="8"/>
                            <circle cx="40" cy="40" r="36" fill="none" stroke="url(#progressGradient)" stroke-width="8"
                                    stroke-dasharray="${2 * Math.PI * 36}" 
                                    stroke-dashoffset="${2 * Math.PI * 36 * (1 - (project.progress || 0) / 100)}"
                                    transform="rotate(-90 40 40)"/>
                            <defs>
                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:#1F4E78"/>
                                    <stop offset="100%" style="stop-color:#4472C4"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
                <div class="overview-card">
                    <div class="overview-label">Time Investment</div>
                    <div class="overview-value">${escapeHtml(project.hoursLogged || 0)}h</div>
                    <div class="overview-detail">Logged this engagement</div>
                </div>
                <div class="overview-card">
                    <div class="overview-label">Interviews</div>
                    <div class="overview-value">${escapeHtml(countInterviews(project))}</div>
                    <div class="overview-detail">Completed / ${getTotalInterviews(project)} planned</div>
                </div>
                <div class="overview-card">
                    <div class="overview-label">Documents</div>
                    <div class="overview-value">${escapeHtml(countDocuments(project))}</div>
                    <div class="overview-detail">Collected & reviewed</div>
                </div>
            </div>
            
            <!-- Suite Navigation -->
            <div class="suite-nav">
                ${renderSuiteNavigation(project)}
            </div>
            
            <!-- Active Suite Content -->
            <div id="activeSuiteContent">
                ${renderSuiteContent(project, project.suites && project.suites[0])}
            </div>
        </div>
    `;
    }

    function renderSuiteNavigation(project) {
        const suites = Array.isArray(project.suites)
            ? project.suites
            : project.suites
              ? [project.suites]
              : [];

        return suites
            .map((suite, index) => {
                const suiteData = diagnosticData[suite];
                if (!suiteData) return '';

                const progress = calculateSuiteProgress(project, suite);
                const safeSuite = escapeHtml(suite);

                return `
                <button class="suite-nav-btn ${index === 0 ? 'active' : ''}" 
                    data-action="switch-suite" data-suite="${safeSuite}">
                <div class="suite-nav-header">
                    <div class="suite-nav-indicator" style="background: ${suiteData.gradient}"></div>
                    <div class="suite-nav-title">${escapeHtml(suiteData.name)}</div>
                </div>
                <div class="suite-nav-progress">
                    <div class="progress-bar-mini">
                        <div class="progress-fill-mini" style="width: ${progress}%; background: ${suiteData.gradient}"></div>
                    </div>
                    <span class="progress-text">${progress}%</span>
                </div>
            </button>
        `;
            })
            .join('');
    }

    function switchSuite(suiteKey) {
        document
            .querySelectorAll('.suite-nav-btn')
            .forEach((btn) => btn.classList.remove('active'));
        document.querySelector(`[data-suite="${suiteKey}"]`)?.classList.add('active');

        const content = document.getElementById('activeSuiteContent');
        if (content) content.innerHTML = renderSuiteContent(appState.currentProject, suiteKey);
    }

    function renderSuiteContent(project, suiteKey) {
        const suiteData = diagnosticData[suiteKey];
        if (!suiteData) return '<p>Suite data not found</p>';

        const modules = Object.values(suiteData.modules);

        return `
        <div class="suite-content">
            <div class="suite-header-section">
                <h2>${suiteData.name}</h2>
                <p class="suite-description">Comprehensive assessment across ${modules.length} modules</p>
            </div>
            
            <div class="modules-grid">
                ${modules.map((module) => renderModuleCard(project, suiteKey, module)).join('')}
            </div>
        </div>
    `;
    }

    function renderModuleCard(project, suiteKey, module) {
        const progress = calculateModuleProgress(project, suiteKey, module.id);
        const status = getModuleStatus(project, suiteKey, module.id);

        return `
        <div class="module-card" data-action="open-module" data-suite="${escapeHtml(suiteKey)}" data-module="${escapeHtml(module.id)}">
            <div class="module-card-header">
                <h3>${module.name}</h3>
                <span class="module-badge ${status}">${status}</span>
            </div>
            <div class="module-card-body">
                <p class="module-chapter">${module.chapter}</p>
                <div class="module-meta">
                    <span><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="7" cy="7" r="5"/>
                        <path d="M7 3V7L10 10"/>
                    </svg> ${module.duration}</span>
                    <span><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 7H13M7 1V13"/>
                    </svg> ${module.sections.length} sections</span>
                </div>
                <div class="module-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-label">${progress}% complete</span>
                </div>
            </div>
            <div class="module-card-footer">
                <button class="btn-link" data-action="open-module" data-suite="${escapeHtml(suiteKey)}" data-module="${escapeHtml(module.id)}">
                    ${progress === 0 ? 'Start Assessment' : 'Continue →'}
                </button>
            </div>
        </div>
    `;
    }

    function openModule(suiteKey, moduleId) {
        const suite = diagnosticData[suiteKey];
        if (!suite || !suite.modules || !suite.modules[moduleId]) return;
        const module = suite.modules[moduleId];
        const project = appState.currentProject;
        const view = document.getElementById('diagnosticView');
        if (!project || !view) return;

        moduleViewState = { suiteKey, moduleId, section: 'overview' };
        view.innerHTML = renderModuleScreen(project, suiteKey, module, 'overview');
        bindModuleScreenNavigation(project, suiteKey, module);
    }

    function renderModuleScreen(project, suiteKey, module, section) {
        return `
        <div class="module-assessment-screen" id="moduleAssessmentScreen" data-suite="${escapeHtml(suiteKey)}" data-module="${escapeHtml(module.id)}">
            <div class="module-assessment-header">
                <div>
                    <div class="breadcrumb">
                        <a href="#" data-action="switch-view" data-view="projects">Engagements</a>
                        <span>›</span>
                        <a href="#" data-action="close-module">${escapeHtml(project.clientName || project.id)}</a>
                        <span>›</span>
                        <span>${escapeHtml(module.name)}</span>
                    </div>
                    <h2>${escapeHtml(module.name)}</h2>
                    <p class="module-subtitle">${escapeHtml(module.chapter || '')}</p>
                </div>
                <button class="btn-secondary" data-action="close-module">Back to Engagement</button>
            </div>
            <div class="assessment-container">
                <div class="assessment-sidebar">
                    <div class="assessment-nav">
                        <div class="nav-section ${section === 'overview' ? 'active' : ''}" data-section="overview">
                            <div class="nav-icon">📋</div>
                            <span>Overview</span>
                        </div>
                        <div class="nav-section ${section === 'quantitative' ? 'active' : ''}" data-section="quantitative">
                            <div class="nav-icon">📊</div>
                            <span>Quantitative Assessment</span>
                        </div>
                        <div class="nav-section ${section === 'interviews' ? 'active' : ''}" data-section="interviews">
                            <div class="nav-icon">🎤</div>
                            <span>Interview Protocol</span>
                        </div>
                        <div class="nav-section ${section === 'documents' ? 'active' : ''}" data-section="documents">
                            <div class="nav-icon">📄</div>
                            <span>Document Analysis</span>
                        </div>
                        <div class="nav-section ${section === 'findings' ? 'active' : ''}" data-section="findings">
                            <div class="nav-icon">💡</div>
                            <span>Findings & Analysis</span>
                        </div>
                    </div>
                </div>
                <div class="assessment-content">
                    ${renderAssessmentSection(project, suiteKey, module, section)}
                </div>
            </div>
        </div>
    `;
    }

    function bindModuleScreenNavigation(project, suiteKey, module) {
        const screen = document.getElementById('moduleAssessmentScreen');
        if (!screen) return;
        const content = screen.querySelector('.assessment-content');
        if (!content) return;

        screen.querySelectorAll('.nav-section').forEach((nav) => {
            nav.addEventListener('click', () => {
                const section = nav.dataset.section || 'overview';
                screen
                    .querySelectorAll('.nav-section')
                    .forEach((n) => n.classList.remove('active'));
                nav.classList.add('active');
                moduleViewState = { suiteKey, moduleId: module.id, section };
                content.innerHTML = renderAssessmentSection(project, suiteKey, module, section);
            });
        });
    }

    function renderAssessmentSection(project, suiteKey, module, section) {
        switch (section) {
            case 'overview':
                return renderOverviewSection(module);
            case 'quantitative':
                return renderQuantitativeSection(project, suiteKey, module);
            case 'interviews':
                return renderInterviewSection(module);
            case 'documents':
                return renderDocumentSection(module);
            case 'findings':
                return renderFindingsSection(project, suiteKey, module);
            default:
                return '<p>Section not found</p>';
        }
    }

    function renderOverviewSection(module) {
        return `
        <div class="section-content">
            <h3>Module Overview</h3>
            <div class="info-card">
                <h4>Objectives</h4>
                <p>This module assesses ${module.name.toLowerCase()} capabilities across ${module.sections.length} key dimensions.</p>
            </div>
            
            <h4>Assessment Approach</h4>
            <div class="approach-grid">
                <div class="approach-card">
                    <div class="approach-icon">📊</div>
                    <h5>Quantitative Assessment</h5>
                    <p>Score ${module.sections.reduce((sum, s) => sum + s.criteria.length, 0)} criteria using evidence-based evaluation</p>
                </div>
                <div class="approach-card">
                    <div class="approach-icon">🎤</div>
                    <h5>Stakeholder Interviews</h5>
                    <p>Conduct structured interviews with key stakeholders using proven protocols</p>
                </div>
                <div class="approach-card">
                    <div class="approach-icon">📄</div>
                    <h5>Document Analysis</h5>
                    <p>Review and analyze ${module.documents?.length || 0} key document types</p>
                </div>
                <div class="approach-card">
                    <div class="approach-icon">💡</div>
                    <h5>Synthesis & Findings</h5>
                    <p>Triangulate data to identify gaps and actionable recommendations</p>
                </div>
            </div>
            
            <h4>Key Sections</h4>
            <div class="sections-list">
                ${module.sections
                    .map(
                        (section) => `
                    <div class="section-item">
                        <div class="section-name">${section.name}</div>
                        <div class="section-meta">
                            <span class="weight-badge ${section.weight}">${section.weight} priority</span>
                            <span>${section.criteria.length} criteria</span>
                        </div>
                    </div>
                `
                    )
                    .join('')}
            </div>
        </div>
    `;
    }

    function renderQuantitativeSection(project, suiteKey, module) {
        const assessmentData = getAssessmentData(project, suiteKey, module.id);

        return `
        <div class="section-content">
            <div class="section-header">
                <h3>Quantitative Assessment</h3>
                <div class="maturity-legend">
                    ${Object.entries(maturityLevels)
                        .map(
                            ([level, data]) => `
                        <div class="legend-item">
                            <div class="legend-color" style="background: ${data.color}"></div>
                            <span>${level} - ${data.label}</span>
                        </div>
                    `
                        )
                        .join('')}
                </div>
            </div>
            
            ${module.sections
                .map(
                    (section, sIndex) => `
                <div class="criteria-section">
                    <h4>${section.name}</h4>
                    <div class="criteria-list">
                        ${section.criteria
                            .map((criterion, cIndex) =>
                                renderCriterion(
                                    project,
                                    suiteKey,
                                    module.id,
                                    sIndex,
                                    cIndex,
                                    criterion,
                                    assessmentData
                                )
                            )
                            .join('')}
                    </div>
                </div>
            `
                )
                .join('')}
            
            <div class="section-footer">
                <button class="btn-primary" data-action="save-assessment" data-suite="${escapeHtml(suiteKey)}" data-module="${escapeHtml(module.id)}">
                    Save Progress
                </button>
                <button class="btn-secondary" data-action="calculate-score" data-suite="${escapeHtml(suiteKey)}" data-module="${escapeHtml(module.id)}">
                    Calculate Score
                </button>
            </div>
        </div>
    `;
    }

    function renderCriterion(
        project,
        suiteKey,
        moduleId,
        sIndex,
        cIndex,
        criterion,
        assessmentData
    ) {
        const key = `s${sIndex}_c${cIndex}`;
        const saved = assessmentData?.criteria?.[key] || {};

        return `
        <div class="criterion-item">
            <div class="criterion-header">
                <div class="criterion-text">${criterion.text}</div>
                <span class="weight-badge ${criterion.weight}">${criterion.weight}</span>
            </div>
            <div class="criterion-evidence">
                <small><strong>Evidence required:</strong> ${criterion.evidence}</small>
            </div>
            <div class="criterion-assessment">
                <div class="score-selector">
                    <label>Score (1-5):</label>
                    <div class="score-buttons">
                        ${[1, 2, 3, 4, 5]
                            .map(
                                (score) => `
                            <button class="score-btn ${saved.score === score ? 'selected' : ''}" 
                                    data-action="select-score" data-key="${escapeHtml(key)}" data-score="${score}">
                                ${score}
                            </button>
                        `
                            )
                            .join('')}
                    </div>
                </div>
                <div class="evidence-input">
                    <label>Evidence Notes:</label>
                    <textarea id="evidence_${key}" rows="2" placeholder="Document the evidence found...">${escapeHtml(saved.notes || '')}</textarea>
                </div>
            </div>
        </div>
    `;
    }

    function renderInterviewSection(module) {
        if (!module.interviewProtocol) {
            return '<p>Interview protocols for this module are being prepared.</p>';
        }

        return `
        <div class="section-content">
            <h3>Interview Protocol</h3>
            <p class="section-description">Conduct structured interviews with key stakeholders. Use these protocols as guides, adapting based on conversation flow.</p>
            
            ${Object.entries(module.interviewProtocol)
                .map(
                    ([role, protocol]) => `
                <div class="interview-protocol">
                    <div class="protocol-header">
                        <h4>${role.toUpperCase()} Interview</h4>
                        <span class="duration-badge">${protocol.duration} minutes</span>
                    </div>
                    
                    ${protocol.questions
                        .map(
                            (category) => `
                        <div class="question-category">
                            <h5>${category.category} <span class="time-badge">${category.time} min</span></h5>
                            ${category.questions
                                .map(
                                    (item, idx) => `
                                <div class="interview-question">
                                    <div class="question-number">${idx + 1}</div>
                                    <div class="question-content">
                                        <p class="question-text">${item.q}</p>
                                        <div class="probes">
                                            <strong>Probes:</strong>
                                            <ul>
                                                ${item.probes.map((probe) => `<li>${probe}</li>`).join('')}
                                            </ul>
                                        </div>
                                        <textarea class="interview-notes" 
                                                  placeholder="Interview notes..." 
                                                  rows="3"></textarea>
                                    </div>
                                </div>
                            `
                                )
                                .join('')}
                        </div>
                    `
                        )
                        .join('')}
                </div>
            `
                )
                .join('')}
        </div>
    `;
    }

    function renderDocumentSection(module) {
        if (!module.documents) {
            return '<p>Document requirements for this module are being prepared.</p>';
        }

        return `
        <div class="section-content">
            <h3>Document Analysis</h3>
            <p class="section-description">Collect and analyze these key documents. Upload or link to documents, then document your analysis.</p>
            
            <div class="documents-checklist">
                ${module.documents
                    .map(
                        (doc, idx) => `
                    <div class="document-item">
                        <div class="doc-checkbox">
                            <input type="checkbox" id="doc_${idx}">
                            <label for="doc_${idx}"></label>
                        </div>
                        <div class="doc-content">
                            <div class="doc-header">
                                <h4>${doc.type}</h4>
                                <span class="doc-meta">${doc.versions || doc.period || doc.items}</span>
                            </div>
                            <p class="doc-focus"><strong>Analysis focus:</strong> ${doc.focus}</p>
                            <div class="doc-actions">
                                <button class="btn-link" data-action="upload-document" data-idx="${idx}">
                                    📎 Upload Document
                                </button>
                                <button class="btn-link" data-action="add-document-link" data-idx="${idx}">
                                    🔗 Add Link
                                </button>
                            </div>
                            <textarea class="doc-analysis" placeholder="Analysis notes..." rows="3"></textarea>
                        </div>
                    </div>
                `
                    )
                    .join('')}
            </div>
        </div>
    `;
    }

    function renderFindingsSection(project, suiteKey, module) {
        return `
        <div class="section-content">
            <h3>Findings & Analysis</h3>
            
            <div class="findings-editor">
                <h4>Key Findings</h4>
                <textarea id="keyFindings" rows="6" 
                          placeholder="Document key findings from quantitative assessment, interviews, and document analysis..."
                          class="findings-textarea"></textarea>
                
                <h4>Gap Analysis</h4>
                <textarea id="gapAnalysis" rows="6" 
                          placeholder="Identify critical gaps between current state and desired state..."
                          class="findings-textarea"></textarea>
                
                <h4>Recommendations</h4>
                <textarea id="recommendations" rows="6" 
                          placeholder="Provide specific, actionable recommendations..."
                          class="findings-textarea"></textarea>
                
                <h4>Priority Actions</h4>
                <div id="priorityActions" class="priority-actions-list">
                    <button class="btn-secondary" data-action="add-priority">+ Add Action</button>
                </div>
            </div>
            
            <div class="section-footer">
                <button class="btn-primary" data-action="save-findings" data-suite="${escapeHtml(suiteKey)}" data-module="${escapeHtml(module.id)}">
                    Save Findings
                </button>
            </div>
        </div>
    `;
    }

    // Utility Functions
    function getModuleDefinition(suiteKey, moduleId) {
        const suite = diagnosticData[suiteKey];
        return suite && suite.modules ? suite.modules[moduleId] : null;
    }

    function countCriteriaInModule(moduleDef) {
        if (!moduleDef || !Array.isArray(moduleDef.sections)) return 0;
        return moduleDef.sections.reduce(
            (sum, section) => sum + (Array.isArray(section.criteria) ? section.criteria.length : 0),
            0
        );
    }

    function getCriteriaStats(project, suiteKey, moduleId) {
        const moduleDef = getModuleDefinition(suiteKey, moduleId);
        const total = countCriteriaInModule(moduleDef);
        const assessmentData = getAssessmentData(project, suiteKey, moduleId);
        const criteria = assessmentData && assessmentData.criteria ? assessmentData.criteria : {};
        const completed = Object.values(criteria).filter(
            (entry) => entry && Number.isFinite(Number(entry.score))
        ).length;
        return { total, completed };
    }

    function calculateSuiteProgress(project, suiteKey) {
        const suite = diagnosticData[suiteKey];
        if (!suite || !suite.modules) return 0;
        const moduleIds = Object.keys(suite.modules);
        if (moduleIds.length === 0) return 0;
        const total = moduleIds.reduce(
            (sum, moduleId) => sum + calculateModuleProgress(project, suiteKey, moduleId),
            0
        );
        return Math.round(total / moduleIds.length);
    }

    function calculateModuleProgress(project, suiteKey, moduleId) {
        const { total, completed } = getCriteriaStats(project, suiteKey, moduleId);
        if (total === 0) return 0;
        return Math.round((completed / total) * 100);
    }

    function getModuleStatus(project, suiteKey, moduleId) {
        const progress = calculateModuleProgress(project, suiteKey, moduleId);
        if (progress === 0) return 'not-started';
        if (progress < 100) return 'in-progress';
        return 'completed';
    }

    function getAssessmentData(project, suiteKey, moduleId) {
        return project.assessments?.[suiteKey]?.modules?.[moduleId] || {};
    }

    function countInterviews(project) {
        const assessments = project && project.assessments ? project.assessments : {};
        let completed = 0;
        Object.values(assessments).forEach((suiteAssessment) => {
            const modules =
                suiteAssessment && suiteAssessment.modules ? suiteAssessment.modules : {};
            Object.values(modules).forEach((moduleAssessment) => {
                completed += Number(moduleAssessment.interviewsCompleted || 0);
            });
        });
        return completed;
    }

    function getTotalInterviews(project) {
        const suites = Array.isArray(project.suites)
            ? project.suites
            : project.suites
              ? [project.suites]
              : [];
        let total = 0;
        suites.forEach((suiteKey) => {
            const suite = diagnosticData[suiteKey];
            if (!suite || !suite.modules) return;
            Object.values(suite.modules).forEach((module) => {
                const protocol = module && module.interviewProtocol ? module.interviewProtocol : {};
                Object.values(protocol).forEach((roleProtocol) => {
                    const questionsByCategory =
                        roleProtocol && roleProtocol.questions ? roleProtocol.questions : [];
                    questionsByCategory.forEach((category) => {
                        total += Array.isArray(category.questions) ? category.questions.length : 0;
                    });
                });
            });
        });
        return total;
    }

    function countDocuments(project) {
        const assessments = project && project.assessments ? project.assessments : {};
        let total = 0;
        Object.values(assessments).forEach((suiteAssessment) => {
            const modules =
                suiteAssessment && suiteAssessment.modules ? suiteAssessment.modules : {};
            Object.values(modules).forEach((moduleAssessment) => {
                total += Number(moduleAssessment.documentsCollected || 0);
            });
        });
        return total;
    }

    function calculateModuleScoreFromCriteria(suiteKey, moduleId, criteriaData) {
        const moduleDef = getModuleDefinition(suiteKey, moduleId);
        if (!moduleDef || !Array.isArray(moduleDef.sections)) return 0;
        const criteria = criteriaData || {};
        let weightedSum = 0;
        let totalWeight = 0;

        moduleDef.sections.forEach((section, sectionIndex) => {
            const sectionCriteria = Array.isArray(section.criteria) ? section.criteria : [];
            sectionCriteria.forEach((criterion, criterionIndex) => {
                const key = `s${sectionIndex}_c${criterionIndex}`;
                const score = Number(criteria[key] && criteria[key].score);
                if (!Number.isFinite(score)) return;
                const weightLabel = String(criterion.weight || 'medium').toLowerCase();
                const weight = weightLabel === 'high' ? 3 : weightLabel === 'low' ? 1 : 2;
                weightedSum += score * weight;
                totalWeight += weight;
            });
        });

        if (!totalWeight) return 0;
        return Number((weightedSum / totalWeight).toFixed(2));
    }

    function calculateOverallProgress(project) {
        const suites = Array.isArray(project.suites)
            ? project.suites
            : project.suites
              ? [project.suites]
              : [];
        if (suites.length === 0) return 0;
        const total = suites.reduce(
            (sum, suiteKey) => sum + calculateSuiteProgress(project, suiteKey),
            0
        );
        return Math.round(total / suites.length);
    }

    async function syncProjectProgress(projectId) {
        const snap = await db.collection('projects').doc(projectId).get();
        if (!snap.exists) return;
        const project = { id: snap.id, ...(snap.data ? snap.data() : {}) };
        const progress = calculateOverallProgress(project);
        await db.collection('projects').doc(projectId).update({
            progress,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        if (
            window.appState &&
            window.appState.currentProject &&
            window.appState.currentProject.id === projectId
        ) {
            window.appState.currentProject.progress = progress;
        }
    }

    function closeModuleModal() {
        if (!appState.currentProject) return;
        const suiteToRestore = moduleViewState && moduleViewState.suiteKey;
        moduleViewState = null;
        renderProjectDetail(appState.currentProject);
        if (suiteToRestore) switchSuite(suiteToRestore);
    }

    function selectScore(key, score) {
        const buttons = document.querySelectorAll(`.score-btn[data-key="${key}"]`);
        buttons.forEach((btn) => btn.classList.remove('selected'));
        const selected = document.querySelector(
            `.score-btn[data-key="${key}"][data-score="${score}"]`
        );
        if (selected) selected.classList.add('selected');

        // Store in memory (will be saved when clicking save)
        if (!window.assessmentCache) window.assessmentCache = {};
        window.assessmentCache[key] = { score, timestamp: Date.now() };
    }

    function calculateModuleScore(suiteKey, moduleId) {
        const criteria = {};
        document.querySelectorAll('.score-btn.selected').forEach((btn) => {
            const key = btn.dataset.key;
            if (!key) return;
            criteria[key] = {
                score: Number(btn.dataset.score),
            };
        });
        const score = calculateModuleScoreFromCriteria(suiteKey, moduleId, criteria);
        const criteriaCount = Object.keys(criteria).length;
        if (window.showToast) {
            window.showToast(`Module score: ${score} (${criteriaCount} criteria scored)`);
        }
        return score;
    }

    async function saveAssessment(suiteKey, moduleId) {
        // Collect all scores and evidence
        const criteria = {};
        document.querySelectorAll('.score-btn.selected').forEach((btn) => {
            const criterionItem = btn.closest('.criterion-item');
            const textareas = criterionItem.querySelectorAll('textarea');
            if (textareas.length > 0) {
                const key = btn.dataset.key || textareas[0].id.replace('evidence_', '');
                criteria[key] = {
                    score: Number(btn.dataset.score),
                    notes: textareas[0].value,
                    timestamp: Date.now(),
                };
            }
        });
        const moduleScore = calculateModuleScoreFromCriteria(suiteKey, moduleId, criteria);
        const stats = getCriteriaStats(appState.currentProject, suiteKey, moduleId);
        const moduleProgress =
            stats.total === 0 ? 0 : Math.round((Object.keys(criteria).length / stats.total) * 100);
        try {
            appState.currentProject = appState.currentProject || {};
            appState.currentProject.assessments = appState.currentProject.assessments || {};
            appState.currentProject.assessments[suiteKey] = appState.currentProject.assessments[
                suiteKey
            ] || { modules: {} };
            appState.currentProject.assessments[suiteKey].modules =
                appState.currentProject.assessments[suiteKey].modules || {};
            appState.currentProject.assessments[suiteKey].modules[moduleId] =
                appState.currentProject.assessments[suiteKey].modules[moduleId] || {};
            Object.assign(appState.currentProject.assessments[suiteKey].modules[moduleId], {
                criteria,
                score: moduleScore,
                progress: moduleProgress,
            });
        } catch (e) {
            console.warn('Could not update local assessment cache', e);
        }

        try {
            await db
                .collection('projects')
                .doc(appState.currentProject.id)
                .update({
                    [`assessments.${suiteKey}.modules.${moduleId}.criteria`]: criteria,
                    [`assessments.${suiteKey}.modules.${moduleId}.score`]: moduleScore,
                    [`assessments.${suiteKey}.modules.${moduleId}.progress`]: moduleProgress,
                    [`assessments.${suiteKey}.modules.${moduleId}.lastUpdated`]:
                        firebase.firestore.FieldValue.serverTimestamp(),
                });
            await syncProjectProgress(appState.currentProject.id);
            if (window.loadProjects && window.appState && window.appState.currentUser) {
                await window.loadProjects(window.appState.currentUser.uid);
                if (window.updateDashboard) window.updateDashboard();
            }
            if (window.showToast) window.showToast('Assessment progress saved');
        } catch (error) {
            console.error('Error saving assessment:', error);
            if (window.showToast)
                window.showToast('Error saving assessment. Please try again.', true);
        }
    }

    async function saveFindings(suiteKey, moduleId) {
        const findings = {
            keyFindings: document.getElementById('keyFindings').value,
            gapAnalysis: document.getElementById('gapAnalysis').value,
            recommendations: document.getElementById('recommendations').value,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        };

        try {
            await db
                .collection('projects')
                .doc(appState.currentProject.id)
                .update({
                    [`assessments.${suiteKey}.modules.${moduleId}.findings`]: findings,
                });
            if (window.showToast) window.showToast('Findings saved successfully');
        } catch (error) {
            console.error('Error saving findings:', error);
            if (window.showToast)
                window.showToast('Error saving findings. Please try again.', true);
        }
    }

    // Make functions globally available

    window.renderProjectDetail = renderProjectDetail;
    window.switchSuite = switchSuite;
    window.openModule = openModule;
    window.closeModuleModal = closeModuleModal;
    window.selectScore = selectScore;
    window.calculateModuleScore = calculateModuleScore;
    window.saveAssessment = saveAssessment;
    window.saveFindings = saveFindings;
})();
