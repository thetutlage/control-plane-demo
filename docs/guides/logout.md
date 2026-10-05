# Logout

Members sign in through the issuer, and sign out there too. **Signing out of any app signs the member out of every app in that browser.** Their other browsers and devices stay signed in.

## What an app does

On "Sign out", the app clears its own session, then sends the browser to the issuer:

```
https://acme.<domain>/oauth/session/end
  ?id_token_hint=<the member's ID token>
  &post_logout_redirect_uri=https://invoices.acme.com/signed-out
  &state=<optional, sent back unchanged>
```

The issuer ends the member's session, revokes what was issued in it, and redirects to `post_logout_redirect_uri` with `state`. The member sees no prompt.

`post_logout_redirect_uri` must exactly match one of the app's **Sign-out redirect URIs** ([Apps](apps.md)). To land on a page that isn't registered, the app can pass its own `state`, or keep the page in its own cookie, and redirect after it lands.

## What gets revoked

Everything issued belongs to the browser's session. When it ends, nothing issued in it works, for any app:

- Every app's refresh token from that browser fails with `invalid_grant`.
- Access tokens already issued keep working until they expire, at most 5 minutes. They are JWTs and can't be called back.

So other apps open in that browser notice within 5 minutes: their next refresh fails, they send the member to the issuer, and the member sees the sign-in page.

A browser holds at most one grant per app: each visit to the issuer revokes the app's previous grant in that browser before creating a new one. That's what lets sign-out revoke them all, since the session remembers one grant per app.

## Pages

| Page                       | When                                                                                                            | Template                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| "Signing you out…"         | The app sent a valid `id_token_hint`. The page submits itself, so the member doesn't notice it                  | `resources/views/oidc/sign_out.edge`   |
| "Sign out?"                | No `id_token_hint`. The member confirms, so a stray link can't sign them out                                    | same                                   |
| "You're signed out"        | No `post_logout_redirect_uri`                                                                                   | `resources/views/oidc/signed_out.edge` |
| "We couldn't sign you out" | A broken request, such as a `post_logout_redirect_uri` that isn't registered. The member may still be signed in | `resources/views/errors/oidc.edge`     |

Both sign-out pages always sign out of every app. `oidc-provider`'s option to sign out of one app only isn't offered.

## Where the code lives

| File                          | Does                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/oidc/create_provider.ts` | `rpInitiatedLogout` (our pages), `expiresWithSession: true` (tokens belong to the session), `loadExistingGrant` (revoking the previous grant) |
| `app/oidc/storage_adapter.ts` | `post_logout_redirect_uris` from the app                                                                                                      |

## Not built yet

- Members signing themselves out of every device. Admins can, from the member's page ([Members](members-and-actors.md#in-the-console)).
- Telling apps right away (back-channel logout), instead of at their next refresh.

## Tests

`tests/browser/oidc/logout.spec.ts` covers:

- signing out of one app ending every app's refresh tokens in that browser, landing back on the app with `state`, and the next sign-in asking for the password;
- a sign-out link without the ID token asking first;
- an unregistered sign-out redirect URI being refused.
