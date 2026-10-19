---
name: flow-review-migration-safety
description: "Review a code change for migrations that are unsafe on a database with rows, such as a migration that loses data, fails on existing rows, breaks the code that still runs during the deploy, or locks a table while it works on every row. Use as one lens in a review run."
user-invocable: false
---
# Review lens: Migration safety

## Scope

- **Data loss** Whether a changed migration can lose data that is already in the database. It can drop a column or a table, change a type so that values are cut, overwrite values in a backfill, or add `ON DELETE CASCADE` to an existing foreign key.
- **Failure** Whether a changed migration can fail on a table that has rows. It can add a constraint that existing rows break, or edit a migration that has already run.
- **Running code** Whether the code that runs during the deploy still works with the changed schema. Old code can still read a renamed column, or insert a row without a new `NOT NULL` column.
- **Locks** Whether a changed migration can lock a table that has rows while it works on every row, such as with a backfill of all rows in one statement, or an index built without `CONCURRENTLY`.

## Method

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

Read `<harness>/migrations.md`. It gives the safe order for a change to a table that has rows.

Treat a table as one that has rows when an earlier migration creates it. A table that the same change creates has no rows.

Start at each migration that the change adds or modifies. Read each statement of `up` in order, and find what it does to the rows that are already in the table. Follow each changed column or table out to the code that reads or writes it, both before and after the change. During a deploy, the code from before the change still runs while the migration runs.

## Threshold

Report a finding when a changed migration can lose data, fail, break running code or lock the table, on a table that has rows. Trace each finding to the statement in `up` that causes it.

Do not report:

- a drop of a column or a table that no code reads, before or after the change, in a migration of its own
- a step of the safe order in `<harness>/migrations.md`, such as a nullable column, then a backfill in `this.defer`, then `dropNullable`
- a type change that only widens a column, such as a longer string or an integer to a `bigint`

## Reporting

- Name the migration, the statement, what it does to the rows that are already in the table, and when it happens, such as when the migration runs or during the deploy.
- State the fix. When `<harness>/migrations.md` or `/flow-schema-design` gives a safe order for the change, give that order. Otherwise state the fix in the finding, such as a rename in three steps: add the new column, write to both, then drop the old one.
- When several changed migrations have the same defect, report it once, and name each migration.
