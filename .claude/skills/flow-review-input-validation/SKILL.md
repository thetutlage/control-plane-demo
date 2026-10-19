---
name: flow-review-input-validation
description: "Review a code change for input validation defects, such as request data that reaches a write without a validator, a payload that lets a client set a column such as `role`, or a check written inline in a controller that belongs in a validator. Use as one lens in a review run."
user-invocable: false
---
# Review lens: Input validation

## Scope

- **Unchecked input** Whether data from a request, a webhook or a job reaches the code without a validator, or through a validator that does not check it. A client can then set a column that it must not set, such as `role` or `price`.
- **Rules** Whether a changed check breaks a rule of `/flow-validation-layers`, or of a harness doc that it points to, such as a check in the wrong layer or a check that repeats an earlier layer.

## Method

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

Read `/flow-validation-layers` and each harness doc that it points to, and `<harness>/request.md`. Their rules are the rules of this lens. Do not write the hand back of the skill.

Start at each changed line that reads or writes incoming data, in any file, such as a controller action, a webhook handler, a job or a service. Follow each value from its source to the code that uses or writes it. Find the check that the value passes. Also start at each changed check, such as a validator, a guard or a constraint in a migration, and follow it to the code whose data it checks.

## Threshold

Report a finding when changed code uses or writes a value that passes no check, or when a changed check breaks a rule as the rule is written. Trace each unchecked value to the code that uses it.

Do not report:

- a narrow read of URL state, such as `request.input('page', 1)`
- a route param, which a route matcher constrains
- a cookie read through `request.encryptedCookie(...)` or `request.cookie(...)`
- a choice that a harness doc lists under Valid Alternatives
- an owner column taken from the payload, which `review-access-control` reports

## Reporting

- For unchecked input, name the value and its source. Name the code that uses it. State what a client can do with it, and when. State the validator rule that checks it, from `<harness>/validation.md` and the doc of its Vine type.
- For a broken rule, name the check and the rule that it breaks, in the words of the skill or the doc. State the layer that the check moves to, or the check to remove.
- When several changed values or checks have the same defect, report it once, and name each one.
