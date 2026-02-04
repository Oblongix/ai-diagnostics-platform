# Quick Start Guide

## 5-Minute Setup

### 1. Create Firebase Project (2 minutes)

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Name it: `ai-diagnostics`
4. Disable Google Analytics
5. Click "Create project"

### 2. Enable Services (2 minutes)

**Enable Authentication:**
- Go to Authentication → Sign-in method
- Enable "Email/Password"
- Click Save

**Enable Firestore:**
- Go to Firestore Database
- Click "Create database"
- Select "Production mode"
- Choose location
- Click "Enable"

**Set Security Rules:**
- In Firestore, go to "Rules" tab
- Copy/paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
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

- Click "Publish"

### 3. Configure App (1 minute)

1. In Firebase Console: Settings (gear icon) → Project settings
2. Scroll to "Your apps" → Click Web icon (</>)
3. Register app: `Diagnostics Platform`
4. Copy the `firebaseConfig` object
5. Paste into `public/config.js`:

```javascript
const firebaseConfig = {
    apiKey: "PASTE_YOUR_API_KEY",
    authDomain: "PASTE_YOUR_AUTH_DOMAIN",
    projectId: "PASTE_YOUR_PROJECT_ID",
    storageBucket: "PASTE_YOUR_STORAGE_BUCKET",
    messagingSenderId: "PASTE_YOUR_SENDER_ID",
    appId: "PASTE_YOUR_APP_ID"
};
```

### 4. Run Locally

**Option A - Python (simplest):**
```bash
cd ai-diagnostics-platform/public
python3 -m http.server 8000
```

**Option B - Node:**
```bash
npm install -g http-server
cd ai-diagnostics-platform/public
http-server -p 8000
```

Open: http://localhost:8000

### 5. First Login

1. Click "Create Account"
2. Fill in your details
3. Click "Create Account"
4. You're in!

## First Assessment

### Create Your First Engagement

1. Click "New Engagement" button
2. Enter:
   - Client Name: `Test Client`
   - Select: Strategic Diagnostics
3. Click "Create Engagement"
4. Click on the engagement card
5. Click "Start Assessment" on any module

### Conduct Assessment

**Overview Tab**: Read module objectives

**Quantitative Assessment Tab**:
- Click score buttons (1-5) for each criterion
- Add evidence notes
- Click "Save Progress"

**Interview Protocol Tab**:
- Use questions as interview guide
- Take notes in text areas

**Document Analysis Tab**:
- Check off collected documents
- Add analysis notes

**Findings Tab**:
- Document key findings
- Write recommendations
- Click "Save Findings"

## Tips

✅ **Save frequently** - Click save buttons regularly
✅ **Use probing questions** - They guide deeper inquiry
✅ **Document evidence** - Critical for credibility
✅ **Collaborate** - Invite team members to projects
✅ **Track time** - Log hours as you work

## Common Issues

**Can't login?**
- Check Firebase config in `config.js`
- Verify Email/Password is enabled in Firebase Console

**Changes not saving?**
- Check browser console for errors
- Verify you're part of project's team
- Check internet connection

**Permission denied?**
- Verify Firestore security rules are published
- Confirm you're authenticated
- Check you're a team member of the project

## What's Next?

📚 Read full README.md for complete documentation
🎯 Customize diagnostic criteria for your needs  
👥 Invite team members to collaborate
📊 Export reports when assessments complete
🚀 Deploy to Firebase Hosting for team access

---

**Need help?** Check the full README.md file or Firebase documentation.
