---
name: flow-design-tests
description: "Test design — decide which tests to write, what each test asserts and what it fakes, for an HTTP request, a console command, a queued job or an event listener. Use when you write or review a test, when you want to add a unit test, a mock or a fake, when a test uses `setTimeout` or a fixed delay, when a test sets a value in the DOM or calls a handler directly, or when another skill needs a test for each behaviour."
---
# Design Tests

A **surface** is a place where the app meets its consumer. A test proves a behaviour through a surface, and it asserts only what the consumer can see.

| Surface           | Its consumer          | What the consumer can see                           |
| ----------------- | --------------------- | --------------------------------------------------- |
| An HTTP request   | A person or a client  | The page or the response, the status, the redirect  |
| A console command | The person who ran it | The exit code and the output                        |
| A queued job      | The app after the job | The state that the job left, the effects it started |
| An event listener | The app after it      | The state that it left, the effects it started      |

Everything else is internal: a component instance, a call to a service, the fact that a method ran.

These rules apply to tests of server code and to browser tests of a page. A browser test is a test of an HTTP request, as a person sees it. Do not test one frontend component or one hook alone.

Use these rules when you write tests and when you review tests.

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

Read `<harness>/testing.md` before you write a test. It names the suite, the helpers and the fakes for each surface. If the index block lists no `testing.md`, say that the testing harness doc is not installed, and stop.

## Which tests to write

- Test each behaviour through its real surface, with the suite that `<harness>/testing.md` names for that surface. A test through the surface runs the same code path that the consumer uses. For an HTTP request, that path includes the route and the middleware.
- Write a unit test only for logic that has branches, a calculation or a state transition, and that is hard to reach through the surface. Then ask: if this unit test is deleted, which bug gets past the tests of the surface? If the answer is "none", do not write it.
- Do not write a unit test for a controller, a command or a job handler. Each one connects other code, and only a test through the surface runs those connections.
- Do not write a test for a getter, for configuration, or for the behaviour of the framework or the ORM.
- Do not write a test for a behaviour that a different test already proves.
- Logic that has many branches needs a test for each branch.

## What a test does

- Give each test one behaviour. When one action has two effects, write two tests. A failure then shows which effect broke.
- Do not assert that a method ran or that a service was called.
- Reach each state the way the consumer reaches it: through the UI, the request or the command. Do not set a value in the DOM, send an event that the UI does not send, call a handler directly, or use the internals of Playwright.
- If the standard UI and the user flows cannot produce a state, do not test that state.
- Wait for a condition, not for time. Wait for an element, a row or a finished job with the helpers in `<harness>/testing.md`. Do not use `setTimeout` or a fixed delay.

## Fakes

- Fake only what is outside the process: an external service, a third-party SDK, or the clock. Use the built-in fakes and the container swap from `<harness>/testing.md`.
- Do not fake your own controller, model, command or job handler.
- Fake your own service only when it wraps something outside the process, for example a payment gateway. Write the name of that outside thing in a comment at the swap.
- When you write a fake for your own service, make it a working implementation that keeps its data in memory. An object that only records calls is not a fake.

## Hand back

Start with the receipt: `Reads: <the harness docs read this run>`. Then give these blocks. Omit a block that has nothing in it.

- **Tests to add** — each behaviour that has no test, with its surface.
- **Tests to change** — each test that breaks a rule, with its file and the rule.
- **Tests to remove** — each test that these rules say not to write, with its file and the reason.
- **Warnings** — each behaviour that needs a helper or an assertion that `<harness>/testing.md` does not have.
