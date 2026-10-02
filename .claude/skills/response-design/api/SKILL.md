---
name: response-design
description: Response design — decide what a controller action returns to an API client: the payload contract, its status codes and error shapes, the transformer that produces it and the relations to preload. Use when planning an endpoint's response, when deciding what a client needs from the server, when a payload is being shaped, or when another skill needs a settled payload contract with its transformers and preloads.
---

# Response Design — API

A **response** is what a controller action returns to a client: a payload, or a status carrying no body.

Design it inward — what the client needs, the **contract** that carries it, the shape the server produces, and the relations loaded so that shape exists.

Four rules hold throughout:

- **Be direct, concise and minimalist.** No filler words, no pleasantries, no unnecessary explanation.
- **Read before you ask.** The controllers and transformers on disk answer most of what you would otherwise put to the user.
- **Propose, then correct.** Draft the contract and have the user move it.
- **A decision that outlives this change stops the run.** Where a choice binds work beyond what is being planned, put the options up and wait. Naming the alternative inside a hand back is not asking — it is one paragraph among many, and the run carries on past it.

**Harness docs.** Open `__CONTEXT_FILE__`, find the `[AdonisJS Harness Docs Index]` block, and join its `root:` field to the absolute project root. Every `<harness>/...` path resolves against that. When the block is missing, say the AdonisJS harness is not installed and stop.

## Step 1 — Name what comes back

Take the controller actions in scope. A calling skill supplies them; otherwise ask which this covers.

Read the transformers already under `{{APP_PATH}}app/transformers/` and the controllers in this area, so an action extending an existing resource starts from its current shape.

Then per action, name what the client receives on success and what it receives when the action refuses — the outcomes the client has to tell apart, and the status that carries each. `<harness>/response.md` owns status and body mechanics; `<harness>/exception-handling.md` owns the shape a failure arrives in.

**Done when** every action names its success payload and every outcome a client must distinguish, each with its status.

## Step 2 — Settle the contract

Per resource in a payload, name every field and its origin — a column passed through, a value computed on the server, a formatted value, or a relation. Nested resources name their own fields the same way, to whatever depth the client reads.

Where a list needs less of a resource than its detail endpoint, that lighter shape is a variant of the same contract rather than a second one.

A paginated collection carries its rows and its pagination together; `<harness>/transformers.md` owns that shape.

**Done when** every field a client reads appears in the contract with its origin named, at every depth the payload reaches.

## Step 3 — Produce it

Read `<harness>/transformers.md`.

Per transformer: the resource it shapes, the fields it produces, and the variants Step 2 named. Values the client displays without further work are formatted here.

Then name the preloads. Every relation the contract reads is loaded by the action that returns it, and a relation with no preload behind it is absent from the payload.

**Done when** every field in the contract traces to a column, a computation or a preloaded relation, and every relation in the contract has its preload named against the action that returns it.

## Hand back

Open with the receipt: `Reads: <the harness docs read this run>`. Nothing precedes it — a finding that changes the hand back is one line inside it, and a reading that changes nothing is not reported at all. Then these blocks. A block with nothing to carry is left out, rather than filled with a line saying it is empty.

- **Endpoints** — each action whose response this change alters, and its success payload and every distinguishable outcome with its status.
- **Contract** — per resource, every field with its origin, and any variants.
- **Transformers** — per resource, the fields produced and the variants.
- **Preloads** — per action, the relations to load before transforming.
- **Open** — what this leaves to whoever acts on it.

Entries carry decisions, not bodies. `<harness>/transformers.md` supplies those at the point someone writes the files.

**A skill invoking this one** brings its own controller actions. Take them as Step 1's input, read what those actions return today, and run the rest.
