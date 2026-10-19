---
name: flow-review-tests
description: "Review a code change for test defects, such as a changed behaviour with no test through its surface, an assertion that still passes when the behaviour breaks, or a test that fakes the app's own code. Use as one lens in a review run."
user-invocable: false
---
# Review lens: Tests

## Scope

- **Coverage** Whether a changed behaviour has no test that proves it through its surface. The test can be missing, or the change can delete or skip it. Its assertions can also pass when the behaviour breaks.
- **Rules** Whether a changed test breaks a rule of `/flow-design-tests`, or of a harness doc that it points to.

## Method

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

Read `/flow-design-tests` and each harness doc that it points to. Their rules are the rules of this lens. Do not write the hand back of the skill.

Start at each changed line of server code, in any file. Follow it out to the surface that runs it, such as a route, a command, a job or a listener. Find the tests of that surface, and read whether they prove the changed behaviour. Also start at each changed test.

## Threshold

Report a finding when a changed behaviour has no test that proves it through its surface, or when a changed test breaks a rule as the rule is written.

Do not report:

- a behaviour that the skill says not to test, such as a getter, configuration, the framework, or a state that the UI cannot produce
- a change that keeps the behaviour, such as a rename or a move
- a choice that a harness doc lists under Valid Alternatives

## Reporting

- For a missing test, name the behaviour, its surface, and what can break with no test to catch it, and when. State the test to add: the suite and the helpers that `<harness>/testing.md` names for that surface.
- For a broken rule, name the test and the rule that it breaks, in the words of the skill. State what the broken rule lets through, and when. State the change that the rule asks for, such as the test to change or to remove.
- When several changed behaviours or tests have the same defect, report it once, and name each one.
