# Creating the remote GitHub repository

>This file contains commands to create the repository under the `oblongix` organization and push the local repo.

## Attempt with GitHub CLI (recommended)

If you have the GitHub CLI (`gh`) installed and authenticated, run:

```bash
# from project root
gh repo create oblongix/ai-diagnostics-platform --public --source=. --remote=origin --push
```

This will create the repo in the `oblongix` organization, add `origin`, and push the current branch.

## Manual via GitHub web UI

1. Go to https://github.com/organizations/oblongix/repositories/new
2. Enter repository name: `ai-diagnostics-platform`
3. Choose Public or Private as desired
4. Click **Create repository**
5. After creation, follow the instructions to push your local repo, e.g.:

```bash
git remote add origin https://github.com/oblongix/ai-diagnostics-platform.git
git branch -M main
git push -u origin main
```

## Notes
- If you need the repo to be private or require specific team permissions, configure those in the GitHub UI after creation.
- If you want me to attempt creation and push, ensure `gh` is installed and you're authenticated (run `gh auth login`).
