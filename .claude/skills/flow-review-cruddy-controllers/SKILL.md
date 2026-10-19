---
name: flow-review-cruddy-controllers
description: "Review a code change for controller and route design defects that break a rule of the cruddy-controllers skill, such as a method outside the RESTful methods, two routes that need the same method, or a route nested more than one level. Use as one lens in a review run."
user-invocable: false
---
# Review lens: CRUDDY controllers

## Scope

- **Rules** Whether a changed controller or route breaks a rule of `/flow-cruddy-controllers`.

## Method

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

Read `/flow-cruddy-controllers` and each file that it points to, such as its references and its harness docs. Their rules are the rules of this lens. Do not write the hand back of the skill.

Start at each controller and each route that the change adds or modifies. Read them together with the other methods and routes of the same controller.

## Threshold

Report a finding when a changed controller or route breaks a rule as the rule is written.

Do not report:

- a choice that a harness doc lists under Valid Alternatives

## Reporting

- Name the controller or the route, and the rule that it breaks, in the words of the skill. State the change that the rule asks for, such as the controller and the method that the action moves to.
- State what the defect costs, and when it happens.
- When several changed controllers or routes break the same rule, report it once, and name each one.
