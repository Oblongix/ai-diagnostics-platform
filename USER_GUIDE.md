# AI Diagnostics Platform - User Guide

This guide explains the full platform workflow for consultants and leadership teams using the AI Diagnostics Platform.

It covers:
- Every major feature in the app
- How to run the system locally
- Two realistic end-to-end project examples

## 1. Quick Start

1. Open PowerShell.
2. Go to the project folder:
```powershell
cd C:\Users\vince\OneDrive\Documents\ai-diagnostics-platform
```
3. Install dependencies:
```powershell
npm install
```
4. Start the app:
```powershell
npm start
```
5. Open the URL printed in terminal (usually `http://127.0.0.1:8080`, or next free port).

Local mode uses the in-memory mock backend by default.

## 2. Authentication

### Sign In
- Use the **Sign In** tab on the login screen.
- Enter email and password.

### Create Account
- Use the **Create Account** tab.
- Complete full name, email, company, role, and password.
- You will be signed in automatically.

### Forgot Password
- Use **Forgot password?** on the sign-in form.

## 3. Main Navigation

### Dashboard
- Shows active engagements, team size, hours logged, average completion, and recent engagements.

### Client Engagements
- Full engagement list with filtering by:
- `Status`
- `Suite`
- Text search

### Team Collaboration
- Team management is launched from each engagement (Team button).

## 4. Engagement Lifecycle Features

## 4.1 Create Engagement

Use **New Engagement** and complete:
- Client Name
- Industry
- Company Size
- Annual Revenue
- Diagnostic Suite(s)
- Primary Service
- Description
- Optional team member emails (invite queue)

Result:
- Engagement is created
- Service deliverables are auto-generated
- Book-aligned project plan is auto-generated
- Diagnostic assessment structure is initialized

## 4.2 Edit Engagement

From an engagement, click **Edit** to update:
- Client details (name, industry, size, revenue)
- Primary service
- Description

Changing primary service adds any missing deliverables for that service.

## 4.3 Add Diagnostic Suites

Inside engagement detail:
1. Click **Add Suite**
2. Select an available suite

The suite is added and module cards appear for that suite.

## 4.4 Team Management

From engagement detail, click **Team**.

Features:
- Invite by email + role
- View pending invites
- Cancel pending invites
- Change role for existing team members
- Remove team members

## 4.5 Engagement Workspace

Each engagement has a workspace with four blocks.

### Service Assignment
- Reassign primary service and save.

### Engagement People (CRUD)
- Add person with role/firm/email/notes
- Edit person
- Delete person

### Service Deliverables
- Update deliverable status
- Add progress notes

### Project Plan (Book-Aligned)
- Update phase status
- Add phase update notes

## 4.6 Diagnostics and Assessments

Open any module card to access:
- Overview
- Quantitative Assessment
- Interview Protocol
- Document Analysis
- Findings

### Quantitative Assessment
- Score criteria (1-5)
- Capture evidence notes
- Calculate score
- Save assessment progress

### Findings
- Save key findings
- Save gap analysis
- Save recommendations
- Add priority actions

### Document Analysis
- Trigger document upload/link actions (integration hooks)

## 4.7 Export and Delete

From engagement detail:
- **Export** downloads project JSON snapshot
- **Delete** performs soft delete and writes audit log event

## 5. Real-Life Example A (Banking Transformation)

**Client**: Apex Financial  
**Objective**: Move from AI pilot activity to governed business transformation.

### Steps
1. Create engagement:
- Industry: Financial
- Suites: Strategic
- Primary service: AI Strategy Design
2. Open engagement and edit:
- Change primary service to AI Transformation Roadmap
- Update description with phase context
3. Add another suite from detail view.
4. In workspace:
- Add stakeholder (COO), edit details, remove, then re-add final record
- Update a deliverable with status + note
- Update first plan phase with status + governance update note
5. Open Team modal:
- Send invite
- Cancel pending invite
6. Open module:
- Score quantitative criterion
- Calculate and save score
- Add findings/recommendations and priority action
- Trigger document upload/link actions
7. Sign out and sign back in:
- Confirm deliverable and plan updates persist.

### Outcome
- Full planning + delivery oversight workflow executed
- Diagnostic module completion captured
- Team/invite and stakeholder records validated

## 6. Real-Life Example B (Healthcare Readiness Program)

**Client**: Northstar Healthcare  
**Objective**: Build workforce and governance readiness baseline.

### Steps
1. Create engagement:
- Industry: Healthcare
- Suites: Organizational
- Primary service: Assessments
2. Edit engagement:
- Change industry and description for benchmark context
- Reassign primary service to Fundamentals
3. Update workspace:
- Add deliverable update note tied to capability baseline
- Add project plan update tied to data ownership mapping
4. Use Team modal:
- Send and cancel pending invite
5. Open module and complete:
- Quantitative scoring
- Findings section updates
- Priority action entry
6. Delete engagement when complete.

### Outcome
- Assessment-to-foundations transition validated
- Full update workflow and closure/deletion workflow validated

## 7. Validation Commands

Run core validation:
```powershell
npm test
```

Run full lifecycle examples (two end-to-end scenarios):
```powershell
node tests/full-lifecycle-examples.js
```

Run smoke test:
```powershell
$env:BASE_URL='https://ceoaitransform.web.app'
node tests/smoke.js
Remove-Item Env:BASE_URL
```

## 8. Notes for Production Use

- Local mode uses a mock backend and is safe for development/testing.
- Production mode uses Firebase config from `public/config.js` or `window.__FIREBASE_CONFIG__`.
- Invite email links require real Firebase Auth configuration.
- Document upload/link actions are currently integration hooks and can be connected to a document service.
