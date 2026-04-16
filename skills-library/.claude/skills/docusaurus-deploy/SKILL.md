---
name: docusaurus-deploy
description: Builds and deploys Docusaurus documentation site to GitHub Pages
triggers:
  - "deploy docusaurus to github pages"
  - "publish docs site"
  - "build and push docusaurus"
steps:
  1. Set GITHUB_TOKEN, GIT_USER, DEPLOYMENT_BRANCH env vars
  2. Run scripts/deploy.sh from project root
  3. Wait for GitHub Actions Pages build
  4. Verify docs at https://<org>.github.io/<repo>/
checklist:
  - [ ] docusaurus.config.js has correct url and baseUrl
  - [ ] GITHUB_TOKEN has repo write access
  - [ ] GIT_USER matches GitHub username/org
  - [ ] yarn build succeeds locally first
  - [ ] gh-pages branch created after first deploy
output: Docusaurus site live at GitHub Pages URL
---
