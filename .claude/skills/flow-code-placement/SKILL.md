---
name: flow-code-placement
description: "Code placement — decide where a piece of code goes in an AdonisJS app - in the class that needs it, in a model method, in a service, or in a pattern object. Use when code is shared or repeated, when a class or a method grows too large, when you want to add a helper function, a private controller method or a utils file, when you review code for unnecessary abstractions, or when another skill needs a location for each piece of code."
---
# Code Placement

These rules apply to server code: a controller, a command, a job, an event listener, or a service. They do not apply to frontend code.

The default is no abstraction. Duplicate code alone is not a reason to make one. When two classes need the same code and the code has no name in the product, each class keeps its own copy.

Move a step out only when one of the places below takes it. A step that you move is an **abstraction**.

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

## Where a step goes

Look at one step at a time. A step is one part of the work that a method does, for example a query, a check, or a write. A class can keep some steps and move others.

When a change is in progress, apply these rules only to the lines that the change adds. Do not apply them to lines that the change only moves or renames.

Before you make an abstraction, list the files under `app/`. If a service for the same process or a pattern object for the same concept exists, use it. Do not make a second one.

- **The class that needs the step** keeps it by default.
- **A model method** takes a step that reads or writes the state of one model class, when more than one place in the app needs the same step and the step has a name in the product. For example, an app that shows published posts in many places has `Post.published()`. A query that one action needs stays in that action. The step can act on one record, on a query of its records, or on its relationships.
- **A service** takes a dense domain process. A dense process has many steps and business rules, and a domain expert would name it. Read `<harness>/services.md` before you decide.
- **A pattern object** is a class for one concept. It takes steps on a concept that has a value and more than one representation or operation. `Money` is an example: it has an amount, a display format, and arithmetic. One operation on a value stays in the class that needs it.

Then check the name of each abstraction. The name must mean something in the product. If it only says what the steps do, put the steps back in the class that needs them.

- `UserService.onboard` names a process in the product. It stays an abstraction.
- `UserService.recordSignIn` only describes its steps. Put those steps back in the class that needs them.

A class with no abstractions is a correct result.

## Pattern objects

- Put a pattern object in a directory that has the name of its concept: `app/<concept>/`.
- When you write a pattern object, do not make a generic abstraction unless the task or the person asks for one. A generic abstraction is a base class, or a class for more than one concept.
- Use `/flow-pattern-object-design` to write it.

## Where code does not go

- Do not move a step to a private method of a controller. Keep the step in the action, or move it to one of the places above. A service can have private methods.
- Do not write top-level functions or utility modules. Use a class. The only exception is a factory. A factory is an exported function. Its name starts with `create` or `make`. It returns a class instance.
- Put types in `types/`. A validator file and a file in `app/values/` can export their own types. A file in `app/values/` holds enums and runtime constants.

## Hand back

Start with the receipt: `Reads: <the harness docs read this run>`. Then give these blocks. Omit a block that has nothing in it.

- **Abstractions to make** — each one with its place and its file.
- **Abstractions to remove** — each one with its file and the rule it breaks.
