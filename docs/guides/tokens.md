# Tokens

After a member signs in, the app's browser lands on its callback with a one-time `code`. The app's server swaps that code for tokens at `/oauth/token`.

## Swapping the code

```sh
curl -u "$CLIENT_ID:$CLIENT_SECRET" https://acme.<domain>/oauth/token \
  -d grant_type=authorization_code \
  -d code=<code from the callback> \
  -d redirect_uri=https://invoices.acme.com/callback \
  -d code_verifier=<the PKCE verifier the app generated>
```

```json
{
  "access_token": "eyJ…",
  "id_token": "eyJ…",
  "refresh_token": "…",
  "expires_in": 300,
  "token_type": "Bearer"
}
```

A wrong secret is `401 invalid_client`. A wrong verifier, or a code used before, is `400 invalid_grant`. Using a code twice also revokes the tokens from its first use.

## What's in the tokens

Both are JWTs signed with the environment's ES256 key.

**ID token**: who signed in.

| Claim   | Value                                     |
| ------- | ----------------------------------------- |
| `iss`   | The issuer, `https://acme.<domain>/oauth` |
| `aud`   | The app's `client_id`                     |
| `sub`   | The member's actor ID                     |
| `name`  | The member's name, with `profile`         |
| `email` | The member's email, with `email`          |

**Access token**: for the app's own backend (header `typ: at+jwt`).

| Claim       | Value                 |
| ----------- | --------------------- |
| `iss`       | The issuer            |
| `aud`       | The app's `client_id` |
| `sub`       | The member's actor ID |
| `client_id` | The app's `client_id` |

## Scopes

| Scope     | Adds                    |
| --------- | ----------------------- |
| `openid`  | Required. `sub`         |
| `profile` | `name` in the ID token  |
| `email`   | `email` in the ID token |

Every app gets a refresh token; `offline_access` isn't needed. There are no other scopes: what a member can do comes from their roles.

## Checking a token

An app checks a token itself, without calling us:

1. Fetch the issuer's keys from `/oauth/jwks` and find the one whose `kid` matches the token's header.
2. Check the signature, `iss`, `aud` (its own `client_id`) and `exp`.

Each environment has its own keys, so a staging token never passes production's check.

## Refreshing

```sh
curl -u "$CLIENT_ID:$CLIENT_SECRET" https://acme.<domain>/oauth/token \
  -d grant_type=refresh_token \
  -d refresh_token=<refresh token>
```

The response may carry a new refresh token: one is replaced once it's 70% through its life. Always keep the one from the latest response.

A refresh fails with `invalid_grant` when the grant has expired, or the member is no longer active.

## Lifetimes

| Record        | Lasts                                         |
| ------------- | --------------------------------------------- |
| Access token  | 5 minutes                                     |
| ID token      | 1 hour                                        |
| Code          | 1 minute                                      |
| Sign-in page  | 10 minutes                                    |
| Grant         | 14 days from the visit to the issuer          |
| Refresh token | 14 days, but never longer than its grant      |
| SSO session   | 30 days, renewed on every visit to the issuer |

Every visit to the issuer creates a new **grant** (Sara → Invoices), and the refresh tokens from that visit work until it expires, however often the app refreshes. In practice:

- **Day 14:** refreshing fails, so the app sends the member to the issuer again. Their session is alive, so they come straight back with new tokens and never see the sign-in page.
- **30 days without visiting the issuer:** the session has ended, so the member signs in with their password.

Refresh tokens don't depend on the session: an app keeps refreshing after the member's session ends, until the grant expires.

## No userinfo endpoint

Userinfo is turned off. The ID token already carries the member's details, and `oidc-provider`'s userinfo only accepts stored access tokens, while ours are JWTs.

## Where the code lives

| File                                                               | Does                                                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `app/oidc/create_provider.ts`                                      | Lifetimes (`ttl`), claims per scope, refresh tokens for every app, JWT access tokens (`resourceIndicators`), a grant per visit |
| `app/middleware/oidc_issuer_middleware.ts`, `issuer_middleware.ts` | `findAccount`: the member's `sub`, `name` and `email`                                                                          |

`oidc-provider` only issues JWT access tokens for a "resource". Each client has one of its own, `urn:client:<client_id>`, which apps never send or see.

## Not built yet

- Permissions in the access token.
- Logout, and revoking a member's grants.
- Key rotation.

## Tests

`tests/browser/oidc/tokens.spec.ts` covers:

- swapping a code for tokens, and checking their signatures and claims against the JWKS;
- the ID token carrying only what the scopes ask for, and a refresh token without `offline_access`;
- a wrong secret, a wrong verifier, and a reused code;
- refreshing after the session is gone, and failing once the grant expires;
- the grant, refresh token and session lifetimes;
- a new grant on every visit;
- a suspended member not being able to refresh;
- staging tokens failing against production's keys.
