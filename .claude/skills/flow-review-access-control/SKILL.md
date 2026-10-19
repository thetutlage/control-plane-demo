---
name: flow-review-access-control
description: "Review a code change for access control and authorization defects, such as a query, a file path or a cache key that can reach the data of another user, or an action that needs an authorization check and has none. Use as one lens in a review run."
user-invocable: false
---
# Review lens: Access control

A **record** is any data that belongs to one user: a row, a file in storage, a cache entry, a search document or a message on a channel.

## Scope

- **Read reach** Whether changed code can return a record of another user. The read can take any form, such as a model query, the query builder, raw SQL, a file path or storage key built from input, a cache key without the owner, or a broadcast channel that any user can join.
- **Write reach** Whether changed code can change a record of another user, or give a record to another user. The write can take any form, such as an update, a bulk delete, raw SQL, a file write to a path built from input, an id in the payload or an owner column in the payload.
- **Checks** Whether a changed action acts on a record without an authorization check.

## Method

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

First find the **owner key**: the column, relationship or key part that separates the records of one user from the records of another user. For rows, the models and `database/schema.ts` show it.

Start at each changed line that reads or writes a record, in any file. Follow it out to the entry points that call it, such as a route, a command, a job or a channel, to learn whose request it runs for. Follow it in to the query, the path or the cache key, to see which records it can reach and whether it carries the owner key.

For each changed action that acts on a record, find its authorization check. Read `<harness>/authorization.md` for the checks this app uses.

## Threshold

Report a finding when changed code can reach a record of another user, or when a changed action skips the roles, permissions or policies that the app uses to protect actions. Trace each finding to an entry point.

Do not report:

- a record that belongs to no user, such as a public listing or shared reference data
- a child that is loaded through its parent, or a record that is created through its parent, when the parent is in reach
- an action on a record that the user reaches through their own relationship, when no role, permission or policy covers that action

## Reporting

- Name the entry point, the users who can call it, and the record of another user that they can read or change. For example: any signed-in user can read the invoices of another tenant by changing the id in `GET /invoices/:id`.
- For a missing authorization check, name the action, the users who can reach its record, and what they can do that their rights do not allow.
- State the fix. When `/flow-access-control` has a rule for the read or the write, give its scope or its check. Otherwise state the fix in the finding, such as the owner key to put in a storage path or a cache key.
- Name the test that proves the fix: a request by one user for a record of another user.
- When several changed reads, writes or actions miss the same owner key or the same check, report it once, and name each place and the scope or check it needs.
