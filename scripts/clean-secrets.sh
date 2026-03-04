#!/usr/bin/env bash
set -eux

# Backup current branch
git branch backup-before-secret-clean || true

# Rewrite history: replace stripe secret patterns and remove tracked .env across all commits
# This is irreversible for published history; collaborators will need to re-clone or reset.

git filter-branch --force --tree-filter "
  # replace stripe secret patterns inside files
  find . -type f -not -path './.git/*' -exec sed -i -E 's/sk_(test|live)_[A-Za-z0-9]*/sk_test_your_stripe_secret_key/g' {} \; || true
  # remove .env from the tree if present
  git rm --cached --ignore-unmatch .env || true
" --prune-empty --tag-name-filter cat -- --all

# Cleanup backup refs and garbage collect
rm -rf .git/refs/original/ || true
git reflog expire --expire=now --all || true
git gc --prune=now --aggressive || true

# Force-push cleaned history (this will overwrite remote history)
git push origin --force --all
git push origin --force --tags
