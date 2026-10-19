---
name: flow-response-design
description: "Response design — decide what a controller action returns and how the page uses it - the props of the page, the transformer that produces them, the relations to preload, and the components that render them. Use when you write or review a controller action that renders a page, a transformer or a page, when you pass a model to a page, when a component formats a date or an amount, when a list page and a detail page need different fields, or when another skill needs the props of a page."
---
# Response Design — Inertia React

A **response** is what a controller action returns to the browser: a page with its props, or a redirect.

The props of a page are a **contract** between the server and the page.

These rules apply to both sides of the response: the server code that produces it, and the page that renders it.

Use these rules when you write a controller action or a page and when you review one.

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

## The contract

- Put in the props only the fields that the page uses. Do not pass a whole model.
- Format each value that a person reads in the transformer, not in the component.
- When a list needs fewer fields than the detail page, add a variant to the same transformer. Do not write a second transformer.
- `<harness>/transformers.md` shows how to write a transformer, a variant and a paginated list, and how to type the props of the page.

## Relations

- Preload each relation that the transformer reads, in the action that returns the response. A relation that is not preloaded is missing from the props.

## The page

- Use a component from `<harness>/design-system.md` before you make a new one.
- `<harness>/frontend.md` says where component files go and what a page file can hold.
- When a page shows a list, give it a state for the empty list.
- An action that redirects has no page of its own. `<harness>/response.md` shows the redirect and its flash message.

## Hand back

Start with the receipt: `Reads: <the harness docs read this run>`. Then give these blocks. Omit a block that has nothing in it.

- **Preloads to add** — each relation that a transformer reads and that its action does not preload, with the action.
- **Rules broken** — each transformer, action or page that breaks a rule, with its file, the rule and the change that it needs.
