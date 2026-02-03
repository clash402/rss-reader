#!/usr/bin/env bash
set -euo pipefail

REPO=""
REPO_PATH="."
MAIN_BRANCH="main"
BRANCH=""
LINT_CMD="npm run lint"
SKIP_LINT=0

usage() {
  cat >&2 <<'USAGE'
Usage: merge_pr_workflow.sh [options]
  --repo <owner/name>       GitHub repo slug (default: auto-detect)
  --path <repo-path>        Path to git repo (default: current directory)
  --branch <name>           Feature branch to merge (default: current branch)
  --main <name>             Main branch name (default: main)
  --lint-cmd <command>      Command to run before merging (default: npm run lint)
  --skip-lint               Skip running the lint command
  -h, --help                Show this help message
USAGE
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="$2"
      shift 2
      ;;
    --path)
      REPO_PATH="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --main)
      MAIN_BRANCH="$2"
      shift 2
      ;;
    --lint-cmd)
      LINT_CMD="$2"
      shift 2
      ;;
    --skip-lint)
      SKIP_LINT=1
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      ;;
  esac
done

cd "$REPO_PATH"

if [[ -z "$BRANCH" ]]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [[ -z "$BRANCH" || "$BRANCH" == "HEAD" ]]; then
    echo "Error: unable to determine current branch; pass --branch." >&2
    usage
  fi
  echo "No branch passed; defaulting to current branch: $BRANCH"
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required." >&2
  exit 1
fi

if [[ -z "$REPO" ]]; then
  REPO=$(gh repo view --json nameWithOwner --template '{{.nameWithOwner}}' 2>/dev/null || true)
fi

if [[ -z "$REPO" ]]; then
  ORIGIN_URL=$(git remote get-url origin 2>/dev/null || true)
  if [[ "$ORIGIN_URL" =~ github\.com[:/]([^/]+)/([^/]+?)(\.git)?$ ]]; then
    REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  fi
fi

if [[ -z "$REPO" ]]; then
  echo "Error: unable to determine GitHub repo; pass --repo owner/name." >&2
  exit 1
fi

echo "Using repo: $REPO"

if [[ -n "$(git status --porcelain)" ]]; then
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

if [[ "$SKIP_LINT" -eq 0 && -n "$LINT_CMD" ]]; then
  echo "Running lint command: $LINT_CMD"
  bash -lc "$LINT_CMD"
else
  echo "Skipping lint checks"
fi

echo "Merging PR via GitHub CLI..."
gh pr merge "$BRANCH" --merge --delete-branch --yes --repo "$REPO"

echo "Switching to $MAIN_BRANCH and pulling latest"
git checkout "$MAIN_BRANCH"
git pull --ff-only origin "$MAIN_BRANCH"

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
