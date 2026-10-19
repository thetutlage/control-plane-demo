---
name: flow-review-response-exposure
description: "Review a code change for sensitive data exposure in responses, such as page props that send a password hash, a token or a private field to the browser, an error that shows internals or tells whether an account exists, or a secret in a cookie that is not encrypted. Use as one lens in a review run."
user-invocable: false
---
# Review lens: Response exposure — Inertia React

## Scope

- **Fields** Whether changed page props send a private value to a client that must not see it, such as a password hash, a token, a 2FA secret, an internal note, or the email of another user on a related record. A shared prop sends it to every page. A prop that the page hides behind a role still arrives in the HTML.
- **Errors** Whether a changed error response tells the client more than it needs. It can show internals, such as a stack trace or an SQL error. It can also tell an attacker that an account exists.
- **Delivery** Whether the change sends a secret in a cookie that is not encrypted, or lets a shared cache store a private response. A page with private values can also stay in browser history, even after logout.

## Method

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

First find the **private values** that the change can send. A value can come from any source, such as a model, a raw query row, a third-party API, a config or env value, the session or the request. The code shows which values are private, such as a column that the model hides from serialization, a value that holds a hash, a token, a key or a secret, or a value that only a policy or a staff action reads.

Start at each changed line that shapes what the client receives, in any file. It can be a controller action, a transformer, `share()` in `app/middleware/inertia_middleware.ts`, an exception or a middleware that sets a cookie or a header. Follow it in to each value it sends, and each field of each error. Follow it out to the pages that receive it, to learn who can read each value.

For each changed error, find the code that renders it: the `handle` method of the exception, or `app/exceptions/handler.ts`. Read `<harness>/exception-handling.md` for the error shape this app uses.

## Threshold

Report a finding when a changed response can give a client a value that it must not see. Trace each finding to the entry point that returns the response.

Do not report:

- a private value that the client owns, such as the email of the user on their own settings
- a secret that the action creates and returns once, such as a new API token or recovery codes
- a validation message about the client's own input

## Reporting

- Name the entry point, the clients that receive the response, and the value they must not see. For example: every page receives the 2FA secret of the signed-in user, because `share()` passes the user model as the `user` prop.
- For an error, name what it shows and who can cause it.
- State the fix. When `/flow-response-design` or `<harness>/response.md` has a rule for the response, give that fix, such as a transformer that picks only the columns the client uses, or an encrypted cookie. Otherwise state the fix in the finding.
- Name the test that proves the fix: a request for the response that asserts the value is absent.
- When several changed responses send the same value, report it once, and name each response and the fix it needs.
