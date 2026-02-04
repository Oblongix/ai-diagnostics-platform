# AI Transformation Diagnostics Platform
## Complete Deployment & Usage Guide

<!-- CI trigger: touching file to retrigger GitHub Actions -->

---

## 📦 What You Have

A complete, production-ready diagnostic platform with:

✅ **Multi-user authentication** - Team collaboration with Firebase Auth
✅ **Three diagnostic suites** - Strategic, Operational, Organizational  
✅ **12 comprehensive modules** - Based on CEO's Guide chapters
✅ **Real-time collaboration** - Changes sync across team instantly
✅ **Professional UI** - Modern, responsive consultant interface
✅ **Structured workflows** - Quantitative scoring, interviews, documents, findings
✅ **Progress tracking** - Dashboards and engagement metrics
✅ **Cloud database** - Secure Firebase Firestore backend

---

## 🚀 Deployment Options

### Option 1: Quick Local Testing (5 minutes)

**Best for:** Initial testing, single-user trials

```bash
# Navigate to the public folder
cd ai-diagnostics-platform/public

# Start a local server
python3 -m http.server 8000

# Open in browser
# http://localhost:8000
```

### Option 2: Firebase Hosting (15 minutes)

**Best for:** Team deployment, production use, secure https

**Step 1 - Install Firebase CLI:**
```bash
2
```

**Step 2 - Login:**
```bash
firebase login
```

**Step 3 - Initialize (in project root):**
```bash
cd ai-diagnostics-platform
firebase init hosting
```

Select:
- Your Firebase project
- Public directory: `public`
- Single-page app: `Yes`
- Don't overwrite index.html

**Step 4 - Deploy:**
```bash
firebase deploy --only hosting
```

Your app will be live at: `https://your-project-id.web.app`

### Option 3: Other Platforms

**Netlify:**
1. Drag/drop `public` folder to Netlify
2. Done!

**Vercel:**
1. Connect GitHub repo
2. Set build command: (none)
3. Set output directory: `public`
4. Deploy

**AWS S3:**
1. Create S3 bucket with static hosting
2. Upload `public` folder contents
3. Configure bucket policy for public read

---

## ⚙️ Initial Configuration

### Firebase Setup (Required - 10 minutes)

**1. Create Firebase Project:**
- Go to https://console.firebase.google.com/
- Click "Add project"
- Name: `ai-diagnostics` (or your choice)
- Disable Analytics (optional)
- Click "Create project"

**2. Enable Authentication:**
- Go to Authentication → Sign-in method
- Click Email/Password → Enable → Save

**3. Enable Firestore Database:**
- Go to Firestore Database → Create database
- Start in production mode
- Select region (us-central1 recommended)
- Click Enable

**4. Configure Security Rules:**
- In Firestore, click Rules tab
- Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Projects collection
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

- Click Publish

**5. Get Configuration:**
- Settings icon → Project settings
- Scroll to "Your apps"
- Click Web icon (</>)
- Register app name: `Diagnostics Platform`
- Copy `firebaseConfig` object

**6. Update config.js:**
Open `public/config.js` and replace:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY_HERE",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID_HERE"
};
```

Save the file. **Configuration complete!**

### CI: Use a GCP service account for secure deploys (recommended)

For automated deploys from GitHub Actions, create a service account with the
`Firebase Hosting Admin` role (or equivalent) and add its JSON key to your
repository secrets as `GCP_SA_KEY`.

1. Create service account and key (run locally with Cloud SDK and proper IAM rights):

```bash
# replace <SA_NAME> and <PROJECT_ID>
gcloud iam service-accounts create <SA_NAME> --project=ceoaitransform
gcloud projects add-iam-policy-binding ceoaitransform \
    --member="serviceAccount:<SA_NAME>@ceoaitransform.iam.gserviceaccount.com" \
    --role="roles/firebasehosting.admin"
gcloud iam service-accounts keys create key.json \
    --iam-account=<SA_NAME>@ceoaitransform.iam.gserviceaccount.com --project=ceoaitransform
```

2. Add the key to GitHub Secrets (run locally):

```bash
gh secret set GCP_SA_KEY --body-file=key.json --repo oblongix/ai-diagnostics-platform
```

Once the secret is present, the GitHub Action deploy workflow will use the
service account for authentication. If the secret is absent it falls back to
`FIREBASE_TOKEN`.

---

## 👤 User Guide

### Creating Your First Account

1. Open the application
2. Click "Create Account" tab
3. Enter:
   - Full Name: `John Smith`
   - Email: `john@firm.com`
   - Company: `Acme Consulting`
   - Role: Lead Consultant
   - Password: (strong password)
4. Click "Create Account"
5. You'll be logged in automatically

### Creating an Engagement

1. Click "New Engagement" button (top right)
2. Fill in client details:
   - **Client Name** (required): `Test Manufacturing Co`
   - Industry: `Manufacturing`
   - Company Size: `Large (5,000-50,000)`
   - Revenue: `$1B - $10B`
   - Description: Brief project scope
3. **Select Diagnostic Suites** (check one or more):
   - ✅ Strategic Diagnostics (5 modules, 8-10 weeks)
   - ✅ Operational Diagnostics (4 modules, 6-8 weeks)
   - ✅ Organizational Diagnostics (3 modules, 4-5 weeks)
4. Click "Create Engagement"

### Conducting a Diagnostic Assessment

**1. Open Engagement:**
- Click on engagement card from dashboard

**2. Select Suite:**
- Click on suite nav button (Strategic/Operational/Organizational)

**3. Start Module:**
- Click on module card
- Click "Start Assessment"

**4. Complete Assessment Sections:**

**📋 Overview Tab:**
- Read module objectives
- Review assessment approach
- Understand key sections

**📊 Quantitative Assessment Tab:**
- For each criterion:
  - Read the criterion text
  - Review evidence requirements
  - Click score button (1-5):
    - 1 = Not present, no evidence
    - 2 = Aware, limited evidence
    - 3 = Moderate capability, some evidence
    - 4 = Strong capability, clear evidence
    - 5 = Leading practice, verified evidence
  - Add detailed evidence notes in text box
- Click "Save Progress" frequently
- Click "Calculate Score" when complete

**🎤 Interview Protocol Tab:**
- Use structured question guides
- Conduct stakeholder interviews
- Follow probing questions
- Document responses in note fields
- Save notes regularly

**📄 Document Analysis Tab:**
- Check off documents collected
- Upload or link to documents
- Add analysis notes for each
- Focus on specified analysis areas

**💡 Findings & Analysis Tab:**
- Document key findings
- Write gap analysis
- Provide recommendations
- List priority actions
- Click "Save Findings"

**5. Repeat for All Modules:**
- Complete all sections
- Track progress on dashboard
- Collaborate with team members

### Team Collaboration

**Adding Team Members:**
1. Open engagement
2. Click "Team" button
3. Enter email addresses
4. Assign roles
5. Send invitations

**Real-Time Sync:**
- All team members see updates instantly
- No need to refresh
- Conflict-free collaboration

---

## 📊 Understanding the Diagnostic Framework

### Maturity Scoring

**Level 1 - Ad Hoc (1.0-1.9)** 🔴
- No systematic approach
- Critical gaps
- Requires urgent attention

**Level 2 - Aware (2.0-2.9)** 🟠
- Acknowledging need
- Nascent efforts
- Needs structured approach

**Level 3 - Structured (3.0-3.9)** 🟡
- Some capability
- Inconsistent execution
- Requires strengthening

**Level 4 - Integrated (4.0-4.9)** 🟢
- Strong capability
- Consistent execution
- Well-managed

**Level 5 - Optimizing (5.0)** 🟢
- Leading practice
- Sustainable excellence
- Continuous improvement

### Assessment Components

**Quantitative (40%)**
- Evidence-based scoring
- Weighted criteria
- Objective measurements

**Qualitative (30%)**
- Stakeholder interviews
- Observations
- Contextual understanding

**Documentary (20%)**
- Document analysis
- Artifact review
- Historical evidence

**Synthesis (10%)**
- Triangulation
- Gap analysis
- Recommendations

---

## 🔒 Security & Best Practices

### Security Checklist

✅ **Keep Firebase config secure** - Don't commit to public repos
✅ **Use strong passwords** - Enforce for all team members
✅ **Review Firestore rules** - Ensure proper access control
✅ **Enable App Check** - Additional protection (optional)
✅ **Regular backups** - Export Firestore data monthly
✅ **Monitor usage** - Check Firebase Console for anomalies

### Best Practices

**For Consultants:**
- Save work frequently (every 15-30 minutes)
- Document evidence thoroughly
- Use interview protocols as guides, adapt as needed
- Collaborate through the platform
- Log time spent on each module

**For Leads:**
- Review team progress weekly
- Quality check assessments
- Ensure evidence is well-documented
- Coordinate team member assignments
- Track overall engagement timeline

**For Clients (Future):**
- Read-only access can be granted
- Share progress updates
- Export reports for presentations
- Maintain confidentiality

---

## 🛠️ Troubleshooting

### Cannot Login
**Problem:** Email/password rejected
**Solutions:**
1. Verify Firebase config in `config.js` is correct
2. Check Email/Password is enabled in Firebase Console
3. Try "Forgot Password" if account exists
4. Create new account if first time

### Changes Not Saving
**Problem:** Data doesn't persist
**Solutions:**
1. Check browser console (F12) for errors
2. Verify internet connection
3. Confirm Firestore rules are published
4. Check Firebase quota limits not exceeded
5. Try refreshing and re-entering data

### Permission Denied
**Problem:** "Permission denied" errors
**Solutions:**
1. Verify you're authenticated (logged in)
2. Confirm you're a team member of the project
3. Check Firestore security rules are correct
4. Verify project ID in config matches Firebase Console

### Blank Page / Won't Load
**Problem:** Page doesn't display
**Solutions:**
1. Check browser console for errors
2. Verify all files are served correctly
3. Clear browser cache
4. Try different browser
5. Check Firebase hosting status

### Team Members Can't Access
**Problem:** Collaborators can't see project
**Solutions:**
1. Verify email addresses are correct
2. Ensure they've created accounts
3. Check they're added to project.teamMembers array
4. Have them logout and login again
5. Verify Firestore security rules

---

## 📈 Advanced Features (Coming Soon)

### Planned Enhancements

**Phase 2:**
- PDF report generation
- Excel data export
- Email notifications
- Client portal (read-only access)

**Phase 3:**
- Document upload to Firebase Storage
- Advanced analytics dashboard
- Benchmark comparisons
- Template library

**Phase 4:**
- Mobile app (iOS/Android)
- Offline capability
- AI-assisted recommendations
- Automated scoring suggestions

---

## 📞 Support Resources

### Documentation
- **README.md** - Complete technical documentation
- **QUICKSTART.md** - 5-minute setup guide
- This file - Comprehensive usage guide

### Firebase Resources
- Firebase Console: https://console.firebase.google.com/
- Firebase Documentation: https://firebase.google.com/docs
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security

### Browser Developer Tools
- Press F12 to open console
- Check Network tab for failed requests
- Review Console tab for JavaScript errors

---

## 📝 Customization Guide

### Adding Your Own Diagnostic Criteria

Edit `public/diagnostic-data.js`:

```javascript
// Add new module
diagnosticData.strategic.modules.customModule = {
    id: "customModule",
    name: "Custom Assessment Module",
    chapter: "Your Chapter/Framework",
    duration: "2 weeks",
    sections: [
        {
            id: "customSection",
            name: "Your Section Name",
            weight: "high",
            criteria: [
                {
                    id: "criterion_1",
                    text: "Your assessment criterion",
                    evidence: "Evidence you need to collect",
                    weight: "high"
                }
            ]
        }
    ]
};
```

### Changing Colors/Branding

Edit `public/styles.css`:

```css
:root {
    --strategic-primary: #YOUR_COLOR;
    --operational-primary: #YOUR_COLOR;
    --organizational-primary: #YOUR_COLOR;
}
```

### Modifying Interview Questions

Edit `public/diagnostic-data.js` interview protocols:

```javascript
interviewProtocol: {
    ceo: {
        duration: 90,
        questions: [
            {
                category: "Your Category",
                time: 20,
                questions: [
                    {
                        q: "Your question here?",
                        probes: ["Probe 1", "Probe 2"]
                    }
                ]
            }
        ]
    }
}
```

---

## ✅ Launch Checklist

Before going live with your team:

- [ ] Firebase project created and configured
- [ ] Authentication enabled and tested
- [ ] Firestore enabled with security rules
- [ ] `config.js` updated with your Firebase credentials
- [ ] Application deployed (Firebase Hosting or other)
- [ ] Test account created and login working
- [ ] Test engagement created successfully
- [ ] At least one module assessment tested end-to-end
- [ ] Team members invited and access confirmed
- [ ] SSL certificate active (https)
- [ ] Mobile responsiveness tested
- [ ] Documentation distributed to team
- [ ] Support process established

---

## 🎯 Success Metrics

Track these metrics for your consulting practice:

- **Engagement Completion Rate**: % of started engagements completed
- **Time to Completion**: Average days from start to final report
- **Assessment Quality**: Internal review scores of completed diagnostics
- **Client Satisfaction**: Post-engagement NPS or CSAT scores
- **Team Utilization**: Hours logged per consultant per week
- **Platform Adoption**: % of engagements using digital platform

---

**You're ready to transform how your firm conducts AI diagnostics!**

For questions or support, refer to the troubleshooting section above or check the Firebase documentation.

**Built for consulting excellence. Powered by Firebase. Designed for impact.**
