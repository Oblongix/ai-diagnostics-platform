Rotate Service Account Key

The repository contained a committed Firebase service account key (`key.json`) which has been removed from the working tree.

Immediate steps you should take now:

1. In the Google Cloud Console, go to IAM & Admin → Service Accounts → select the service account used by this project.
2. Remove the exposed key(s). Revoke/delete the key that was committed.
3. Create a new key only if needed. Prefer short-lived credentials or workload identity federation instead of long-lived keys.
4. Restrict the service account's IAM permissions to the minimum required (principle of least privilege).
5. Update any CI/CD or deployment systems to load the new key from a secure secret store (GitHub Secrets, Azure Key Vault, Google Secret Manager, etc.), not from source control.
6. If you used the key for production deployments, review audit logs for suspicious activity and rotate any other credentials that may have been exposed.

Helpful links:

- https://cloud.google.com/iam/docs/creating-managing-service-account-keys
- https://cloud.google.com/iam/docs/understanding-service-accounts
- https://cloud.google.com/iam/docs/impersonating-service-accounts

If you want, I can also:

- generate a .env.example and a short `DEPLOYMENT_GUIDE.md` showing how to inject `window.__FIREBASE_CONFIG__` at deploy time,
- or create a script to redact other potential secret files in the repo.
