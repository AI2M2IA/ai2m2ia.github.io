# Code Review Architecture

This document describes the two-layer code review system used in this repository.

- **Layer 1 — Local pre-review** (free, runs on Apple Silicon via MLX).
- **Layer 2 — CI release-gate review** (paid, three independent AI reviewers).

The goal is to catch the cheapest findings cheapest: stylistic and obvious correctness issues locally on your Mac before pushing, then use a paid trio of independent AI reviewers only at the release boundary (`develop → main`).

## Table of contents

1. [Layer 1 — Local pre-review (MLX + Qwen2.5-Coder-14B)](#layer-1--local-pre-review)
2. [Layer 2 — CI release-gate review (Claude + Codex + Qwen)](#layer-2--ci-release-gate-review)
3. [Authentication and secrets](#authentication-and-secrets)
4. [Cost model](#cost-model)
5. [Escape valves if costs spike](#escape-valves-if-costs-spike)
6. [Accepted-risk findings (do not re-raise)](#accepted-risk-findings-do-not-re-raise)
7. [Troubleshooting](#troubleshooting)

---

## Layer 1 — Local pre-review

Run a Qwen2.5-Coder-14B model locally via [MLX](https://github.com/ml-explore/mlx) and Apple Silicon. Zero marginal cost, ~20 seconds per ~1 000-line diff on an M4 Pro 24 GB.

### One-time setup

```bash
# Create an isolated Python 3.13 venv for MLX
uv venv ~/mlx-env --python 3.13

# Install mlx-lm into it
uv pip install --python ~/mlx-env/bin/python mlx-lm

# Pre-fetch the model (~7.7 GB, takes a few minutes)
~/mlx-env/bin/mlx_lm.generate \
  --model mlx-community/Qwen2.5-Coder-14B-Instruct-4bit \
  --prompt "hello" --max-tokens 4
```

### Daily use

```bash
# Working tree vs HEAD
./scripts/local-review.sh

# Current branch vs develop
./scripts/local-review.sh develop

# Arbitrary range
./scripts/local-review.sh origin/main HEAD
```

### Performance on M4 Pro 24 GB (measured)

| Diff size | Prefill | Generation | Peak RAM |
|---|---|---|---|
| ~250 lines (3 250 tokens) | ~17 s @ 184 t/s | ~30 t/s | ~9.7 GB |
| ~1 000 lines (~13 k tokens) | ~70 s @ 184 t/s | ~30 t/s | ~10 GB |

### When to run

- Before opening a PR against `develop`.
- After resolving merge conflicts.
- Before requesting an explicit trio review via PR labels.

### Substituting models

Set `MLX_REVIEW_MODEL` to override:

```bash
MLX_REVIEW_MODEL=mlx-community/Qwen2.5-Coder-7B-Instruct-4bit ./scripts/local-review.sh
MLX_REVIEW_MODEL=mlx-community/Qwen2.5-Coder-32B-Instruct-4bit ./scripts/local-review.sh  # 24 GB Mac only, tight
```

Recommended sizes by machine:

| Machine | RAM | Recommended model |
|---|---|---|
| Mac Mini M4 Pro | 24 GB | Qwen2.5-Coder-14B-Instruct-4bit (default) |
| MacBook Air M5 | 16 GB | Qwen2.5-Coder-7B-Instruct-4bit |
| Lenovo Loq + RTX 2050 | 16 GB + 4 GB VRAM | Llama 3.2 3B via Ollama (CPU+RAM hybrid) |

---

## Layer 2 — CI release-gate review

Three independent reviewers run automatically only on PRs targeting `main`. They post separate comments so findings stay attributable. None are required status checks — they inform, they don't gate merge.

| Reviewer | Workflow | Action | Model | Auth |
|---|---|---|---|---|
| Claude | `.github/workflows/claude-review.yml` | `anthropics/claude-code-action@7f37f2e` | `claude-sonnet-4-6` | Claude Max OAuth |
| Codex | `.github/workflows/codex-review.yml` | `openai/codex-action@e0fdf01` (v1.8) | `gpt-5-codex` `effort: medium` | OpenAI API key |
| Qwen | `.github/workflows/qwen-review.yml` | `QwenLM/qwen-code-action@a08dc88` | `qwen3-coder-plus` | DashScope API key |

### Triggers

- **Auto**: `pull_request` events (`opened`, `synchronize`, `reopened`, `ready_for_review`) where `base.ref == 'main'`.
- **On-demand for Claude**: comment `@claude` on any PR — even feature → develop — to get a one-off Claude review.
- **On-demand for Codex/Qwen**: re-run the workflow from the Actions UI against the relevant PR.

### Hardening applied across all three

- All actions pinned by full commit SHA (no floating `@v1` refs).
- `permissions:` minimal at workflow level, refined per job. Codex uses a two-job privilege separation: read-only review job, separate write-token comment poster.
- `concurrency:` per-PR with `cancel-in-progress`.
- `timeout-minutes: 10`. Drafts skipped.
- `actions/checkout` with `persist-credentials: false`.
- **No prompt injection via PR metadata**: `pull_request.title` / `pull_request.body` are NOT interpolated into prompts. Codex prompt instructs the model to treat diff contents as untrusted input.

### Per-prompt focus (identical across reviewers)

Priorities, in strict order:

1. **OWASP Top 10 2021** — XSS, SSRF, injection, broken access control, secrets exposure, vulnerable components, supply chain.
2. **WCAG 2.1 AA** — semantic HTML, ARIA correctness, keyboard nav, focus management, colour contrast ≥ 4.5:1, alt text.
3. **Missing or weak test coverage** — unit and e2e gaps for changed logic.

Each prompt acknowledges the site is read-only, no auth, no PII so reviewers don't waste cycles flagging exploits that need a form or session to land. Each prompt respects [accepted-risk decisions](#accepted-risk-findings-do-not-re-raise).

---

## Authentication and secrets

### Required GitHub secrets

| Secret | Used by | How to generate |
|---|---|---|
| `CLAUDE_CODE_AUTH_TOKEN` | `claude-review.yml` | Run `claude setup-token` locally; copy stdout into the secret. **Note: org-wide naming differs from Anthropic's default `CLAUDE_CODE_OAUTH_TOKEN`.** |
| `OPENAI_API_KEY` | `codex-review.yml` | Generate at https://platform.openai.com/api-keys (separate billing from ChatGPT subscription). |
| `QWEN_API_KEY` | `qwen-review.yml` | Generate at https://dashscope.console.aliyun.com/apiKey. |

Until each secret exists, the corresponding workflow will fail loudly but will not block merges (none are required status checks). Secrets can be added incrementally.

### Why Claude uses OAuth, not an API key

The user has an active Claude Max 5X subscription. The Action supports a long-lived OAuth token (`claude_code_oauth_token` input) that draws from the subscription quota instead of generating a separate API bill.

- Token lifetime: ~1 year — regenerate annually with `claude setup-token`.
- Quota is shared with local Claude Code usage. Max 5X allows ~150–200 messages/day; release-gate runs (~4–8 PRs/month) won't approach that ceiling.
- If both `ANTHROPIC_API_KEY` and `CLAUDE_CODE_AUTH_TOKEN` secrets exist, the API key takes precedence. Leave `ANTHROPIC_API_KEY` unset to use the subscription.

---

## Cost model

Assumes 4–8 release-gate PRs per month, ~1 000-line diffs.

| Reviewer | Per PR | Monthly (4–8 PRs) |
|---|---|---|
| Claude | $0 (OAuth, subscription) | **$0** |
| Codex | $0.10–0.50 | $1–4 (~5–22 BRL) |
| Qwen | $0.03–0.07 | $0.10–0.50 (~1–3 BRL) |
| **Total CI APIs** | | **~6–25 BRL/month** |

Local Layer 1 reviews are free.

### Why these numbers are low

- Release-gate only (not every feature PR) reduces volume by ~25×.
- Claude OAuth eliminates Claude API charges entirely.
- Local pre-review catches obvious issues before the diff reaches CI.

---

## Escape valves if costs spike

In order of preference:

1. **Codex `effort: medium → low`** — ~50% reduction on Codex.
2. **Codex `gpt-5-codex → gpt-5-mini`** — ~80% reduction.
3. **Drop Codex entirely**, keep Claude + Qwen — saves ~5–22 BRL/month.
4. **Replace Codex with DeepSeek** — comparable cost to Qwen, different perspective.

Local Layer 1 has no API cost; it scales only with disk space and inference time.

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

First inference loads ~7.7 GB into unified memory. Subsequent inferences in the same process are faster but each `mlx_lm.generate` invocation is a fresh process. To keep the model resident, use the server mode:

```bash
~/mlx-env/bin/mlx_lm.server \
  --model mlx-community/Qwen2.5-Coder-14B-Instruct-4bit \
  --port 8080
```

Then send requests via OpenAI-compatible HTTP to `http://localhost:8080/v1/chat/completions`.

### A CI reviewer comments nothing

Check the workflow run logs in the Actions tab. Common causes:

- Missing secret (workflow fails before model invocation).
- Rate-limit / quota exhausted (only realistic for Claude OAuth at extreme volume).
- Model returned "no actionable findings" — the prompt instructs the reviewer to say so explicitly in that case.

### A reviewer flags something marked as accepted risk

Open a PR comment quoting this document. The reviewer prompts will be updated to include the new finding in the accepted-risk list. See [Accepted-risk findings](#accepted-risk-findings-do-not-re-raise).

### MLX install fails on Python 3.14

`mlx-lm` may not have wheels for Python 3.14 yet. Use Python 3.13 via `uv venv ~/mlx-env --python 3.13` — uv will download Python 3.13 automatically.

---

**Last updated:** 2026-06-02
**Maintained by:** AI(2)M(2)IA team
