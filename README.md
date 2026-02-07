# AI Diagnostics Platform

Short notes for developers and CI.

## Production URL and deployment

- Canonical production URL: `https://ceoaitransform.web.app`
- Canonical Firebase project: `ceoaitransform` (set in `.firebaserc`)
- Deployment command: `npm run deploy`
- Legacy App Hosting backend/domain (`*.hosted.app`) was removed on 2026-02-07. Do not use old bookmarked `hosted.app` URLs.

## Smoke tests (CI and local)

- **Purpose:** End-to-end Puppeteer smoke tests exercise sign-in, project creation, and a basic assessment flow to catch regressions.
- **CI:** The workflow is `.github/workflows/smoke-test.yml`. It runs on PRs and pushes to `main` and executes `npm ci` then `node tests/smoke.js`.
- **Requirements:** Node.js 18+, internet access for GitHub Actions runners. `puppeteer` ships Chromium in `devDependencies` so no extra browser install is required.
- **Run locally (recommended):** Start a local static server and then run the smoke script. Example (PowerShell):

```
npx http-server public -p 8082
$env:BASE_URL='http://127.0.0.1:8082'
node tests/smoke.js
```

- **Run locally (single command):** The smoke script can spawn its own server in some environments; to explicitly set the site under test, set `BASE_URL` and then run the test (PowerShell):

```
$env:BASE_URL='http://127.0.0.1:8082'
node tests/smoke.js
```

- **Artifacts:** On failure the tests save logs/screenshots under `tests/` (e.g. `tests/deploy-failure.png`, `tests/server.log`).
- **Secrets & Safety:** Do not commit `key.json` or other service-account secrets. The repo contains a local in-memory mock in `public/config.js` to allow safe local runs.

If you'd like, I can expand this with troubleshooting tips, CI artifact upload steps, or a small script that runs the server + test together.
