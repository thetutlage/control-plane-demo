---
name: flow-review-response-design
description: "Review a code change for response design defects, such as props that break a rule of the response-design skill, a value formatted in a component, or a value that several pages pass where one shared prop fits. Use as one lens in a review run."
user-invocable: false
---
# Review lens: Response design — Inertia React

## Scope

- **Rules** Whether a changed response breaks a rule of `/flow-response-design`, or of a harness doc that it points to.
- **Repetition** Whether changed pages pass a value that other pages also pass, such as the signed-in user or a lookup list, where one shared prop fits.

## Method

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

Read `/flow-response-design` and each harness doc that it points to. Their rules are the rules of this lens. Do not write the hand back of the skill.

Start at each changed line that builds a response, in any file. It can be a controller action, a transformer, a middleware, an exception or a page. Check it against each rule. Follow it in to the transformer and the query that load its data. Follow it out to each action that returns or renders it.

For each changed prop, look for the same value in the props of other pages and in `share()`.

## Threshold

Report a finding when a changed response breaks a rule as the rule is written, or when a changed page passes a value that other pages pass in the same shape.

Do not report:

- a choice that a harness doc lists under Valid Alternatives
- a value that other pages pass in a different shape, such as another variant of the same transformer

## Reporting

- Name the response and the rule that it breaks, in the words of the skill or the doc. State the change that the rule asks for.
- For a repeated value, name the value, the pages that pass it, and the shared prop that replaces it. `<harness>/response.md` shows `share()` and `once()`.
- State what the defect costs, and when it happens. For example: each of the 12 pages under `admin/` runs the same query for the list of countries on every visit, because each action passes it as a prop.
- When several changed responses break the same rule, report it once, and name each response.
