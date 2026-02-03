#!/usr/bin/env bash
set -euo pipefail

REPO="clash402/rss-reader"
BRANCH="${1-}"

usage() {
  echo "Usage: $0 [feature-branch]" >&2
  exit 1
}

if [[ -z "$BRANCH" ]]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [[ -z "$BRANCH" || "$BRANCH" == "HEAD" ]]; then
    echo "Error: unable to determine current branch; please pass the branch name explicitly." >&2
    usage
  fi
  echo "No branch argument provided; defaulting to current branch: $BRANCH"
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required." >&2
  exit 1
fi

if [[ -n $(git status --porcelain) ]]; then
  echo "Error: working tree has unstaged changes. Commit or stash them first." >&2
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo "Checking out branch $BRANCH"
  git checkout "$BRANCH"
fi

echo "Fetching latest changes..."
git fetch origin

echo "Fast-forwarding $BRANCH"
git pull --ff-only origin "$BRANCH"

echo "Running lint checks..."
npm run lint

echo "Merging PR via GitHub CLI..."
gh pr merge "$BRANCH" --merge --delete-branch --yes --repo "$REPO"

echo "Switching to main and pulling latest"
git checkout main
git pull --ff-only origin main

echo "Deleting local branch $BRANCH"
git branch -d "$BRANCH" || true

echo "Cleaning up remote refs"
git remote prune origin >/dev/null 2>&1 || true

echo "Final status:"
git status -sb

echo "PR status:"
gh pr view "$BRANCH" --repo "$REPO" || true

echo "Last commit:"
git log -1 --oneline

echo "Merge workflow complete."
