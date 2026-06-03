# Code Review Architecture

This document describes the two-layer code review system used in this repository.

- **Layer 1 — Local pre-review** (free, runs on Apple Silicon via MLX).
- **Layer 2 — CI release-gate review** (two AI reviewers in this repo, at least one must pass; Codex Cloud runs separately through the integrated Codex account).

The goal is to catch the cheapest findings cheapest: stylistic and obvious correctness issues locally on your Mac before pushing, then a paid trio of independent AI reviewers at the release boundary (`develop → main`).

## Table of contents

1. [Layer 1 — Local pre-review (MLX + Qwen2.5-Coder-14B)](#layer-1--local-pre-review)
2. [Layer 2 — CI release-gate review (Claude + Qwen, with Codex Cloud)](#layer-2--ci-release-gate-review)
3. [The at-least-one-passes gate](#the-at-least-one-passes-gate)
4. [Authentication and secrets](#authentication-and-secrets)
5. [Cost reference](#cost-reference)
6. [Accepted-risk findings (do not re-raise)](#accepted-risk-findings-do-not-re-raise)
7. [Troubleshooting](#troubleshooting)

---

## Layer 1 — Local pre-review

Run a Qwen2.5-Coder-14B model locally via [MLX](https://github.com/ml-explore/mlx) on Apple Silicon. No marginal cost. About 20 seconds per ~1,000-line diff on a Mac with sufficient unified memory.

### One-time setup

```bash
# Create an isolated Python 3.13 venv for MLX.
uv venv ~/mlx-env --python 3.13

# Install mlx-lm into it.
uv pip install --python ~/mlx-env/bin/python mlx-lm

# Pre-fetch the model (~7.7 GB, takes a few minutes).
~/mlx-env/bin/mlx_lm.generate \
  --model mlx-community/Qwen2.5-Coder-14B-Instruct-4bit \
  --prompt "hello" --max-tokens 4
```

### Daily use

```bash
./scripts/local-review.sh                   # working tree vs HEAD
./scripts/local-review.sh develop           # current branch vs develop
./scripts/local-review.sh origin/main HEAD  # arbitrary range
```

### Measured performance (Apple Silicon, 24 GB unified-memory tier)

| Diff size | Prefill | Generation | Peak RAM |
|---|---|---|---|
| ~250 lines (~3,250 tokens) | ~17 s @ 184 tok/s | ~30 tok/s | ~9.7 GB |
| ~1,000 lines (~13k tokens) | ~70 s @ 184 tok/s | ~30 tok/s | ~10 GB |

### Recommended model by hardware tier

| Hardware tier | Recommended model |
|---|---|
| Mac-compatible, ≥ 24 GB unified memory | `Qwen2.5-Coder-14B-Instruct-4bit` (default) |
| Mac-compatible, ~16 GB unified memory | `Qwen2.5-Coder-7B-Instruct-4bit` |
| Linux-compatible with a small/mid NVIDIA GPU | `Llama 3.2 3B` via Ollama (CPU + RAM hybrid) |

Override the default with `MLX_REVIEW_MODEL`.

### When to run

- Before opening a PR against `develop`.
- After resolving merge conflicts.
- Before opening or updating a release-gate PR.

---

## Layer 2 — CI release-gate review

Two reviewers run automatically in parallel on PRs targeting `main`. An aggregator job at the end is the required status check; it passes as long as at least one reviewer succeeded (see [the gate](#the-at-least-one-passes-gate)).

Workflow file: `.github/workflows/release-gate-review.yml`.

| Reviewer | Action (SHA-pinned) | Model | Auth |
|---|---|---|---|
| Claude | `anthropics/claude-code-action@7f37f2e` | `claude-sonnet-4-6` | Claude Max OAuth (`CLAUDE_CODE_AUTH_TOKEN`) |
| Qwen | `QwenLM/qwen-code-action@a08dc88` | `qwen3-coder-plus` (DashScope endpoint) | DashScope API key (`QWEN_API_KEY`) |

A separate workflow `claude-mention.yml` lets a maintainer invoke a one-off Claude review on any PR — including `feature → develop` PRs — by writing `@claude` in a comment or review comment. That workflow does **not** participate in the merge gate.

### Codex — configured outside this repo

Codex reviews are not in this workflow. The user's account is already integrated with Codex, so OpenAI's native Codex Cloud GitHub integration can post an independent third review comment without an `OPENAI_API_KEY` secret in this repository. This avoids duplicate Codex reviews and keeps the release-gate workflow limited to Claude + Qwen.

### Triggers

- **Auto**: `pull_request` events (`opened`, `synchronize`, `reopened`, `ready_for_review`) where `base.ref == 'main'` and the PR is not a draft.
- **On-demand (Claude only)**: write `@claude` in any PR comment. Handled by `claude-mention.yml`.
- **On-demand (Codex / Qwen)**: re-run the workflow from the Actions UI against the relevant PR.

### Hardening applied to the in-repo workflows

- Every action pinned by full commit SHA. No floating `@v1` refs.
- `permissions:` minimal at workflow level, refined per job.
- `concurrency:` per-PR with `cancel-in-progress`.
- `timeout-minutes: 10`. Drafts skipped.
- `actions/checkout` with `persist-credentials: false`.
- **No prompt injection from PR metadata**: `pull_request.title` and `pull_request.body` are NOT interpolated into prompts. The Codex prompt also instructs the model to treat diff contents as untrusted input.

### Per-prompt focus (identical across reviewers)

Priorities, in strict order:

1. **OWASP Top 10 2021** — XSS, SSRF, injection, broken access control, secrets exposure, vulnerable components, supply chain.
2. **WCAG 2.1 AA** — semantic HTML, ARIA correctness, keyboard navigation, focus management, color contrast ≥ 4.5:1, alt text.
3. **Missing or weak test coverage** — unit and end-to-end gaps for changed logic.

Each prompt acknowledges that the site is read-only, has no auth, and stores no PII, so reviewers don't waste cycles flagging exploits that need a form or session to land. Each prompt respects the [accepted-risk decisions](#accepted-risk-findings-do-not-re-raise).

---

## The at-least-one-passes gate

The merge rule for `develop → main` is **at least one of the two AI reviewers in this workflow must complete its job successfully**. Failure of one reviewer does not block the merge; failure of both does.

(Codex Cloud comments do not participate in the gate. They are an independent review channel that posts comments for human consideration.)

The aggregator job `AI review gate` is the only required status check on `main`. Implementation:

```yaml
ai-review-gate:
  needs: [claude, qwen]
  if: always() && ... # release-gate condition
  steps:
    - run: |
        if [ "$CLAUDE_RESULT" = success ] || [ "$QWEN_RESULT" = success ]; then
          exit 0
        fi
        exit 1
```

**"Pass" means the workflow job ran successfully** — that is, the action invoked the model and produced a result. It does NOT mean the AI approved the diff. AI comments are advisory; humans still resolve them in the PR thread.

This rule gives the project resilience:

- If DashScope is rate-limiting → Qwen fails → Claude carries the gate.
- If Anthropic has an outage → Claude fails → Qwen carries the gate.
- If a secret has not yet been created in a forked repo → the corresponding reviewer fails → the other carries the gate.

---

## Authentication and secrets

### Required GitHub secrets

| Secret | Used by | How to generate |
|---|---|---|
| `CLAUDE_CODE_AUTH_TOKEN` | Claude reviewer | Run `claude setup-token` locally; copy stdout into the secret. **The name diverges from Anthropic's default `CLAUDE_CODE_OAUTH_TOKEN` for cross-repo consistency in this organization.** |
| `QWEN_API_KEY` | Qwen reviewer | Generate at https://dashscope.console.aliyun.com/apiKey. |

Until each secret exists, the corresponding reviewer fails. The other reviewer still runs, and the aggregator passes as long as it succeeds.

### Why Claude uses an OAuth token, not an API key

The maintainer has an active Claude Max subscription. The Action supports a long-lived OAuth token (`claude_code_oauth_token` input) that draws from the subscription quota.

- Token lifetime: ~1 year. Regenerate annually with `claude setup-token`.
- Quota is shared with local Claude Code usage. The Max plan provides enough headroom that release-gate runs do not approach the ceiling.
- If both `ANTHROPIC_API_KEY` and `CLAUDE_CODE_AUTH_TOKEN` are set, the API key takes precedence. Leave `ANTHROPIC_API_KEY` unset to use the subscription.

### Required GitHub App for the OAuth path

In addition to the secret, the **Claude Code GitHub App** must be installed on the repository (or on the whole org, scoped to this repo). Without it, the action obtains an OIDC token from GitHub Actions but cannot exchange it for an Anthropic app token, and the run fails with:

```
App token exchange failed: 401 Unauthorized — Claude Code is not installed on this repository.
Please install the Claude Code GitHub App at https://github.com/apps/claude
```

One-time install:

1. Open https://github.com/apps/claude
2. Click **Install** (or **Configure** if it is already installed somewhere).
3. Pick the organization that owns this repository.
4. Choose **Only select repositories** and select this repository (or every repo that runs the action).
5. Save.

The app requests read on code, metadata, pull requests, and issues, and write on pull requests and issues so it can post comments. It does not need write on code or actions.

---

## Cost reference

Estimates assume 4–8 release-gate PRs per month and ~1,000-line diffs. Rounded up.

| Reviewer | Per PR | Monthly (4–8 PRs) |
|---|---|---|
| Claude | $0 (OAuth, Claude Max subscription) | $0 |
| Codex | $0 (integrated Codex account) | $0 |
| Qwen | up to $0.10 | up to $1 |
| **Total CI APIs in this repo** | | **up to $1 / month** |

Local Layer 1 reviews are free. The user's stated stance is to lean on existing subscriptions and integrations rather than optimize for the small recurring API spend; Qwen is kept on its API only because there is no equivalent subscription path.

---

## Accepted-risk findings (do not re-raise)

GitHub Pages cannot set custom HTTP response headers, so a handful of OWASP findings are documented as accepted risks. AI reviewers should not flag them.

| Finding | Why accepted | Doc |
|---|---|---|
| Missing `X-Content-Type-Options: nosniff` | Strict CSP `script-src 'self'` is a stronger mitigation than MIME sniffing prevention; no user-uploaded content. | `AGENTS.md §13` |
| Missing `frame-ancestors` / `X-Frame-Options` (clickjacking) | Site is read-only with no forms, auth, or state-changing actions. `frame-ancestors` cannot be set in `<meta>` (browser spec) and GitHub Pages cannot send the header. | `docs/clickjacking-accepted-risk` branch (pending merge) |

Both will be revisited if the project ever adds authentication, forms, state-changing actions, or user-uploaded content.

---

## Troubleshooting

### Local review fails with "no such file"

The `~/mlx-env` venv was created in the wrong place. Recreate it from the home directory:

```bash
cd ~ && uv venv ~/mlx-env --python 3.13
uv pip install --python ~/mlx-env/bin/python mlx-lm
```

### Local review is slow on first run

First inference loads ~7.7 GB into unified memory. Subsequent inferences in the same process are faster, but each `mlx_lm.generate` invocation is a fresh process. To keep the model resident, use the server mode:

```bash
~/mlx-env/bin/mlx_lm.server \
  --model mlx-community/Qwen2.5-Coder-14B-Instruct-4bit \
  --port 8080
```

Then send requests via OpenAI-compatible HTTP to `http://localhost:8080/v1/chat/completions`.

### One CI reviewer never comments

Check the workflow run logs in the Actions tab. Common causes:

- Missing or wrong secret name — the workflow fails before the model is invoked.
- For Claude specifically, `401 Unauthorized — Claude Code is not installed on this repository` means the [Claude Code GitHub App](#required-github-app-for-the-oauth-path) is not installed on this repo. Install it and re-run the failed job.
- Rate-limit or quota exhausted — uncommon at release-gate volume.
- The model returned "no actionable findings" — the prompt instructs the reviewer to say so explicitly in that case.

If one reviewer chronically fails and the other carries the gate, decide whether to keep paying for the failing one — see [the gate logic](#the-at-least-one-passes-gate).

### A reviewer flags something marked as accepted risk

Open a PR comment quoting this document. The reviewer prompts will be updated to include the new finding in the accepted-risk list. See [Accepted-risk findings](#accepted-risk-findings-do-not-re-raise).

### MLX install fails on Python 3.14

`mlx-lm` may not have wheels for Python 3.14 yet. Use Python 3.13 via `uv venv ~/mlx-env --python 3.13` — `uv` will download Python 3.13 automatically.

---

**Last updated:** 2026-06-02
**Maintained by:** AI(2)M(2)IA team
