// Diagnostic Framework Data
// This contains all the assessment criteria, interview protocols, and methodologies

const diagnosticData = {
    strategic: {
        name: "Strategic Diagnostics",
        color: "#1F4E78",
        gradient: "linear-gradient(135deg, #1F4E78, #4472C4)",
        modules: {
            businessRedesign: {
                id: "businessRedesign",
                name: "Business Redesign",
                chapter: "Chapter 1: Declare AI a Business Redesign",
                duration: "2 weeks",
                sections: [
                    {
                        id: "executiveOwnership",
                        name: "Executive Ownership & Accountability",
                        weight: "high",
                        criteria: [
                            {
                                id: "ceo_ownership",
                                text: "CEO explicitly owns AI transformation (not delegated to CTO/CIO)",
                                evidence: "Organizational announcement, reporting structure, CEO calendar time allocation",
                                weight: "high"
                            },
                            {
                                id: "bu_accountability",
                                text: "Business unit leaders have AI outcomes in their P&L accountability",
                                evidence: "Performance contracts, P&L reporting, incentive structures",
                                weight: "high"
                            },
                            {
                                id: "exec_compensation",
                                text: "Executive compensation includes AI transformation metrics",
                                evidence: "Compensation committee documents, executive KPIs",
                                weight: "medium"
                            },
                            {
                                id: "ceo_time",
                                text: "CEO dedicates ≥20% time to AI transformation activities",
                                evidence: "Calendar analysis, meeting participation logs",
                                weight: "medium"
                            },
                            {
                                id: "decision_authority",
                                text: "AI strategy decisions made by CEO and business leadership, not IT",
                                evidence: "Decision logs, strategy session participants, approval authorities",
                                weight: "high"
                            }
                        ]
                    },
                    {
                        id: "strategicIntegration",
                        name: "Strategic Integration",
                        weight: "high",
                        criteria: [
                            {
                                id: "strategic_plan",
                                text: "AI explicitly integrated into corporate strategic plan",
                                evidence: "Strategic plan document with specific AI initiatives and outcomes",
                                weight: "high"
                            },
                            {
                                id: "dedicated_budget",
                                text: "AI transformation has dedicated budget line separate from IT",
                                evidence: "Budget documents showing AI investment vs. IT operations",
                                weight: "medium"
                            },
                            {
                                id: "board_review",
                                text: "Board regularly reviews AI as strategic agenda item (not just updates)",
                                evidence: "Board minutes showing discussion, decisions, and time allocation",
                                weight: "high"
                            },
                            {
                                id: "business_value",
                                text: "AI investment justified by business value, not technology exploration",
                                evidence: "Business cases with NPV, ROI, and P&L impact projections",
                                weight: "high"
                            },
                            {
                                id: "kill_process",
                                text: "Clear process exists to kill AI initiatives not delivering business value",
                                evidence: "Portfolio governance decisions, documented terminations",
                                weight: "medium"
                            }
                        ]
                    },
                    {
                        id: "processRedesign",
                        name: "Business Process Redesign",
                        weight: "medium",
                        criteria: [
                            {
                                id: "explicit_processes",
                                text: "AI strategy explicitly names business processes to be redesigned",
                                evidence: "Process maps, transformation plans, before/after designs",
                                weight: "high"
                            },
                            {
                                id: "process_ownership",
                                text: "Process owners co-own AI initiatives affecting their domains",
                                evidence: "RACI matrices, joint accountability structures",
                                weight: "medium"
                            },
                            {
                                id: "impact_assessment",
                                text: "Impact assessment completed for core workflows",
                                evidence: "Process impact analysis, change impact documents",
                                weight: "medium"
                            },
                            {
                                id: "prioritization",
                                text: "Investment prioritization based on process criticality and value",
                                evidence: "Prioritization criteria, scoring models, approval decisions",
                                weight: "high"
                            },
                            {
                                id: "tradeoff_governance",
                                text: "Clear governance for process vs. technology trade-offs",
                                evidence: "Decision frameworks, escalation mechanisms, resolved conflicts",
                                weight: "medium"
                            }
                        ]
                    }
                ],
                interviewProtocol: {
                    ceo: {
                        duration: 90,
                        questions: [
                            {
                                category: "Strategic Vision & Positioning",
                                time: 20,
                                questions: [
                                    {
                                        q: "How do you describe the role of AI in the company's future? What makes it different from previous technology transformations?",
                                        probes: ["Business model impact vs. process improvement", "Timeline expectations", "Market positioning"]
                                    },
                                    {
                                        q: "Walk me through the last three major decisions you made regarding AI. How did you make them?",
                                        probes: ["Decision criteria", "Who was involved", "Trade-offs considered", "How outcomes were defined"]
                                    },
                                    {
                                        q: "What would cause you to significantly reduce or redirect AI investments?",
                                        probes: ["Kill criteria", "Risk tolerance", "Monitoring mechanisms"]
                                    }
                                ]
                            },
                            {
                                category: "Ownership & Accountability",
                                time: 20,
                                questions: [
                                    {
                                        q: "Who do you hold accountable when AI initiatives fail to deliver expected business value?",
                                        probes: ["Specific names", "Consequences", "How accountability is enforced"]
                                    },
                                    {
                                        q: "How do your business unit leaders think about AI? Is it their responsibility or IT's responsibility?",
                                        probes: ["Perception gaps", "Cultural barriers", "Specific examples of ownership"]
                                    },
                                    {
                                        q: "What percentage of your leadership team's variable compensation is tied to AI transformation outcomes?",
                                        probes: ["Specific metrics", "Thresholds", "Whether metrics are achievable", "Gaming potential"]
                                    }
                                ]
                            }
                        ]
                    }
                },
                documents: [
                    { type: "Strategic Plan", versions: "Last 2 versions", focus: "AI prominence, integration, evolution" },
                    { type: "Board Materials", period: "12 months", focus: "Discussion quality, decision patterns, time allocation" },
                    { type: "Budget/Finance", items: "AI investment tracking, business cases, actuals", focus: "P&L integration, ROI realization" },
                    { type: "Org Charts", versions: "Current + planned", focus: "Reporting lines, span of control, AI placement" },
                    { type: "Governance Docs", items: "Charters, decision authorities, RACI", focus: "Decision rights, escalation, accountability" }
                ]
            },
            decisionArchitecture: {
                id: "decisionArchitecture",
                name: "Decision Architecture",
                chapter: "Chapter 2: Redesign How Decisions Are Made",
                duration: "2 weeks",
                sections: [
                    {
                        id: "decisionMapping",
                        name: "Decision Mapping Completeness",
                        weight: "high",
                        criteria: [
                            {
                                id: "decisions_catalogued",
                                text: "Critical business decisions catalogued and classified",
                                evidence: "Decision inventory with AI role classification (Advise/Decide/Human)",
                                weight: "high"
                            },
                            {
                                id: "authority_documented",
                                text: "Decision authority explicitly documented for each process",
                                evidence: "Authority matrices showing who decides what, when",
                                weight: "high"
                            },
                            {
                                id: "risk_assigned",
                                text: "Risk level assigned to each AI-enabled decision point",
                                evidence: "Risk assessment with impact and likelihood scoring",
                                weight: "high"
                            },
                            {
                                id: "quality_metrics",
                                text: "Decision quality metrics defined and tracked",
                                evidence: "KPI definitions, measurement approach, historical tracking",
                                weight: "medium"
                            },
                            {
                                id: "review_thresholds",
                                text: "Thresholds defined for when AI decisions require human review",
                                evidence: "Documented rules engine, confidence thresholds, exception criteria",
                                weight: "high"
                            }
                        ]
                    }
                ]
            }
            // Additional modules would continue...
        }
    },
    operational: {
        name: "Operational Diagnostics",
        color: "#C55A11",
        gradient: "linear-gradient(135deg, #C55A11, #F4B183)",
        modules: {
            workflowEmbedding: {
                id: "workflowEmbedding",
                name: "Workflow Embedding",
                chapter: "Chapter 3: Embed AI Into Core Workflows",
                duration: "2 weeks",
                sections: [
                    {
                        id: "productionDeployment",
                        name: "Production Deployment Maturity",
                        weight: "high",
                        criteria: [
                            {
                                id: "production_ratio",
                                text: "% of AI projects in production vs. pilot/POC",
                                evidence: "Project portfolio with status classification",
                                weight: "high"
                            },
                            {
                                id: "system_integration",
                                text: "AI solutions integrated into existing systems",
                                evidence: "Architecture diagrams, API integration documentation",
                                weight: "high"
                            },
                            {
                                id: "deployment_time",
                                text: "Average time from pilot to production deployment",
                                evidence: "Project timelines, deployment cadence metrics",
                                weight: "medium"
                            },
                            {
                                id: "sla_monitoring",
                                text: "Production AI systems have SLAs and monitoring",
                                evidence: "SLA definitions, monitoring dashboards, alert logs",
                                weight: "high"
                            },
                            {
                                id: "rollback_capability",
                                text: "Capability to rollback or disable AI features",
                                evidence: "Deployment procedures, feature flags, rollback tests",
                                weight: "medium"
                            }
                        ]
                    }
                ]
            }
        }
    },
    organizational: {
        name: "Organizational Diagnostics",
        color: "#375623",
        gradient: "linear-gradient(135deg, #375623, #70AD47)",
        modules: {
            workforceTransformation: {
                id: "workforceTransformation",
                name: "Workforce Transformation",
                chapter: "Chapter 5: Recontract With Your Workforce",
                duration: "2 weeks",
                sections: [
                    {
                        id: "roleImpact",
                        name: "Role Impact & Workforce Planning",
                        weight: "high",
                        criteria: [
                            {
                                id: "impact_analysis",
                                text: "Comprehensive role impact analysis completed",
                                evidence: "Impact assessments showing which roles change and how",
                                weight: "high"
                            },
                            {
                                id: "workforce_scenarios",
                                text: "Workforce planning scenarios for AI transformation",
                                evidence: "Headcount models, skill mix evolution, hiring plans",
                                weight: "high"
                            },
                            {
                                id: "job_redesign",
                                text: "Jobs redesigned (not just eliminated) for AI era",
                                evidence: "New role descriptions, career paths, progression frameworks",
                                weight: "high"
                            },
                            {
                                id: "clear_communication",
                                text: "Clear communication on which roles safe/at risk/changing",
                                evidence: "Employee communications, FAQs, transparency on decisions",
                                weight: "high"
                            },
                            {
                                id: "transition_support",
                                text: "Transition support for displaced or changed roles",
                                evidence: "Severance, redeployment, outplacement programs",
                                weight: "medium"
                            }
                        ]
                    }
                ]
            }
        }
    }
};

const maturityLevels = {
    1: { label: "Ad Hoc / Denial", color: "#EF4444", description: "Critical gaps, no systematic approach" },
    2: { label: "Aware / Reactive", color: "#F59E0B", description: "Aware of needs, nascent efforts" },
    3: { label: "Structured / Planned", color: "#F59E0B", description: "Some capability, inconsistent execution" },
    4: { label: "Integrated / Executing", color: "#10B981", description: "Strong capability, consistent execution" },
    5: { label: "Optimizing / Thriving", color: "#10B981", description: "Leading practice, sustainable excellence" }
};

// Export for use in application
window.diagnosticData = diagnosticData;
window.maturityLevels = maturityLevels;
