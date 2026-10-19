---
name: flow-access-control
description: "Access control — limit the records that each action can reach, with a scope on each read and write and an authorization check on each record. Use when you write or review code that reads or writes records that belong to users, tenants or organisations, when a list endpoint or a bulk write needs a limit, or when another skill needs a scope or a check for each touch."
---
# Access Control

The **reach** of an action is the set of records that it can touch. Each action must limit its reach.

Two things limit reach:

- A **scope** limits the records that a statement reaches, for a read and for a write. Only a scope can limit a collection.
- An authorization **check** decides what the action can do to a record.

Use these rules when you write code and when you review code.

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

## The key

Read `<harness>/authorization.md`. It gives the authorization surfaces of this app: policy methods, abilities, roles, or permission keys. Use its words when you name a check.

If the index block lists no authorization doc, the app has no authorization package. Apply the scope rules, and put a warning in the hand back.

Find the **segregation key**: the column or the relationship that separates the data of one user from the data of a different user. The models and `database/schema.ts` show it.

## Touches

A **touch** is one read or one write of records. Find each touch in each action.

An action reads:

- the collections that it queries
- the records that it loads by id
- the relationships that it preloads

An action writes:

- the records that it creates
- the records that it updates or deletes, one at a time or in bulk
- each id in the payload that points at a record
- each payload column that can change the owner of a record

## Rules

### Reads

- Limit a **collection** with a scope: put the segregation key in its where clause.
- Put the key in the lookup of a **record that is loaded by id**. An id that belongs to a different user is then not found. Do not find the record first and refuse it after.
- Load a **child resource** through its parent, so that the reach of the parent limits it.

### Writes

- Take the key of a **created record** from the authenticated user, or from the parent that the record is created through. A record that is saved through a relationship gets its key from the parent.
- Resolve each **id in the payload** through the same scope as a read, before you write it. A category, an assignee, or a destination folder can belong to a different user. An id that is out of reach resolves to nothing.
- Keep the **key** out of the payload. If a client can write the column that decides the owner of a record, the client can give that record to a different user.
- Give a **bulk update or delete** the same where clause as a collection read.

### Global touches

- A **global touch** is a touch that has no scope. It reaches the records of every user.
- A touch can be global on purpose, for example a public listing or shared reference data. Write the reason in a comment at the touch. A global touch that has no reason is a warning in the hand back.

### Checks

- Add a check to each action that acts on a record. Use a surface from `<harness>/authorization.md`.
- Do not use a scope in place of a check, or a check in place of a scope. An action that acts on a record needs both.

## Hand back

Start with the receipt: `Reads: <the harness docs read this run>`. Then give these blocks. Omit a block that has nothing in it.

- **Key** — the segregation key.
- **Limits to add** — each touch that has no limit, with its file and the limit that it needs.
- **Checks to add** — each action that acts on a record and has no check, with the surface to use.
- **Warnings** — a missing authorization package, and each global touch that has no reason.
