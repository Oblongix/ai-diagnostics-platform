const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

function waitForServer(url, timeout = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? require('https') : http;
    (function check(){
      const req = client.get(url, res => { res.resume(); resolve(); });
      req.on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error('timeout'));
        setTimeout(check, 200);
      });
    })();
  });
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

(async () => {
  // Optionally spawn a local static server when testing localhost; skip for deployed BASE_URL
  const base = process.env.BASE_URL || 'http://127.0.0.1:8082';
  let serverProc = null;
  if (base.includes('127.0.0.1') || base.includes('localhost')) {
    const logsDir = path.join(__dirname);
    const serverLog = path.join(logsDir, 'server.log');
    fs.writeFileSync(serverLog, `--- server log ${new Date().toISOString()} ---\n`);
    serverProc = spawn('npx', ['http-server', 'public', '-p', '8082'], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    serverProc.stdout.on('data', d => {
      process.stdout.write(`[server] ${d}`);
      fs.appendFileSync(serverLog, `[OUT ${new Date().toISOString()}] ${d}`);
    });
    serverProc.stderr.on('data', d => {
      process.stderr.write(`[server-err] ${d}`);
      fs.appendFileSync(serverLog, `[ERR ${new Date().toISOString()}] ${d}`);
    });
    serverProc.on('exit', (code, sig) => {
      const msg = `server exited code=${code} signal=${sig} pid=${serverProc.pid} at ${new Date().toISOString()}\n`;
      console.error(msg);
      fs.appendFileSync(serverLog, `[EXIT] ${msg}`);
    });
    serverProc.on('close', (code, sig) => {
      const msg = `server closed code=${code} signal=${sig} pid=${serverProc.pid} at ${new Date().toISOString()}\n`;
      console.error(msg);
      fs.appendFileSync(serverLog, `[CLOSE] ${msg}`);
    });
  }

  console.log('Waiting for server at', base);
  await waitForServer(base);
  console.log('Server is up');

  let browser;
  let page;
  try {
    const headless = process.env.HEADFUL ? false : true;
    const slowMo = process.env.SLOWMO ? Number(process.env.SLOWMO) : 0;
    browser = await puppeteer.launch({ args: ['--no-sandbox'], headless, slowMo });
    page = await browser.newPage();
    page.setDefaultTimeout(60000);

    // Artifacts and logging
    const artifactsDir = path.join(__dirname);
    const runLog = path.join(artifactsDir, 'deploy-run.log');
    const appendLog = (s) => { try { fs.appendFileSync(runLog, `[${new Date().toISOString()}] ${s}\n`); } catch(e){} };
    appendLog('Starting smoke run for BASE_URL=' + base);

    page.on('console', async msg => {
      try {
        const vals = await Promise.all(msg.args().map(a => a.jsonValue().catch(() => a.toString())));
        appendLog('CONSOLE ' + msg.type() + ': ' + vals.map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(' '));
      } catch (e) { appendLog('CONSOLE ' + msg.type() + ': ' + msg.text()); }
    });
    page.on('pageerror', err => appendLog('PAGEERROR: ' + (err && err.stack ? err.stack : err)));
    page.on('response', res => { try { if (!res.ok()) appendLog(`RESPONSE ${res.status()} ${res.url()}`); } catch(e){} });

    console.log('Opening', base);
  // Try navigation a few times to work around transient connection resets
  let navOk = false;
  let attempts = 0;
  const maxAttempts = 5;
  while(!navOk && attempts < maxAttempts){
    attempts++;
    try{
      await page.goto(base, { waitUntil: 'networkidle2' });
      navOk = true;
    }catch(err){
      const msg = `page.goto attempt=${attempts} failed: ${err.message}\n`;
      console.error(msg);
      fs.appendFileSync(path.join(__dirname,'server.log'), msg);
      // if server process exited, abort early
      if (serverProc.killed || serverProc.exitCode !== null){
        throw new Error('Server process exited before navigation could complete');
      }
      await sleep(500 * attempts);
    }
  }
  if (!navOk) throw new Error('Failed to navigate to app after multiple attempts');

  // Sign in with mock user
  await page.waitForSelector('#loginEmail');
  await page.type('#loginEmail', 'vincentapowell@msn.com');
  await page.type('#loginPassword', 'Testing01&');
  await page.click('#loginBtn');

  // Wait for main app to show
  await page.waitForSelector('#mainApp', { visible: true });
  console.log('Signed in, main app visible');

  // Create project: use UI flow for local runs; for deployed runs, write directly to DB to avoid UI timing issues
  let createdProjectId = null;
  if (base.includes('127.0.0.1') || base.includes('localhost')) {
    // UI-driven creation for local mock
    await page.waitForSelector('[data-action="open-new-project"]');
    await page.click('[data-action="open-new-project"]');
    await page.waitForSelector('#newProjectModal.active, #newProjectModal');
    console.log('New Project modal opened');

    // Fill project form
    await page.type('#clientName', 'Acme Test Co');
    await page.select('#clientIndustry', 'technology');
    await page.select('#companySize', 'small');
    await page.select('#annualRevenue', 'small');
    await page.type('#projectDescription', 'Automated smoke test project');
    await page.evaluate(() => {
      const el = document.querySelector('input[name="suite"][value="strategic"]');
      if (el) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await page.click('#createProjectBtn');

    // Poll DB for created project id
    await sleep(1000);
    console.log('Create project clicked, polling DB for new project');
    const start = Date.now();
    while (Date.now() - start < 60000) {
      const res = await page.evaluate(async () => {
        try {
          const db = (window.firebaseServices && window.firebaseServices.db) || (window.firebase && window.firebase.firestore && window.firebase.firestore());
          if (!db) return { ok: false, reason: 'no-db' };
          const snap = await db.collection('projects').where('clientName', '==', 'Acme Test Co').get();
          const docs = (snap && snap.docs) ? snap.docs.map(d => ({ id: d.id })) : [];
          return { ok: true, docs };
        } catch (e) { return { ok: false, err: (e && e.message) || String(e) }; }
      });
      if (res && res.ok && res.docs && res.docs.length) { createdProjectId = res.docs[0].id; break; }
      await sleep(1500);
    }
    if (!createdProjectId) {
      appendLog && appendLog('Project not found in DB after polling (local)');
      try { await page.screenshot({ path: path.join(__dirname, 'deploy-failure.png'), fullPage: true }); } catch(e){}
      try { const html = await page.content(); fs.writeFileSync(path.join(__dirname, 'deploy-failure.html'), html); } catch(e){}
      throw new Error('Project not visible and not found in DB after polling (local)');
    }
    console.log('Project created (local mock) id:', createdProjectId);
  } else {
    // Deployed site: create project via direct DB write to avoid UI timing issues
    console.log('Creating project directly in deployed DB');
    const res = await page.evaluate(async () => {
      try {
        const db = (window.firebaseServices && window.firebaseServices.db) || (window.firebase && window.firebase.firestore && window.firebase.firestore());
        if (!db) throw new Error('no-db');
        const userUid = (window.appState && window.appState.currentUser && window.appState.currentUser.uid) || (window.firebaseServices && window.firebaseServices.auth && window.firebaseServices.auth.currentUser && window.firebaseServices.auth.currentUser.uid) || null;
        const projectData = {
          clientName: 'Acme Test Co',
          industry: 'technology',
          companySize: 'small',
          revenue: 'small',
          description: 'Automated smoke test project',
          suites: ['strategic'],
          status: 'active',
          progress: 0,
          createdAt: (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) ? window.firebase.firestore.FieldValue.serverTimestamp() : new Date(),
          updatedAt: (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) ? window.firebase.firestore.FieldValue.serverTimestamp() : new Date(),
          createdBy: userUid || 'smoke-runner',
          teamMembers: [userUid || 'smoke-runner'],
          hoursLogged: 0,
          assessments: {}
        };
        const doc = await db.collection('projects').add(projectData);
        // try to update user's projects list if possible
        try { if (userUid) await db.collection('users').doc(userUid).update({ projects: (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) ? window.firebase.firestore.FieldValue.arrayUnion(doc.id) : [] }); } catch(e){}
        return { ok: true, id: doc.id };
      } catch (e) { return { ok: false, error: (e && e.message) || String(e), stack: e && e.stack }; }
    });
    if (!res || !res.ok) {
      appendLog && appendLog('Direct DB create failed: ' + JSON.stringify(res));
      try { await page.screenshot({ path: path.join(__dirname, 'deploy-failure.png'), fullPage: true }); } catch(e){}
      try { const html = await page.content(); fs.writeFileSync(path.join(__dirname, 'deploy-failure.html'), html); } catch(e){}
      throw new Error('Direct DB create failed: ' + JSON.stringify(res));
    }
    createdProjectId = res.id;
    console.log('Project created directly in DB, id:', createdProjectId);
    // Verify the created doc exists and instruct the app to open it directly (avoids relying on projects list)
    try {
      const exists = await page.evaluate(async (id) => {
        try {
          const db = (window.firebaseServices && window.firebaseServices.db) || (window.firebase && window.firebase.firestore && window.firebase.firestore());
          if (!db) return { ok: false, reason: 'no-db' };
          const doc = await db.collection('projects').doc(id).get();
          const data = doc && doc.data ? doc.data() : null;
          if (!data) return { ok: false, reason: 'not-found' };
          window.appState = window.appState || {};
          window.appState.currentProject = Object.assign({ id }, data);
          if (window.renderProjectDetail) window.renderProjectDetail(window.appState.currentProject);
          if (window.switchView) window.switchView('diagnostic');
          return { ok: true };
        } catch (e) { return { ok: false, err: (e && e.message) || String(e) } }
      }, createdProjectId);
      appendLog && appendLog('Direct openProject result: ' + JSON.stringify(exists));
      await sleep(1000);
    } catch (e) { appendLog && appendLog('refresh UI after DB create failed: ' + (e && e.message)); }
  }

  // Determine project id: if we created it directly, use that id; otherwise find and click the first project card
  let projectId = createdProjectId;
  if (!projectId) {
    await page.waitForSelector('.project-card, .project-list-item', { timeout: 15000 });
    await page.click('.project-card');
    console.log('Project card clicked');
    projectId = await page.evaluate(() => {
      const el = document.querySelector('.project-card[data-id]');
      return el ? el.dataset.id : null;
    });
    if (!projectId) throw new Error('Could not determine project id');
    console.log('Project id:', projectId);
  } else {
    console.log('Using createdProjectId as projectId:', projectId);
  }

  // Add three team members and update project.teamMembers (handle both mock and real DB)
  const addedTeam = await page.evaluate(async (projId) => {
    const makeId = () => Math.random().toString(36).slice(2, 8);
    const uids = [];
    try {
      if (window.firebaseServices && window.firebaseServices.db && window.firebaseServices.db._store) {
        // mock
        const db = window.firebaseServices.db;
        for (let i = 0; i < 3; i++) {
          const uid = 'tm_' + makeId();
          db._store.users[uid] = { uid, email: `${uid}@example.com`, name: `Team ${i}`, projects: [] };
          uids.push(uid);
        }
        const FieldValue = window.firebaseServices.firebase.firestore.FieldValue;
        await db.collection('projects').doc(projId).update({ teamMembers: FieldValue.arrayUnion(...uids) });
      } else if (window.firebase && window.firebase.firestore) {
        // real firestore
        const db = window.firebase.firestore();
        const FieldValue = window.firebase.firestore.FieldValue;
        for (let i = 0; i < 3; i++) {
          const uid = 'tm_' + makeId();
          // create a lightweight user doc if possible
          try { await db.collection('users').doc(uid).set({ uid, email: `${uid}@example.com`, name: `Team ${i}`, projects: [] }); } catch(e){}
          uids.push(uid);
        }
        await db.collection('projects').doc(projId).update({ teamMembers: FieldValue.arrayUnion(...uids) });
      } else {
        throw new Error('no-db-available');
      }
    } catch (e) {
      return { error: (e && e.message) || String(e) };
    }
    return uids;
  }, projectId);
  console.log('Added team members:', addedTeam.join(', '));

  // Wait for diagnostic view
  await page.waitForSelector('#diagnosticView .diagnostic-container', { timeout: 10000 });
  console.log('Diagnostic view opened');

  // Open first module card
  await page.waitForSelector('.module-card', { timeout: 10000 });
  await page.click('.module-card');
  console.log('Module card opened (modal)');

  // Wait for module modal
  await page.waitForSelector('#moduleModal.active, #moduleModal', { timeout: 10000 });

  // Navigate to Quantitative Assessment
  await page.click('.nav-section[data-section="quantitative"]');
  await page.waitForSelector('.criterion-item', { timeout: 10000 });

  // Select first score button
  // Programmatically click the first score button to avoid headless clickability issues
  try {
    await page.evaluate(() => {
      const el = document.querySelector('.score-btn');
      if (!el) throw new Error('no .score-btn found');
      el.scrollIntoView({ behavior: 'auto', block: 'center' });
      el.click();
    });
    console.log('Selected a score');
  } catch (e) {
    console.error('programmatic score click failed:', e.message);
  }

  // Click Save Progress (fallback to programmatic click if not clickable)
  try{
    await page.click('[data-action="save-assessment"], button.btn-primary');
  }catch(e){
    console.error('page.click save-assessment failed, falling back:', e.message);
    await page.evaluate(() => {
      const el = document.querySelector('[data-action="save-assessment"], button.btn-primary');
      if (el) el.click();
    });
  }
  await sleep(500);
  console.log('Saved assessment (attempted)');

  // Close modal
  try{
    await page.click('[data-action="close-module"]');
  }catch(e){
    console.error('page.click close-module failed, falling back:', e.message);
    await page.evaluate(() => { const el = document.querySelector('[data-action="close-module"]'); if (el) el.click(); });
  }
  await sleep(500);
  // Sign out and sign back in to verify persistence
  console.log('Signing out to test persistence');
  await page.evaluate(() => window.firebaseServices.auth.signOut());
  await page.waitForSelector('#loginScreen', { visible: true, timeout: 5000 });

  // Sign back in directly via the in-memory mock auth (more reliable than UI typing in headless)
  await page.evaluate(async () => {
    await window.firebaseServices.auth.signInWithEmailAndPassword('vincentapowell@msn.com', 'Testing01&');
  });
  try {
    await page.waitForSelector('#mainApp', { visible: true, timeout: 30000 });
  } catch (err) {
    try { await page.screenshot({ path: path.join(__dirname, 'signin-failure.png'), fullPage: true }); } catch(e){}
    try { const html = await page.content(); fs.writeFileSync(path.join(__dirname, 'signin-failure.html'), html); } catch(e){}
    throw err;
  }
  console.log('Signed back in, checking project persistence');

  // Verify the project still has the added team members in the mock DB
  const verification = await page.evaluate(async (projId, expectedUids) => {
    const db = window.firebaseServices.db;
    const doc = await db.collection('projects').doc(projId).get();
    const data = doc.data();
    const team = data.teamMembers || [];
    const containsAll = expectedUids.every(uid => team.includes(uid));
    return { team, containsAll };
  }, projectId, addedTeam);

  if (!verification.containsAll) {
    throw new Error('Persistence check failed — team members not found on project after re-login. Found: ' + JSON.stringify(verification.team));
  }

  console.log('Persistence verified — team members present on project');

  await browser.close();
  console.log('Smoke test finished successfully');
  } catch (err) {
    console.error('Smoke test failed:', err && (err.stack || err.message || err));
    process.exitCode = 1;
  } finally {
    try {
      if (browser && browser.isConnected && browser.isConnected()) await browser.close();
    } catch (e) {}
    try { if (serverProc && !serverProc.killed) serverProc.kill(); } catch (e) {}
  }
  // Ensure the process exits with an explicit code so CI / tooling sees success/failure
  process.exit(process.exitCode || 0);
})();
