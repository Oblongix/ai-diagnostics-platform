# AI Transformation Diagnostics Platform

A professional, enterprise-grade diagnostic platform for consultants conducting AI transformation assessments based on "The CEO's Guide to AI Transformation."

## Features

### Core Capabilities
- **Multi-User Collaboration**: Team-based diagnostic engagements with role-based workflows
- **Three Diagnostic Suites**: Strategic, Operational, and Organizational diagnostics
- **Structured Assessment**: Quantitative scoring, interview protocols, document analysis
- **Real-Time Sync**: Firebase backend ensures all team members see latest updates
- **Progress Tracking**: Comprehensive dashboards and engagement metrics
- **Professional UI**: Modern, responsive design built for consulting workflows

### Diagnostic Suites

**Strategic Diagnostics** (5 modules, 8-10 weeks)
- Business Redesign vs Technology Program
- Decision-Making Architecture
- Board Governance & Oversight
- Innovation Under Uncertainty
- Competitive Strategy in AI Era

**Operational Diagnostics** (4 modules, 6-8 weeks)
- Workflow Embedding & Production Deployment
- Data & Operating Foundation Readiness
- Value Measurement & ROI Tracking
- AI Dependency & Vendor Management

**Organizational Diagnostics** (3 modules, 4-5 weeks)
- Workforce Recontracting & Role Redesign
- AI Risk Governance & Enterprise Controls
- Failure Preparedness & Control Testing

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase (Authentication, Firestore Database)
- **Authentication**: Firebase Auth with email/password
- **Database**: Cloud Firestore (NoSQL, real-time)
- **Hosting**: Firebase Hosting (optional)

## Setup Instructions

### Prerequisites

1. **Node.js** (v16 or higher)
   ```bash
   node --version  # Should show v16+
   ```

2. **Firebase Account**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Sign in with Google account

### Step 1: Create Firebase Project

1. In Firebase Console, click **"Add project"**
2. Enter project name: `ai-diagnostics-platform` (or your choice)
3. Disable Google Analytics (optional for this use case)
4. Click **"Create project"**

### Step 2: Enable Firebase Services

#### Enable Authentication
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **"Email/Password"**
3. Toggle **Enable** and click **Save**

#### Enable Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Choose **"Start in production mode"** for now (we'll add security rules)
3. Select a location (choose closest to your users)
4. Click **Enable**

#### Set Firestore Security Rules
1. In Firestore Database, go to **Rules** tab
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Projects: can read/write if you're a team member
    match /projects/{projectId} {
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.teamMembers;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                       request.auth.uid in resource.data.teamMembers;
      allow delete: if request.auth != null && 
                       request.auth.uid == resource.data.createdBy;
    }
  }
}
```

3. Click **Publish**

### Step 3: Get Firebase Configuration

1. In Firebase Console, click the gear icon → **Project settings**
2. Scroll down to **"Your apps"** section
3. Click the **Web icon (</>)** to add a web app
4. Enter app nickname: `Diagnostics Platform Web`
5. Click **Register app**
6. Copy the `firebaseConfig` object

### Step 4: Configure the Application

1. Open `public/config.js`
2. Replace the placeholder values with your Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### Step 5: Run Locally

#### Option A: Using Python (simplest)
```bash
cd ai-diagnostics-platform/public
python3 -m http.server 8000
```

Then open: http://localhost:8000

#### Option B: Using Node.js http-server
```bash
npm install -g http-server
cd ai-diagnostics-platform/public
http-server -p 8000
```

Then open: http://localhost:8000

#### Option C: Using VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"

### Step 6: Create Your First Account

1. Open the application in your browser
2. Click **"Create Account"** tab
3. Fill in your information:
   - Full Name
   - Email
   - Company/Firm
   - Role (Lead Consultant, Consultant, or Analyst)
   - Password
4. Click **"Create Account"**
5. You'll be automatically logged in

### Step 7: Create Your First Engagement

1. Click **"New Engagement"** button
2. Enter client information:
   - Client Name (required)
   - Industry
   - Company Size
   - Annual Revenue
   - Description
3. Select one or more diagnostic suites
4. Click **"Create Engagement"**

## Deployment to Firebase Hosting (Optional)

### Option 1: Deploy to Firebase Hosting

1. **Install Firebase CLI**:
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Initialize Firebase in project**:
```bash
cd ai-diagnostics-platform
firebase init hosting
```

When prompted:
- Select your Firebase project
- Set public directory: `public`
- Configure as single-page app: `Yes`
- Set up automatic builds: `No`
- Don't overwrite index.html

4. **Deploy**:
```bash
firebase deploy --only hosting
```

5. **Access your app**:
Your app will be live at: `https://your-project-id.web.app`

### Option 2: Deploy to Other Platforms

The `public` folder contains a static website that can be deployed to:
- **Netlify**: Drag and drop the `public` folder
- **Vercel**: Import the GitHub repo
- **AWS S3**: Upload files to S3 bucket with static hosting
- **Any web server**: Copy `public` folder contents to web root

## Usage Guide

### For Lead Consultants

1. **Create Engagement**: Set up new client diagnostic project
2. **Add Team Members**: Invite consultants and analysts to collaborate
3. **Select Suites**: Choose Strategic, Operational, and/or Organizational diagnostics
4. **Track Progress**: Monitor team progress on dashboard
5. **Export Reports**: Generate assessment reports and deliverables

### For Consultants

1. **Access Assigned Engagements**: See projects you're part of
2. **Conduct Assessments**: 
   - Work through quantitative criteria (1-5 scoring)
   - Document evidence for each criterion
   - Follow interview protocols
   - Analyze required documents
   - Synthesize findings
3. **Collaborate**: All changes sync in real-time across team
4. **Log Time**: Track hours spent on engagement

### Assessment Workflow

Each diagnostic module includes:

**1. Overview**
- Module objectives and approach
- Key sections and priorities
- Timeline and requirements

**2. Quantitative Assessment**
- Score 15-20 criteria per section on 1-5 scale
- Document evidence for each score
- Automatic weighted score calculation
- Color-coded maturity levels

**3. Interview Protocol**
- Structured question guides
- Stakeholder-specific protocols
- Probing questions
- Note-taking interface

**4. Document Analysis**
- Required document checklist
- Upload or link to documents
- Analysis note capture
- Focus areas for each document

**5. Findings & Analysis**
- Key findings synthesis
- Gap analysis
- Recommendations
- Priority actions

## Database Structure

### Collections

**users**
```javascript
{
  uid: "user_id",
  name: "John Smith",
  email: "john@firm.com",
  company: "Acme Consulting",
  role: "lead", // lead | consultant | analyst
  createdAt: timestamp,
  projects: ["project_id1", "project_id2"]
}
```

**projects**
```javascript
{
  id: "project_id",
  clientName: "Fortune 500 Co",
  industry: "financial",
  companySize: "large",
  revenue: "large",
  description: "Full AI transformation assessment",
  suites: ["strategic", "operational"],
  status: "active", // active | paused | completed
  progress: 45, // 0-100
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: "user_id",
  teamMembers: ["user_id1", "user_id2"],
  hoursLogged: 120,
  assessments: {
    strategic: {
      modules: {
        businessRedesign: {
          criteria: {
            "s0_c0": { score: 3, notes: "Evidence...", timestamp },
            "s0_c1": { score: 4, notes: "Evidence...", timestamp }
          },
          findings: {
            keyFindings: "Text...",
            gapAnalysis: "Text...",
            recommendations: "Text...",
            timestamp
          },
          lastUpdated: timestamp
        }
      },
      overallScore: 3.5,
      status: "in_progress"
    }
  }
}
```

## Customization

### Adding New Diagnostic Modules

Edit `public/diagnostic-data.js`:

```javascript
diagnosticData.strategic.modules.newModule = {
    id: "newModule",
    name: "New Module Name",
    chapter: "Chapter X: Description",
    duration: "2 weeks",
    sections: [
        {
            id: "sectionId",
            name: "Section Name",
            weight: "high",
            criteria: [
                {
                    id: "criterion_id",
                    text: "Assessment criterion",
                    evidence: "Evidence required",
                    weight: "high"
                }
            ]
        }
    ]
};
```

### Customizing Colors

Edit CSS variables in `public/styles.css`:

```css
:root {
    --strategic-primary: #1F4E78;
    --operational-primary: #C55A11;
    --organizational-primary: #375623;
}
```

## Security Considerations

### Production Deployment Checklist

- [ ] Update Firestore security rules for production
- [ ] Enable Firebase App Check for additional security
- [ ] Set up Cloud Functions for sensitive operations
- [ ] Implement proper error handling and logging
- [ ] Add rate limiting for API calls
- [ ] Enable audit logging for compliance
- [ ] Set up backup and disaster recovery
- [ ] Implement user role-based permissions
- [ ] Add data export functionality for GDPR compliance

### Recommended Enhancements

1. **Email Invitations**: Use Firebase Cloud Functions to send team invites
2. **File Uploads**: Add Firebase Storage for document uploads
3. **PDF Export**: Generate assessment reports as PDFs
4. **Notifications**: Real-time notifications for team updates
5. **Audit Trail**: Track all changes for compliance
6. **Advanced Analytics**: Dashboard with engagement metrics
7. **Template Library**: Pre-built assessment templates
8. **Client Portal**: Read-only access for clients

## Troubleshooting

### Authentication Issues
- Verify Firebase config in `config.js` is correct
- Check that Email/Password auth is enabled in Firebase Console
- Clear browser cache and try again

### Database Permission Errors
- Verify Firestore security rules are published
- Check that user is authenticated
- Confirm user is in project's teamMembers array

### Data Not Syncing
- Check browser console for errors
- Verify internet connection
- Confirm Firebase project is active
- Check Firestore usage limits haven't been exceeded

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Firebase configuration is correct
3. Review Firestore security rules
4. Check Firebase Console for service status

## License

Proprietary - for internal consulting use only.

## Version History

- **v1.0.0** - Initial release
  - Multi-user authentication
  - Three diagnostic suites (12 modules total)
  - Real-time collaboration
  - Progress tracking and dashboards
  - Interview protocols and document analysis

---

**Built for professional consulting firms conducting AI transformation diagnostics.**
