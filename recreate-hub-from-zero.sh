#!/usr/bin/env bash
#
# recreate-hub-from-zero.sh
#
# Squash-recreates this repository as a single fresh commit under the
# pseudonymous identity AI(2)M(2)IA. This purges the old history, which
# contains 22 commits with the leaked committer email
# positiv@Positivs-Mac-mini.local.
#
# This script NEVER touches GitHub. It only operates on the local clone.
# Run it manually from the repository root:
#
#     bash recreate-hub-from-zero.sh
#
# Order of operations:
#   1. Safety gate: refuse to run if the working tree is dirty or if any
#      local branch is not merged into main.
#   2. Archive the entire current .git to ~/hub-git-archive-YYYYMMDD.tar.gz.
#   3. Move .git aside to .git-old-<epoch> (rename only — never delete).
#   4. git init -b main, set the pseudonymous local identity.
#   5. Identity double check: print both values, require typing YES.
#   6. Single commit of the full tree; create develop at main.
#   7. Print manual follow-up instructions for GitHub.

set -euo pipefail

PSEUDONYM_NAME="AI(2)M(2)IA"
PSEUDONYM_EMAIL="AI2M2IA@users.noreply.github.com"

cd "$(dirname "$0")"

if [ ! -d .git ]; then
  echo "ERROR: no .git directory found here. Run this script from the repository root." >&2
  exit 1
fi

echo "==> Step 1/7: Safety checks"

# Remove a stale index.lock left behind by a crashed/sandboxed process,
# but only if no git process is actually running.
if [ -f .git/index.lock ]; then
  if pgrep -x git >/dev/null 2>&1; then
    echo "ERROR: .git/index.lock exists and a git process is running. Wait for it to finish." >&2
    exit 1
  fi
  echo "    Found stale .git/index.lock (no git process running) — removing it."
  rm -f .git/index.lock
fi

# 1a. Working tree must be clean (tracked and untracked).
if [ -n "$(git status --porcelain)" ]; then
  echo "" >&2
  echo "ERROR: the working tree is not clean. Commit, stash, or move this work first:" >&2
  echo "" >&2
  git status --short >&2
  echo "" >&2
  echo "Nothing was changed. Aborting." >&2
  exit 1
fi

# 1b. Every local branch must be merged into main.
UNMERGED="$(git branch --no-merged main | sed 's/^[* ] //' || true)"
if [ -n "$UNMERGED" ]; then
  echo "" >&2
  echo "ERROR: the following local branches are NOT merged into main." >&2
  echo "Their commits would be lost if you proceed. Merge them into main" >&2
  echo "(or confirm with their owners that they can be discarded), then re-run:" >&2
  echo "" >&2
  for b in $UNMERGED; do
    echo "  - $b  ($(git rev-list --count main.."$b") commit(s) not in main)" >&2
  done
  echo "" >&2
  echo "Nothing was changed. Aborting." >&2
  exit 1
fi

# 1c. main must be checked out so the surviving tree is main's tree.
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "ERROR: current branch is '$CURRENT_BRANCH', not 'main'." >&2
  echo "Check out main first (git checkout main) so the new single commit" >&2
  echo "captures main's tree. Nothing was changed. Aborting." >&2
  exit 1
fi

echo "    OK: clean tree, all local branches merged into main, main checked out."

echo "==> Step 2/7: Archiving current .git"
ARCHIVE="$HOME/hub-git-archive-$(date +%Y%m%d).tar.gz"
if [ -e "$ARCHIVE" ]; then
  ARCHIVE="$HOME/hub-git-archive-$(date +%Y%m%d-%H%M%S).tar.gz"
fi
tar -czf "$ARCHIVE" .git
echo "    Archived full .git to: $ARCHIVE"

echo "==> Step 3/7: Moving .git aside (rename, never delete)"
OLD_GIT=".git-old-$(date +%s)"
mv .git "$OLD_GIT"
echo "    Old .git is now: $OLD_GIT"
echo "    (Deletion is blocked on this volume; trash it manually later if you want.)"

echo "==> Step 4/7: Initializing fresh repository"
git init -b main
git config user.name "$PSEUDONYM_NAME"
git config user.email "$PSEUDONYM_EMAIL"

echo "==> Step 5/7: Identity double check (mandatory policy)"
echo ""
echo "    user.name  = $(git config user.name)"
echo "    user.email = $(git config user.email)"
echo ""
echo "These values will be baked into the public commit. They must be the"
echo "pseudonym and NOTHING else."
printf 'Type YES (uppercase) to continue, anything else to abort: '
read -r CONFIRM
if [ "$CONFIRM" != "YES" ]; then
  echo "" >&2
  echo "Aborted by user. The fresh repo was initialized but no commit was made." >&2
  echo "Your old history is safe in $OLD_GIT and in $ARCHIVE." >&2
  exit 1
fi

echo "==> Step 6/7: Creating the single fresh commit"
git add -A
git commit -m "AI(2)M(2)IA hub — public release"
git branch develop main
echo "    Created branch 'develop' at main."
echo ""
git log --format='    %h  %an <%ae>  %s' -1

echo "==> Step 7/7: Done locally. Manual follow-up on GitHub:"
cat <<'EOF'

  1. On GitHub, DELETE the repository ai2m2ia.github.io
     (Settings -> Danger Zone -> Delete this repository).
  2. Recreate it PUBLIC with the exact same name: ai2m2ia.github.io
     (do NOT initialize it with a README, license, or .gitignore).
  3. Back here, connect and push:
       git remote add origin git@github.com:AI2M2IA/ai2m2ia.github.io.git
       git push origin main develop
  4. Re-check GitHub Pages settings (Settings -> Pages): source branch
     should be main, root folder, and the site should rebuild.
  5. Once you have verified the new repo and the live site, you may trash
     the .git-old-* directory manually. Keep the archive in your home
     directory until you are fully confident.

This script did NOT touch GitHub. All remote steps above are yours to run.
EOF
