# Sign-in records

While members sign in to apps, `oidc-provider` saves a few kinds of records. Each kind has its own table.

| Table                      | Record                                                                                         | Lives for                              |
| -------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| `oidc_interactions`        | A sign-in in progress: which app sent the member, and where to send them back                  | Minutes                                |
| `oidc_sessions`            | The member's sign-in to the environment's sign-in page. This is what makes single sign-on work | 30 days, renewed on every visit        |
| `oidc_grants`              | One sign-in of a member to one app ("Sara → Invoices"), with what it allows                    | 14 days                                |
| `oidc_authorization_codes` | The one-time `code` an app exchanges for tokens                                                | About a minute, usable once            |
| `oidc_refresh_tokens`      | Tokens an app uses to get new access tokens                                                    | 14 days, never longer than their grant |

ID tokens and access tokens are signed JWTs, so they're never stored. Apps verify them with the issuer's public key.

## How the tables relate

```
oidc_sessions          actor_id → actors
oidc_grants            actor_id → actors, client_id → app_clients
├── oidc_authorization_codes   grant_id → oidc_grants
└── oidc_refresh_tokens        grant_id → oidc_grants
```

- **Every table has `organization_id` and `environment_id`**, with the same composite foreign keys as every other environment table. A grant can't point to an actor or app client in another environment.
- **Deleting a grant deletes its codes and refresh tokens.** The foreign keys cascade. That's how a sign-in is revoked: the app's next refresh fails, and the app signs the member out.
- **Deleting an actor or an app client** deletes their sessions and grants.

## Columns

Each row stores the full record in `payload` (JSONB), in the shape `oidc-provider` defines. Don't read or change it outside the adapter. The other columns are copies of payload fields we query on, and the console may read them (the `OidcSession` model) or delete rows by them (`member.signOutEverywhere()`):

| Column         | On                    | Used for                                                 |
| -------------- | --------------------- | -------------------------------------------------------- |
| `uid`          | sessions              | `oidc-provider` looks sessions up by it                  |
| `actor_id`     | sessions, grants      | finding a member's sign-ins, for example to suspend them |
| `signed_in_at` | sessions              | when the browser signed in, for the member's page        |
| `client_id`    | grants                | which app a grant is for                                 |
| `grant_id`     | codes, refresh tokens | revoking everything under a grant                        |
| `consumed_at`  | codes, refresh tokens | marking a code or refresh token as used                  |
| `expires_at`   | all                   | expired rows are ignored when read                       |

`oidc-provider` calls a member's ID an "account". In our tables that's the member's actor ID.

## The storage adapter

`app/oidc/storage_adapter.ts` is the only code that writes these tables, apart from the console deleting a member's sessions and grants. The issuer middleware creates one adapter per record type for each request:

```ts
adapter: (model) => new OidcStorageAdapter(model, environment)
```

- **Limited to one environment.** Every query includes that environment's ID, so one environment can never see another's records, even with the same ID.
- **Unknown record types aren't stored.** Saving one fails with an error naming it; reading one finds nothing.
- **Codes and refresh tokens are marked used atomically:** `UPDATE … SET consumed_at = now() WHERE consumed_at IS NULL`. If two requests race with the same token, only one succeeds and the other gets `invalid_grant`.
- **Reuse is caught.** A refresh token is replaced once it's 70% through its life. The used one stays in the table until it expires; if it shows up again, `oidc-provider` sees it was used and revokes the whole grant.

## Features turned off

These are on by default in `oidc-provider`, but would store record types we have no table for:

- pushed authorization requests (PAR);
- DPoP.

## Not built yet

A job that deletes expired rows. Expired rows are ignored when read, so it's only housekeeping.

## Tests

`tests/functional/oidc/storage_adapter.spec.ts` covers:

- saving, replacing and reading records;
- expired records not being found;
- codes and refresh tokens being usable only once, including when two requests race;
- deleting and revoking grants;
- isolation between environments;
- finding sessions by `uid`;
- unknown record types not being stored.
