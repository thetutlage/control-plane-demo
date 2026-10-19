---
name: flow-review-code-placement
description: "Review a code change for server code in the wrong place, such as a helper function or a utils file, a private controller method, a service that only describes its steps, or a second service for a process that already has one. Use as one lens in a review run."
user-invocable: false
---
# Review lens: Code placement

## Scope

- **Rules** Whether changed server code breaks a rule of `/flow-code-placement`, or of a skill or a harness doc that it points to.

## Method

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

Read `/flow-code-placement` and each skill and harness doc that it points to. Their rules are the rules of this lens. Do not write the hand back of a skill.

Start at each step that the change adds to server code, and at each class, function or file that it adds. Follow each added abstraction out to the code that calls it, to find how many places use it.

## Threshold

Report a finding when a changed step, class, function or file breaks a rule as the rule is written.

Do not report:

- a choice that a harness doc lists under Valid Alternatives
- a class with no abstractions

## Reporting

- Name the step, the class, the function or the file, and the rule that it breaks, in the words of the skill. State the change that the rule asks for, such as the place that the step moves to, or the abstraction to remove.
- State what the defect costs, and when it happens.
- When several changed steps or files break the same rule, report it once, and name each one.
