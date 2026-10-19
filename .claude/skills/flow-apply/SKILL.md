---
name: flow-apply
description: "Apply a feature pack to the app — land its shipped code fast, reconcile it into what already exists, and verify with the pack's tests. Trusts the pack; surfaces only genuine conflicts. Standalone; does not touch .flow/ state."
disable-model-invocation: true
---
# Apply a Feature Pack

## Session setup

Resolve the harness root once at session start:

1. Open `AGENTS.md` or `CLAUDE.md` in the project root.
2. Find the `[AdonisJS Harness Docs Index]` block. Read the `root:` field.
3. Compute the absolute path: `<absolute project root> + <root field>`. Use it for every harness doc read.

If the block is missing, stop and tell the user the harness is not installed.

Parse `$ARGUMENTS` as literal tokens. First positional = `<pack>` (optional). If it is omitted or names no file under `<harness>/feature-packs/`:

1. List the docs in `<harness>/feature-packs/`. Each is a pack; its `## Contents` line is its description.
2. If non-empty: show the packs with their descriptions and ask which to apply. Wait.
3. If empty: stop and tell the user no feature packs are installed.

Read `<harness>/feature-packs/<pack>.md` in full once resolved. Echo `Applying pack=<pack>`.

## Role

You apply one feature pack — a whole capability shipped as working code — into the app, fast. The pack's Fixed code is complete and correct; your job is to land it, reconcile it into what the app already has, and verify. Apply first, trust the pack, and interrupt the user only for a genuine conflict.

Apply is standalone. It reads no brief, blueprint, or assert, and writes no `.flow/` state — the code it lands is owned like any hand-written code. You write application code and run the app's own commands. You do not commit, push, open PRs, or archive.

## Core discipline

Stated once. Phases reference by name, do not restate.

- **Trust the pack; do not re-plan it.** Fixed elements ship complete, working code — write it as given, scaffold with the element's `make:*`. Do not read a harness doc to re-derive conventions the code already encodes; a referenced `<harness>/` doc is a fallback for a genuinely unclear command or edit, not required reading. Docs missing for packages the pack itself installs are expected — ignore them.
- **Apply as you go; do not plan.** Walk the desired shape in order and apply each element in place. No upfront discovery sweep, no reconciliation map, no analysis written out before building.
- **Discover per element, right before you touch it.** Read only the file an element edits — to merge additively — or, for a screen, the design system. Never sweep the codebase or read files an element does not touch.
- **Divergence is not a conflict.** The pack's Fixed code is the target. When the app's version is a starter default, a subset the pack supersedes, or an additive merge, apply or merge it silently — no decision needed. A conflict is only when applying would destroy genuine app-specific behavior the pack does not carry. Surface that inline, at the element, via APPLY CONFLICT.
- **Codegen output is derived, not a pack element.** Files changed under `.adonisjs/` by `node ace codegen` do not enter per-element reconciliation and never trigger APPLY CONFLICT. Never edit them by hand; include them in the success report with the other modified files.
- **The UI is where you invest.** Backend Fixed code is shipped and correct — land it fast. The Adaptive screens are the pack's real value over a CLI, so slow down and get them polished. Each ships as a bare template — the functional source of truth; your job is to upgrade it to the app's design system by swapping its bare elements for the app's own components and layouts, not by hand-rolling markup and spacing — the app's polish lives in those components, and hand-picked margins are the smell. Preserve the screen's contract (field `name`s, labels and button text, `route`/`routeParams`, error logic); restyle everything else. Phase 2 carries the per-screen rhythm.
- **Verify at the end; investigate only failures.** The pack's tests are the check. Do not investigate app behavior pre-emptively — dig into how something works only when a test goes red.
- **Escalate on genuine uncertainty.** When applying is ambiguous in a way that is not a clean conflict, ask. Out of scope: committing, pushing, opening PRs, writing `.flow/`.

## Phases

The order is fixed; the mechanics inside each are yours. Surface progress as session todos.

### Phase 1 — Depends on

If the pack declares `## Depends on`, run the check instructions it lists — each points at a concrete symbol, route, or config a base pack establishes (a model composes a mixin, a route resolves, a config export exists).

> **STOP if** any check fails. Tell the user to apply that base pack first, in a fresh session; do nothing else. Do not scaffold the dependency yourself.

### Phase 2 — Apply

First establish the pack's `## Foundation` when it declares one: for each substrate item, reuse it if the app already has it, or build it with the section's reasoning if absent. The desired shape builds on it. Skip when the pack has no `Foundation`.

Then walk `## Desired shape` in order. Per element:

- Read the file it touches, only if it exists.
- **Absent** → write it; scaffold with the element's `make:*` command. Before `make:migration`, confirm no existing migration already defines that table or column, and skip the scaffold when one does.
- **Present and superseded, a subset, or an additive merge** → apply or merge silently. Preserve app behavior the pack does not touch.
- **Present with app-specific behavior the pack's version would drop** → APPLY CONFLICT.
- **Adaptive screen** — the pack ships a bare template (the functional source of truth); upgrading it to the app's design system is yours to get right:
  1. Read the app's closest existing screens (its own auth pages, account pages) and `<harness>/design-system.md`. Take the pack's bare template and upgrade it: swap its bare `<input>`, `<button>`, and layout for the app's own components and layouts. Preserve the screen's contract — field `name`s, labels and button text, the `Form` `route`/`routeParams`, and the `{ errors }` render logic; restyle everything else.
  2. Show the exact code you will write — the upgraded template, not prose — and get a quick approval. A screen the app already has that meets the pack's contract needs no proposal.
  3. Write it, then screenshot it, compare against the app's other screens (alignment, spacing, hierarchy, responsive), and fix before advancing.

Run each element's embedded command. After the walk, run the gate:

1. Codegen — `node ace codegen`.
2. Format — `npm run format` from the app's `package.json` scripts; skip with a note if absent.
3. Lint — `npm run lint` from the app's `package.json` scripts; skip with a note if absent.
4. Typecheck — `npm run typecheck` from the app's `package.json` scripts.

Codegen, lint, and typecheck are hard gates — a failure escalates via APPLY PAUSED. Format is a mutation, never gated. If `typecheck` is absent, ask how to run it.

### Phase 3 — Verify

Run the pack's tests (its `## Tests` section) as the gate — read `<harness>/testing.md` for the run command (`node ace test <suite>`). Investigate and fix only red tests, bounded to 3 attempts, then APPLY PAUSED. After a fix changes application code, rerun the Phase 2 gate before retrying the tests. Once green, boot the app and drive the pack's routes per its `## Walkthrough` section, sharing a screenshot of each step.

### Phase 4 — Frontend hand-off

Only when the pack declares `## Frontend brief`. This skill does not build the client — the api stack has no frontend half; the brief is a hand-off prompt for a frontend agent. Present it to the user as the next step: the `Common` part plus the variant matching the guard the pack had you discover in `Foundation` (`tokens` or `session`) when it forks, or the whole brief when it does not. Do not apply it as code or write client files.

## APPLY CONFLICT

Applying an element would destroy app-specific behavior the pack's version does not carry. Stop and ask, at the element:

```
APPLY CONFLICT at <element> / <path>

App-specific behavior at risk:
  <one line — what the app does that the pack's version drops>

Options:
  1. Replace — take the pack's version, drop the app's behavior
  2. Keep — leave the app's version, skip this element
  3. Merge — I fold the pack's change into the app's behavior; you confirm how

Pick 1, 2, or 3.
```

A starter default, a subset the pack supersedes, or an additive merge is **not** a conflict — apply it without asking. Wait for the user; do not auto-resolve a real conflict.

## APPLY PAUSED

When a gate fails or verification cannot be made green within its retry budget, stop and report:

```
APPLY PAUSED at <phase> / <element>

What failed:
  <one-line summary>

Last output (tail):
  <last lines of runner output>

Files touched this step:
  - <path>

What I need from you:
  <one specific question or decision>
```

Wait for the user. Do not retry silently. Do not revert or delete to make the failure go away.

## Session todos

Surface progress via the agent's task tool. Give each todo a title carrying a `Phase <N>: <scope>` prefix and a one-line description of the phase — some task tools require both a subject and a description. Create tasks as `pending`; move one to `in_progress` by updating it as you enter its phase (never more than one, never a status set at creation). Drop Phase 1 when the pack has no `Depends on`, and Phase 4 when it has no `Frontend brief`. Example floor:

```
Phase 1: depends on
Phase 2: apply <pack>
Phase 3: verify + walkthrough
Phase 4: frontend hand-off
```

## File mutation rules

- Pack doc and harness docs — read-only.
- Application code — written and edited per the desired shape.
- `.adonisjs/` — written only by codegen; never edited by hand.
- `.flow/` — never touched.

## Success report

When verification passes, report:

- Pack applied + stack.
- Files created / modified.
- Codegen + lint + typecheck status; test result.
- The walkthrough screenshots shared.
- The `Frontend brief` handed off, when the pack carries one.
