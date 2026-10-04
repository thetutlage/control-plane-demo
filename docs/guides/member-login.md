# Member login

When an app sends a member to its environment's issuer, they see the issuer's sign-in page, sign in with their email and password, and are sent back to the app with a code. If they already signed in to that environment, they skip the page entirely (single sign-on).

## Words

- **Sign-in:** one paused sign-in attempt. When an app sends a member to `/oauth/auth` and they have no session yet, `oidc-provider` saves the app's request (which app, where to send them back, `state`, PKCE challenge) as a row in `oidc_interactions`, sets a cookie tied to it, and redirects to `/sign-in/<signInId>`.
- **Sign-in ID:** that row's random ID. It's not a user ID. It only lets the page continue that one request, from the browser holding the cookie, until it expires.
- **Interaction:** `oidc-provider`'s word for a sign-in (any step where a person must do something). It only appears in its API (`interactionDetails`, `interactionResult`), inside `SignInController`.

## The flow

```
App            → https://acme.<domain>/oauth/auth?client_id=…&code_challenge=…
oidc-provider  → 303 /sign-in/<signInId>                    (no session yet)
Sign-in page   ← "Sign in to Acme Inc., to continue to Invoices"
Member submits → POST /sign-in/<signInId>
               → 409 Inertia location: /oauth/auth/<signInId>   (full page visit)
oidc-provider  → 303 https://invoices.acme.com/callback?code=…&state=…
```

## The sign-in page

`oidc-provider` sends members to `/sign-in/<signInId>` (its `interactions.url` setting). That path is outside `/oauth`, so it reaches the AdonisJS router like any console page, with the usual session and CSRF protection. The routes are in a group scoped to issuer hosts (`.domain(':issuer.<console hostname>')` in `start/routes.ts`), so they don't exist on the console host.

| Route                     | Controller               | Does                                                                    |
| ------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `GET /sign-in/:signInId`  | `SignInController.show`  | Renders `sign_in/show`, with the organization, environment and app name |
| `POST /sign-in/:signInId` | `SignInController.store` | Checks the member and finishes the sign-in                              |

The group's `issuer` middleware (`app/middleware/issuer_middleware.ts`) finds the environment from the host, the same way the protocol middleware does, and puts it on `ctx.issuer` with an `oidc-provider` instance built the same way, from `createProvider()`. The controller needs that instance to read and finish the pending sign-in.

The page uses `inertia/layouts/sign_in.tsx`, which has no console navigation. Non-production environments show their name as a badge.

## Checking a member

- **Lookup:** by email, **within the issuer's environment only**. A member of staging can't sign in to production, even with the same email and password.
- **Rules:** the member must be `ACTIVE` and have a password. The password is checked with `member.verifyPassword()`.
- **Same answer for every failure:** "Email or password is incorrect", whether the email is unknown, the password is wrong, or the member is invited or suspended. Unknown emails still hash the password, so they take as long as a wrong one.
- **Account:** `oidc-provider` signs in the member's **actor ID**. Both middleware pass `createProvider()` a `findAccount` that uses `Member.findActive(environment, actorId)`, which only finds active members of the environment, so a suspended member's existing sessions stop working too.

## No consent screen

Every app is first-party. Our `loadExistingGrant` hook gives a signed-in member whatever the app asks for:

- it reuses the session's grant for that app when there is one (one grant per session and app);
- otherwise it creates one.

So when a signed-in member opens a second app, there's no sign-in page at all: `oidc-provider` redirects straight back with a code.

## Errors

Members see one of two error pages, which look the same and share their wording (`app/oidc/error_pages.ts`): a title, one sentence, and the OAuth error code underneath for whoever helps them. `oidc-provider`'s own descriptions are written for developers, so they go to the logs, not the page.

| Where                                    | Error                                                                                 | What the member sees                                                                                               | Rendered by                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `/oauth/*`                               | A broken request the spec lets us send back (missing PKCE, bad scope, …)              | Nothing from us: they're redirected to the app with `?error=…&state=…`, and the app shows it                       | `oidc-provider`                                                   |
| `/oauth/*`                               | Unknown client or unregistered redirect URI (never redirected, per RFC 6749 §4.1.2.1) | "We couldn't sign you in"                                                                                          | `resources/views/errors/oidc.edge`, from the `renderError` hook   |
| `/oauth/*`                               | Anything unexpected                                                                   | "Something went wrong on our side" (`server_error`), and the error is logged                                       | same                                                              |
| `/oauth/*` on a host with no environment | A mistyped or stale link                                                              | "This sign-in link isn't valid". Apps' servers get `404 {"error":"unknown_issuer"}`                                | `oidc_issuer_middleware.ts`                                       |
| `/sign-in/*`                             | Missing, expired, other browser, or not the sign-in in the URL (`SessionNotFound`)    | "This sign-in has expired"                                                                                         | `inertia/pages/errors/oidc.tsx`, from `app/exceptions/handler.ts` |
| `/sign-in/*`                             | Any other `oidc-provider` error                                                       | "We couldn't sign you in"                                                                                          | same                                                              |
| Anywhere else on an issuer host          | Not found / our own crash                                                             | "This sign-in link isn't valid" / "Something went wrong on our side". While debugging, crashes keep the debug page | same                                                              |
| `/sign-in/*`                             | Invalid form input or wrong credentials                                               | Field errors, or the toast "Email or password is incorrect"                                                        | the sign-in page                                                  |
| `/oauth/token`, `/oauth/me`              | Anything (these are called by apps' servers)                                          | Nothing: the app gets JSON                                                                                         | `oidc-provider`                                                   |

Errors are **rendered in the response to the failing request**, with its real status, never redirected to a separate error page. That keeps the status honest and needs no state across a redirect. Only form validation and wrong credentials redirect back to the form. `oidc-provider` errors below 500 are expected, and aren't reported as errors.

## Not built yet

- Exchanging the code for tokens, and what goes inside tokens.
- Logout.
- Inviting members to choose their own password.

## Tests

`tests/browser/oidc/member_login.spec.ts` covers:

- signing in and landing on the app's callback with a code and the app's `state`;
- single sign-on into a second app without the sign-in page;
- the same refusal for a wrong password, an unknown email, suspended and invited members, and a member of another environment;
- the error page;
- an unknown sign-in ID, and a sign-in that expires while the page is open;
- links to an issuer that doesn't exist, and other paths on an issuer host;
- the sign-in page not existing on the console host.

The apps' hosts don't exist, so the tests read the code from the browser's request to the callback.
