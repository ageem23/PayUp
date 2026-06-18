---
name: bmad-ship-story
description: 'Run a single story end-to-end: create it, implement it, open a PR to main, review it (local code-review + watch the PR for external feedback), and iterate implement↔review until the PR is clean and ready-to-merge. Use when the user says "ship a story", "ship the next story", "run the story pipeline", or "ship story <id>". Designed to be driven by /loop for the watch phase.'
---

# Ship Story Pipeline

**Goal:** Take one story from idea to a green, reviewed, ready-to-merge PR — fully autonomously where possible, incorporating external PR feedback where it exists.

**Your Role:** Delivery driver. You orchestrate the existing BMad skills (`bmad-create-story`, `bmad-dev-story`, `code-review`) plus GitHub, and you own the implement↔review loop until the PR has no open feedback and CI is green. You then STOP — you do not merge.

This skill is a **resumable state machine**. Every run detects the current state from `sprint-status.yaml`, git, and the PR, then advances as far as it can. It is safe to re-run; it never repeats a completed phase. The watch phase (Phase 5) is meant to be driven by `/loop` so external review feedback gets picked up on each tick.

## Conventions

- `{project-root}` is the repo working directory.
- `implementation_artifacts` = `{project-root}/_bmad-output/implementation-artifacts`
- `sprint_status` = `{implementation_artifacts}/sprint-status.yaml`
- `story_file` = `{implementation_artifacts}/{story_key}.md` (e.g. `1-3-supabase.md`)
- All GitHub operations use the `gh` CLI (project rule). Never guess CI/PR state — query it.
- Default base branch is `main`. Work happens on a non-`main` feature branch.

## Hard rules

- **NEVER merge the PR** and never push to `main` directly. Terminal state is "ready-to-merge".
- **NEVER commit secrets.** `.env.local` and `.env*.local` are gitignored — keep it that way; never `git add -f` them.
- **NEVER mark a story `done` on unverified work.** `done` requires: all story tasks checked, local `lint`+`build` clean, CI green on the PR head commit, and no unresolved actionable PR review comments.
- Only edit the story file in the permitted areas (Status, Tasks checkboxes, Dev Agent Record, File List, Change Log, frontmatter `baseline_commit`) — same contract as `bmad-dev-story`.
- Quote tool/CI/PR output rather than asserting success. If a step fails, surface it and stop; do not fake completion.

## Inputs

- Optional argument: a story identifier (`1.3`, `1-3`, `1-3-supabase`) or a story file path. If omitted, auto-discover the target (see Step 1).

## Workflow

### Step 0 — Preflight

1. Confirm `gh auth status` is authenticated and `git` is available. If `gh` is not authenticated, STOP and tell the user to run `gh auth login`.
2. Read `sprint_status` fully (top to bottom — order matters).
3. Determine the repo default branch: `git symbolic-ref refs/remotes/origin/HEAD` (fallback `main`).

### Step 1 — Resolve the target story

- **If an argument was given:** parse `epic_num`, `story_num`; resolve `story_key` by matching the `N-M-*` key in `sprint_status` (or use the provided file path).
- **If no argument:** pick the FIRST story key (top-to-bottom) in `development_status` whose status is **not** `done` and is not an `epic-*`/`*-retrospective` key. This is the target. (A story already `in-progress`/`review` is resumed; a `backlog`/`ready-for-dev` story is started.)
- If every story is `done`, report that the sprint is complete and STOP.
- Set `story_key`, `story_id` (`epic.story`), `story_file`.

### Step 2 — Branch setup

- If currently on `main`: create/checkout a feature branch. Prefer an existing epic branch matching the epic (e.g. `epic-{epic_num}`) if it exists and is ahead of `main`; otherwise create `feat/{story_key}` off `main`.
- If already on a non-`main` feature branch: use it (stories in an epic accumulate on the epic branch before any merge — do not branch per story off `main`, or later stories will miss earlier unmerged work).
- Record the branch as `work_branch`.

### Step 3 — Create the story (if needed)

- If `development_status[story_key]` is `backlog` (or the story file doesn't exist): invoke the **`bmad-create-story`** skill for this story. It writes the story file and flips status to `ready-for-dev`.
- If the story file already exists and status is `ready-for-dev` or later: skip creation.

### Step 4 — Implement the story (if needed)

- If status is `ready-for-dev` or `in-progress`: invoke the **`bmad-dev-story`** skill for this story. It implements all tasks, runs `lint`+`build`, fills the Dev Agent Record, and sets status to `review`.
- If status is already `review`/`done`: skip implementation (it's been built; we're here to review/ship).
- After `dev-story` returns, ensure the work is committed and pushed:
  - `git add -A` (respecting `.gitignore`), commit with a clear message ending in the `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` trailer, then `git push -u origin {work_branch}`.

### Step 5 — Open (or find) the PR to main

1. Check for an existing PR for this branch: `gh pr list --head {work_branch} --base {default_branch} --state open --json number,url`.
2. If none exists, create one: `gh pr create --base {default_branch} --head {work_branch} --title "{story_id}: {story title}" --body "<summary>"`. Build the body from the story's Story statement + Acceptance Criteria + a short "Verification" line (lint/build/CI). Include `Story: {story_key}`.
3. Record `pr_number` and `pr_url`. Report the PR URL to the user.

### Step 6 — Local review pass (once per new code state)

Run this whenever the PR head has code that hasn't yet had a local review (track via the head SHA you last reviewed; on first reach, always run it).

1. Determine the review range: `baseline_commit..HEAD` from the story frontmatter (falls back to `{default_branch}...HEAD` if absent).
2. Invoke the **`code-review`** skill scoped to that range with `--comment` so findings post as inline PR comments (audit trail), e.g. `code-review high --comment {pr_number}`. Use effort `high` by default.
3. For each CONFIRMED/PLAUSIBLE finding: implement the fix (or consciously reject it with a one-line reason in the story Dev Agent Record). Re-run `lint`+`build` to confirm clean.
4. Commit + push the fixes. Record the new head SHA as "locally reviewed".

### Step 7 — Verify CI on the PR head

1. Find the run for the current head SHA: `gh run list --branch {work_branch} --limit 5 --json databaseId,headSha,status,conclusion` (match `headSha`).
2. Watch it: `gh run watch {run_id} --exit-status`.
3. If CI fails: read `gh run view {run_id} --log-failed`, fix the cause, push, and return to this step. (3 consecutive CI failures on the same cause → STOP and ask the user.)

### Step 8 — CodeRabbit review loop (the loop tick)

This is the phase `/loop` re-enters: keep cycling implement→push→re-review until CodeRabbit (and any human reviewer) has no new actionable feedback. On each tick:

**8a. Read the latest review — from the review BODY, not just inline counts.**
- `gh pr view {pr_number} --json reviews` → take the **last** review by `coderabbitai`. CodeRabbit puts its findings in the **review body** as `Actionable comments posted: N`, with the per-finding detail inside the `🤖 Prompt for all review comments` block (file + line + what to change). It also posts inline threads: `gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --paginate` (filter `user.login=="coderabbitai"`).
- Also check the review's commit range (`…between <base> and <sha>`) — only trust a review whose `<sha>` matches the **current PR head**. A review for an older head is stale; wait for the re-review of your latest push.

**8b. Detect convergence (terminal signal).** CodeRabbit, when it finds nothing on a push, often posts **no new review at all** (no explicit approval). So "clean" = AND CI is green AND one of:
- the newest CodeRabbit review **whose reviewed head SHA matches the current PR head** says `Actionable comments posted: 0`; or
- **at least one full wake cadence has elapsed since your push with still no CodeRabbit review for the current head** — use the concrete cadences from "Driving with /loop" as the timeout (≈270s after a re-review push; ≈1200–1800s for a first review), not a vague "wait a bit". Until that timeout passes with no review, treat it as "review still pending", **not** converged — this avoids mistaking a slow/rate-limited review for a clean result.

When clean → go to Step 9.

**8c. Triage findings (don't apply blindly).** For each actionable finding, verify it against the current code (CodeRabbit's own prompt says "fix only still-valid issues, skip the rest with a brief reason"):
- **Fix** real correctness/security/accuracy issues with minimal changes. (In practice CodeRabbit Pro catches genuine bugs — e.g. fail-open auth paths — that a single local pass misses; take security findings seriously.)
- **Skip** low-value style nits that the repo doesn't enforce (e.g. markdownlint on internal `_bmad-output/` docs when no markdown linter runs) — but always with a one-line reason.

**8d. Apply, validate, push.** Implement the fixes, re-run `npm run lint` + `npm run build` (Step 7 gate), commit (clear message), and `git push`. The push is a `synchronize` event that **auto-triggers CodeRabbit's re-review** — you do not need to ask for one. (If you ever need to force it: comment `@coderabbitai full review`.)

**8e. Reply for the audit trail.** Post one PR comment addressed to `@coderabbitai` listing each finding as Fixed (with commit SHA) or Skipped (with reason). Then loop back to 8a for the next tick.

**Anti-churn guard:** cap at ~3–4 fix→re-review rounds. If a round surfaces only findings you've already consciously skipped (same nits recurring) and no new actionable ones, treat it as converged, note it, and go to Step 9. Never loop forever chasing subjective style.

### Step 9 — Ready-to-merge (terminal)

When CI is green and there is no open actionable feedback:

1. Mark the story `done`: set `Status: done` in the story file, add a Change Log entry summarizing review outcome, and set `development_status[{story_key}] = done` + `last_updated` in `sprint_status`. Commit + push these doc updates.
2. Report to the user: PR URL, review decision, CI status, and the explicit line: **"Ready to merge — leaving the merge to you."**
3. STOP. Do not merge.

## Driving with /loop

- **Watch phase:** to keep picking up external PR feedback, run this skill under `/loop` (dynamic mode): `/loop ship story {story_id}`. Each tick re-enters at the current state — early ticks fly through Steps 1–7 once; later ticks sit in Step 8 addressing feedback; the loop ends itself when Step 9 is reached (omit the next ScheduleWakeup).
- **Wake cadence:** CodeRabbit's **first** review on a PR can take a while (observed up to ~20+ min); its **re-reviews** after a push are usually faster (1–5 min). So: after opening a PR, a ~1200–1800s heartbeat is right; right after pushing a fix, a shorter ~270s re-check (cache-warm) catches the re-review sooner. Don't long-foreground-poll — re-check on wakeup ticks.
- **Standalone (no loop):** the skill still runs Steps 0–7 to completion and does ONE Step 8 check. If CodeRabbit hasn't posted yet, it reports "PR open and green; awaiting CodeRabbit" and tells the user to run it under `/loop` to keep cycling the review loop.

## Project learnings baked in (PayUp)

- **No Python** in this environment — if any sub-skill tells you to run a `.py` resolver, resolve its customization manually instead (read base→team→user TOML and merge); don't block on Python.
- **"Tested" = `npm run lint` + `npm run build` clean.** No unit-test framework is installed and none should be added (dependency-light). CI runs exactly these two.
- **Story status flow:** `backlog → ready-for-dev → in-progress → review → done`. The `baseline_commit` frontmatter (added by `dev-story`) defines the review diff range.
- **`gh` is available and is the required tool** for all GitHub operations on this repo.
- **CodeRabbit (PR reviewer) specifics:** configured via `.coderabbit.yaml` (auto-reviews PRs to `main`). It gives full **Pro line-by-line** reviews free on **public** repos, but **the plan tier is bound at PR-open time** — a PR opened while the repo was private stays on the limited "Free" tier (summary only) for its life, even after the repo goes public. Fix: ensure the repo is public, then **open a fresh PR** (close/reopen) so the new PR gets Pro. Findings arrive in the **review body** (`Actionable comments posted: N`), not always as inline threads.
- **Benign noise to ignore:** Git's `LF will be replaced by CRLF` warnings, and the CI annotation that `actions/checkout@v4`/`setup-node@v4` use the runner's deprecated Node 20 runtime (unrelated to our app's `node-version`).
- **`_bmad-output/` is committed** (tracked artifacts); `.claude/`, `.agents/`, `_bmad/`, `node_modules/`, `.next/`, and `.env*.local` are gitignored.
