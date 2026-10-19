---
name: flow-review-query-cost
description: "Review a code change for database queries whose cost grows with the data, such as an N+1 query, a list with no limit on a table that grows, or slow work inside a transaction. Use as one lens in a review run."
user-invocable: false
---
# Review lens: Query cost

## Scope

- **Per row** Whether changed code runs an N+1 query. The query can hide in a transformer or a model hook, because each one runs once for each row. Another form is related rows that the code loads only to count or filter them, where `withCount(...)` or `whereHas(...)` fits. A third is rows that the code writes one at a time, where `createMany(...)` or a bulk update fits.
- **Unbounded** Whether changed code reads every row of a table that grows, such as with `Model.all()`, a list with no `paginate(...)` or `limit(...)`, a count or a sum that the code computes, or a job that loads a whole table into memory. A `where` or an `orderBy` on a column with no index also reads every row.
- **Held resources** Whether changed code holds a connection or a row lock while it waits on work outside the database, such as an HTTP call, a mail send or an upload inside a transaction.

## Method

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

Read `<harness>/model-relationships.md`, `<harness>/query-builder.md`, `<harness>/pagination.md` and `<harness>/transactions.md`. They give the query that fits each case.

Treat a table as one that grows when the app creates rows in it. A table that only a seeder or a migration fills does not grow.

Start at each changed line that runs a query or reads a relation, in any file. Follow it out to the code that calls it, to find a loop over rows, a transformer or a model hook. Find whether the query limits its rows, and the columns that it filters or sorts on. The migrations of the table show its indexes.

Also start at each changed transaction, and find the work outside the database inside it.

## Threshold

Report a finding when changed code runs a query once for each row, reads every row of a table that grows, or holds a connection or a row lock while it waits on work outside the database. Trace each finding to the query that causes it.

Do not report:

- a loop that runs a different query for each row, or a write for each row that must run its model hooks
- a count or a sum in code over rows that the code already loads for its response
- a choice that a harness doc lists under Valid Alternatives

## Reporting

- Name the query and the code that runs it. State how its cost grows, and when it happens, such as once for each row of a list on every visit.
- State the fix. When a harness doc gives the query that fits, such as `preload(...)`, `withCount(...)`, `paginate(...)` or a write after the transaction commits, give that query. Otherwise state the fix in the finding, such as the index to add.
- When several changed queries have the same defect, report it once, and name each query.
