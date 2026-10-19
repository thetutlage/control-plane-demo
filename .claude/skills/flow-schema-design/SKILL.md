---
name: flow-schema-design
description: "Schema design — settle the schema decisions that have more than one common answer in an AdonisJS app - soft deletion, constraints, enums, money, polymorphic relations, JSON columns and changes to a table that has rows. Use when you write or review a migration or a model, when you want to add a `deleted_at` column, a check constraint, a `type` and `id` pair of columns or a JSON column, when a column holds an amount of money, when a migration changes a table that has rows, or when another skill needs one of these decisions."
---
# Schema Design

Some schema decisions have more than one common answer. These rules give the answer for an AdonisJS app.

Use these rules when you write a schema and when you review one.

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

## Before you start

Read these files:

- `database/schema.ts` gives each table and each column. If the file is missing, read `database/migrations/`.
- The models in `app/models/`.

## Soft deletion

- Delete the row. Do not add a `deleted_at` column to a table.
- When deleted data must be kept, copy the row to a tombstone table and delete it, in one transaction.
- Use one tombstone table for all models. It holds the name of the table, the id of the row, the row as JSON, and the time.
- A record that a user can restore in the product is not deleted. Give it a state, for example `archived_at`.

## Constraints

- Put `NOT NULL` on each column that must have a value. Make a column nullable only when "no value" is a real state of the record.
- Put a unique index on each value that must be unique. When the value must be unique inside a group, put each column of the group in the index.
- Put a foreign key on each reference to a row, and state its `ON DELETE`. Use `CASCADE` when the child has no meaning without the parent. Use `RESTRICT` when the parent must not be deleted while it has children. Use `SET NULL` when the child stays without the parent.
- Do not add a `CHECK` constraint for a format, a range or a set of allowed values. Put that check in a validator. `<harness>/validation.md` shows how to write it.

## Enums

- For a column that holds one value from a fixed set, follow `<harness>/migrations.md`. Do not use a native database enum.

## Money

- Store an amount of money as an integer in the smallest unit of its currency. For US dollars that unit is the cent. Do not use a float or a decimal column.
- When the app has more than one currency, store the currency code in a column next to the amount.
- Do arithmetic on the integer. Convert it to the display form only when you show it.

## Polymorphic relations

- Do not add a `type` column and an `id` column that together point at more than one table. That pair cannot have a foreign key, and Lucid has no relationship for it.
- When a child belongs to more than one kind of parent, keep one table for the child and add a join table for each kind of parent. Each join table has a foreign key to the parent and a foreign key to the child.

## JSON columns

- Use a JSON column for data that the app stores and reads back whole, for example settings or a payload from an external service.
- Do not put a value in a JSON column when a query filters by it, sorts by it or joins on it, or when it points at a row. Give that value its own column or its own table.
- Give each JSON column a type. `<harness>/schema-rules.md` shows how.

## Changing a table that has rows

- Follow `<harness>/migrations.md` when a migration changes a table that has rows. It gives the order for a new `NOT NULL` column, for a backfill and for a rename.
- Do not drop a column in the change that removes the code that reads it. Drop it in a later migration of its own.

## Hand back

Start with the receipt: `Reads: <the harness docs read this run>`. Then give these blocks. Omit a block that has nothing in it.

- **Rules broken** — each table or column that breaks a rule, with its file, the rule, and the change that it needs.
- **Warnings** — each table that the app deletes rows from, when you cannot tell if the deleted data must be kept.
