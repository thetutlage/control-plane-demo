---
name: response-design
description: Response design — decide what a controller action returns and how the page that renders it is authored, working inward from what is shown to the components, the props contract, the transformer output and the relations to preload. Use when planning a page, when deciding what a screen needs from the server, when a page's props are being shaped, or when another skill needs a settled props contract with its transformers and preloads.
---

# Response Design — Inertia Vue

A **response** is what a controller action returns to the browser: a page with its props, or a redirect.

Design it inward — what the person is shown, the components that show it, the **contract** between the page and the server, the shape the server produces, and the relations loaded so that shape exists.

The contract has two sides at once: it is the page's props type and the transformer's output. Every field is settled once, for both.

Four rules hold throughout:

- **Be direct, concise and minimalist.** No filler words, no pleasantries, no unnecessary explanation.
- **Read before you ask.** The pages, components and transformers on disk answer most of what you would otherwise put to the user.
- **Propose, then correct.** Draft the decomposition and the contract, and have the user move them.
- **A decision that outlives this change stops the run.** Where a choice binds work beyond what is being planned, put the options up and wait. Naming the alternative inside a hand back is not asking — it is one paragraph among many, and the run carries on past it.

**Harness docs.** Open `__CONTEXT_FILE__`, find the `[AdonisJS Harness Docs Index]` block, and join its `root:` field to the absolute project root. Every `<harness>/...` path resolves against that. When the block is missing, say the AdonisJS harness is not installed and stop.

## Step 1 — Settle the page

Take the controller actions in scope. A calling skill supplies them; otherwise ask which this covers.

An action that redirects returns no page of its own. Name the flash message it carries and the page it lands on, per `<harness>/response.md`, and it is done.

For the rest, read what already exists under `{{APP_PATH}}inertia/pages/` and the components beside them. An action rendering an existing page starts from that page, and a page with an established pattern to follow has already been answered.

Then settle what the page is, one question at a time: what a person came here for, what is primary and what is secondary to it, what they can do from here, and what the page holds when it is empty or when something failed.

The brief deliberately left the delivery mechanics to this skill — where an error appears, whether input survives a failed submit, what a person waits on. Settle them here; nothing downstream asks.

**Done when** every page names what it is for, what is primary on it, what can be done from it, and what it shows when empty or failed.

## Step 2 — Wireframe it

A wireframe settles what is on the page and how it is arranged. It settles nothing about how the page looks — `<harness>/design-system.md` owns that, later.

**Skip it where an established pattern already answers the page.** The fifth page of a kind in an app that has four has no arrangement left to decide.

**Where the arrangement is a real fork**, draw each side as its own file rather than describing the alternatives. Two or three options, differing in structure — what is primary, how things group, where the actions sit. Options that differ in spacing are one option written twice.

Write to `<change>/wireframes/<page>-<option>.html`, a calling skill supplying the change folder. Each file:

- carries the app's real chrome where it has one, so the page is judged in place rather than in a vacuum
- holds content at realistic length — a name that overflows, a list at one row and at fifty — without that becoming the work
- looks unfinished on purpose: grey boxes, borders, system type, no colour and no imagery. A wireframe that looks designed collects feedback about colour, which is not what is being asked
- links to its siblings, so flipping between them costs nothing

Say where they are and wait. The useful answer is often a harvest — the header from one, the roster from another — rather than a pick.

Then collapse: rewrite the agreed arrangement as `<page>.html` and delete the rest. A folder of alternatives is an ambiguity handed downstream.

What the drawing reveals goes back to Step 1 — an arrangement that will not draw is an answer that did not hold. Data this page needs that the plan does not have is named here, while it is still cheap.

**Done when** every page needing one has a single agreed wireframe on disk, and anything the drawing surfaced is recorded.

## Step 3 — Decompose into components

`<harness>/frontend.md` governs where component files live and what a page file may hold. Read it, and decompose to satisfy it.

Reach for `<harness>/design-system.md` before creating anything — a component that already exists is the one to use.

Per component, name what it is given.

**Done when** every piece of information from Step 1 is rendered by a named component, and every new component names what it is given.

## Step 4 — Settle the contract

What the components are given rolls up into one contract per page: its props.

Per field, name its origin — a column passed through, a value computed on the server, a formatted value, or a relation. Where a list needs less of a resource than its detail page, that lighter shape is a variant of the same contract rather than a second one.

A paginated list carries its rows and its pagination together; `<harness>/transformers.md` owns that shape.

**Done when** every prop a component needs appears in the contract, and every field in the contract names its origin.

## Step 5 — Produce it

Read `<harness>/transformers.md`.

Per transformer: the resource it shapes, the fields it produces, and the variants Step 4 named. Values the person reads are formatted here rather than in the component.

Then name the preloads. Every relation the contract reads is loaded by the action that renders the page, and a relation with no preload behind it arrives as nothing.

**Done when** every field in the contract traces to a column, a computation or a preloaded relation, and every relation in the contract has its preload named against the action that renders it.

## Hand back

Open with the receipt: `Reads: <the harness docs read this run>`. Nothing precedes it — a finding that changes the hand back is one line inside it, and a reading that changes nothing is not reported at all. Then these blocks. A block with nothing to carry is left out, rather than filled with a line saying it is empty.

- **Pages** — each action whose response this change alters, and the page it renders or the redirect and flash it returns.
- **Wireframe** — the agreed file per page, and what its arrangement settled. Pages that followed an existing pattern have none.
- **Components** — the page, plus each new component with what it is given.
- **Contract** — per page, every field with its origin, and any variants.
- **Transformers** — per resource, the fields produced and the variants.
- **Preloads** — per action, the relations to load before transforming.
- **Open** — what this leaves to whoever acts on it.

Entries carry decisions, not bodies. `<harness>/transformers.md` and `<harness>/design-system.md` supply those at the point someone writes the files.

**A skill invoking this one** brings its own controller actions. Take them as Step 1's input, read the pages they touch, and run the rest.
