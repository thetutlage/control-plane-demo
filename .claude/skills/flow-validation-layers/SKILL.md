---
name: flow-validation-layers
description: "Validation layers — decide which layer makes each check on incoming data - the validator, a guard that needs a loaded record, or a database constraint. Use when you write or review a validator, when a check needs a record that the payload does not have, when a model method or a service checks the type or the shape of a value again, when you want to add a check constraint or an enum column to a migration, or when another skill needs a layer for each check."
---
# Validation Layers

Each check on incoming data runs in one **layer**. There are three layers:

- The **validator** checks what the payload alone can decide: presence, type, format, length, range, and the shape of nested objects and arrays.
- A **guard** checks what needs a loaded record: the state that the operation needs, a relationship that must exist, or a transition that must be legal.
- A **database constraint** holds uniqueness and referential integrity.

The validator runs first, then the guards, then the database. A layer does not repeat a check that an earlier layer made. A guard does not check the type or the shape of a value.

Use these rules when you write code and when you review code.

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

## Rules

### The validator

- Read `<harness>/validation.md` before you write a validator rule. It names the doc for each Vine type. Take each rule from those docs, not from memory.

### Guards

- Write the guard in the code that loads the record: the controller action, the model method, or the service.

### Database constraints

- Do not add a database constraint for a check that the validator or a guard can make. The app can tell the user which rule was broken. A constraint can only fail the query.
- A database constraint is for a check that depends on other rows: a value that must be unique, and a reference to a row. A second request can change those rows after the app checks them.
- `/flow-schema-design` decides `NOT NULL`, the unique indexes and the foreign keys. They are not checks to remove.

### A check in two layers

- A value that must be unique can have a `unique` rule in the validator and a unique index. The rule gives the user a field error. The index is the guarantee.
- Do not catch the error of the index when the rule exists. Let it go to the error handler.

## Hand back

Start with the receipt: `Reads: <the harness docs read this run>`. Then give these blocks. Omit a block that has nothing in it.

- **Checks to add** — each check that is missing, with its file and its layer.
- **Checks to move** — each check that is in the wrong layer, with its file and the layer that it belongs to.
- **Checks to remove** — each check that repeats a check of an earlier layer, and each database constraint that the app can check, with its file.
