---
name: service-boundaries
description: Service boundaries — decide where each piece of a controller action, command, job or listener's work lives (the action itself, a model method, or a service), and design the services that result. Use when deciding whether something earns a service, when an action has grown past what it should own, when designing a service's methods and responsibilities, or when another skill needs every action's work placed with an owner.
---

# Service Boundaries

An **action** is an entry point that runs work: a controller method, a command's `run()`, a job's handler, an event listener.

Work either stays in the **action** or earns an **abstraction** — a method on the model, or a service. This skill decides which, then designs whatever ends up a service.

Four rules hold throughout:

- **Be direct, concise and minimalist.** No filler words, no pleasantries, no unnecessary explanation.
- **Read before you ask.** The controllers, models and services on disk answer most of what you would otherwise put to the user.
- **Propose, then correct.** Draft the decisions and have the user move them.
- **A decision that outlives this change stops the run.** Where a choice binds work beyond what is being planned, put the options up and wait. Naming the alternative inside a hand back is not asking — it is one paragraph among many, and the run carries on past it.

**Harness docs.** Open `__CONTEXT_FILE__`, find the `[AdonisJS Harness Docs Index]` block, and join its `root:` field to the absolute project root. Every `<harness>/...` path resolves against that. When the block is missing, say the AdonisJS harness is not installed and stop.

## Step 1 — List the work

Take the actions in scope. A calling skill supplies them; otherwise ask which actions this covers.

Read the controllers and models they touch, and everything under `{{APP_PATH}}app/services/` — an existing service is an available owner.

Then, per action, write down what it does, step by step: validate, authorize, load, mutate, notify, respond, and so on.

**Done when** every action in scope has its steps written out.

## Step 2 — Decide what earns an abstraction

**The unit is the step, not the action.** One action routinely splits several ways — validation and the response stay with it while a dense middle step goes elsewhere. Abstracting a whole action produces a service that is the action under a second name.

**Only a step that grew is a candidate.** Work whose shape changed without gaining substance — reordered, renamed, moved between lines — stays exactly where it is, and is not a question.

- A step **stays in the action** by default.
- A **model method** takes work that reads and writes one model's own state.
- A **service** takes a **dense** domain process. `<harness>/services.md` holds the test.

Work that earns its own file earns a service — the app has no helper layer for it to land in.

Reuse does not earn a service. A service already earned serves every action that needs it, so check the ones Step 1 found before naming a new owner.

Every step ending up inline is a complete result.

**Done when** every step from Step 1 either stays in the action or names the abstraction it earned, and every proposed service names the domain process it encapsulates.

## Step 3 — Design the services

Run this for each service Step 2 named. When it named none, the run ends at the hand back.

Start with whether this is a new file or a method on a service already on disk.

Then per method: its name — the domain step it performs — what it takes (models, validated payloads, plain server values), and what it returns (models, value objects, domain results).

Then what the service does **not** own: whatever Step 2 left in the action.

Put the name through the naming test in `<harness>/services.md` before the file gets one. A name that means something only inside the codebase is Step 2 telling you this work belongs to the controller and the model — take it back there.

**Done when** every service names its methods with their inputs and outputs, names what it does not own, and carries a name that passes the test.

## Hand back

Open with the receipt: `Reads: <the harness docs read this run>`. Nothing precedes it — a finding that changes the hand back is one line inside it, and a reading that changes nothing is not reported at all. Then these blocks. A block with nothing to carry is left out, rather than filled with a line saying it is empty.

- **Abstractions** — every step that earned one, and what it became. The action keeps the rest, said once rather than row by row.
- **Services** — each one with its methods, their signatures, and what it does not own.
- **Open** — what this leaves to whoever acts on it.

Entries carry decisions, not bodies.

The design ends at the decisions; the files belong to whoever called.

**A skill invoking this one** brings its own action list. Take it as Step 1's input, read what those actions touch, and run the rest.
