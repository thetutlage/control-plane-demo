# Apps

An **app** (`apps`) is an internal app, registered once for the organization with a name and slug. It moves through the environments: its **setup** in each one (`app_environments`) holds the OAuth client it signs in with there. An app with no setup in an environment hasn't reached that stage.

```
App "Invoices"                       apps
├── setup in Development             app_environments
├── setup in Staging                 app_environments
└── (not in Production yet)
```

## Setup columns

| Column                      | Notes                                                                            |
| --------------------------- | -------------------------------------------------------------------------------- |
| `client_id`                 | `app_` plus 24 random characters. Not secret; it appears in URLs                 |
| `client_secret`             | Encrypted with the app key. Use the `secret` getter to read it                   |
| `client_secret_hint`        | The secret's last four characters, for display                                   |
| `app_url`                   | Where the app runs in this environment                                           |
| `redirect_uris`             | Where members may be sent back after signing in. Each one must match exactly     |
| `post_logout_redirect_uris` | Where members may be sent after [logout](logout.md). Each one must match exactly |

Secrets start with `cp_live_` in production and `cp_test_` in every other environment, followed by 40 random characters. An app has at most one setup per environment, with its own credentials.

## In the console

| URL                                                  | Page                                                                  | Controller                         |
| ---------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------- |
| `/w/:org/apps`                                       | Apps, with a column per environment: "Set up" or "Not yet"            | `AppsController.index`             |
| `/w/:org/apps/create`                                | Register an app: name and slug                                        | `AppsController.create`            |
| `/w/:org/apps/:app`                                  | The **Overview** tab: where the app is set up, and **Delete app**     | `AppsController.show`              |
| `/w/:org/apps/:app/environments/:environment`        | An environment's tab: the setup and who signed in, or **Set up in …** | `AppEnvironmentsController.show`   |
| `/w/:org/apps/:app/environments/:environment/create` | Set the app up there: app URL, redirect URIs, sign-out redirect URIs  | `AppEnvironmentsController.create` |
| `/w/:org/apps/:app/environments/:environment/edit`   | Edit the setup's URLs                                                 | `AppEnvironmentsController.edit`   |

- **Registering** opens the app's Development tab, ready to set it up there.
- **Setting up** issues the client ID and secret straight away.
  - Redirect URIs are entered one per line, between 1 and 10.
  - Sign-out redirect URIs are where the app may send members after [logout](logout.md): optional, one per line, up to 10, with the same rules.
  - Production accepts only `https`. Other environments also accept `http` on `localhost`, `127.0.0.1` and `[::1]`.
  - URLs can't contain wildcards or `#fragments`. These rules are in `app/validators/rules/client_url.ts` and `redirect_uri_list.ts`.
- **Members on an environment's tab** are the members who can sign in to the app there: see [App members](#app-members).
- **Secrets.**
  - In development and staging, the secret is masked with a **Show** button.
  - In production, the full secret is shown once, on the tab right after setting up or rotating; after that, only the last four characters. It's passed to that one page view as the `clientSecret` flash message, and `AppEnvironmentTransformer` never sends a production secret.

Apps are looked up through the organization (`organization.related('apps')`) and setups through the app and the environment, so another organization's app, or a setup that doesn't exist, is a 404.

## App members

Only app members can sign in to an app in an environment ([Member login](member-login.md#access-to-the-app)). The environment's tab lists them, most recent sign-in first, with their roles, last sign-in ("Never" until they first sign in), and an **Active** badge when they have a live session at that environment's issuer (`OidcSession.live` scope). Active means signed in at the issuer, not to this app: a session lasts 30 days and the app's grant 14.

| URL                                                          | Page                                                  | Controller                    |
| ------------------------------------------------------------ | ----------------------------------------------------- | ----------------------------- |
| `…/apps/:app/environments/:environment/members/create`       | Add a member: pick one without access, and roles      | `AppMembersController.create` |
| `…/apps/:app/environments/:environment/members/:member/edit` | Change their roles, or **Remove access** (asks first) | `AppMembersController.edit`   |

- **Roles** are the organization's roles; at least one is required (`app/validators/app_member.ts`).
- **Removing access** (`appMember.revoke()`) deletes the app member and the member's grants for the app in that environment, so the app signs them out at its next refresh, within 5 minutes. Their next visit gets "You don't have access".
- `:member` is the member's ID; another organization's member, or one without access, is a 404.

## Changing an app

| Action                    | Effect                                                                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edit**                  | Saves the setup's URLs, with the same rules as setting up. The issuer uses them on the next request. Members already signed in stay signed in. The credentials don't change                                    |
| **Rotate secret**         | `POST …/environments/:environment/secret` (`AppSecretsController.store`) replaces the setup's secret right away. The app can't sign members in or refresh there until it has the new one                       |
| **Remove from …**         | Deletes the setup, and with it its grants, codes, refresh tokens and sign-in history in that environment (foreign keys). Members are signed out of it there within 5 minutes. Other environments are untouched |
| **Delete app** (Overview) | Deletes the app and every setup, in every environment                                                                                                                                                          |

All but Edit break a running app, so they ask first, saying what will happen.

## Setting an app up in code

```ts
const app = await organization.related('apps').create({ name: 'Invoices', slug: 'invoices' })
const setup = await environment.setUpApp(app, {
  appUrl: 'https://invoices.acme.com',
  redirectUris: ['https://invoices.acme.com/auth/callback'],
})

setup.clientId // 'app_…'
setup.secret // 'cp_live_…'
```

`setUpApp()` is on `Environment` because the secret prefix depends on the environment's kind. `AppEnvironment.generateCredentials(kind)` creates the credentials.

## How `oidc-provider` finds a client

When an app starts a sign-in or calls `/oauth/token`, `oidc-provider` asks the storage adapter (`app/oidc/storage_adapter.ts`) for the client. The adapter:

- reads `app_environments` by `client_id`, **only within the request's environment**, so an app's staging client is unknown to production;
- decrypts the secret;
- returns the same settings for every app:

| Setting                        | Value                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `grant_types`                  | `authorization_code`, `refresh_token`                                                                             |
| `response_types`               | `code`                                                                                                            |
| `token_endpoint_auth_method`   | `client_secret_basic`: the app sends `client_id:secret` in an HTTP Basic `Authorization` header to `/oauth/token` |
| `id_token_signed_response_alg` | `ES256`                                                                                                           |
| `redirect_uris`                | from the row                                                                                                      |
| `post_logout_redirect_uris`    | from the row                                                                                                      |

Every app must use **PKCE** (`pkce.required` in the issuer middleware), even with a secret.

## Tests

`tests/browser/console/apps.spec.ts` covers:

- registering an app, which opens its Development tab;
- setting it up in development, revealing its secret, and the apps list showing where it is set up;
- the production secret being shown only once;
- `https` being required in production, for redirect and sign-out URIs;
- slugs being unique per organization;
- an environment tab listing only that environment's app members, marking those with a live session;
- editing a setup, and the issuer refusing a redirect URI that was removed;
- rotating a secret: shown once, the old one refused, the new one accepted;
- removing an app from one environment signing members out there only;
- an environment's tab listing only the members with access there, with their roles;
- deleting an app removing every setup;
- another organization's app, and setups that don't exist, returning 404.

`tests/functional/oidc/clients.spec.ts` covers:

- credential formats per environment, and secrets being encrypted at rest;
- a registered app starting a sign-in;
- unknown apps and apps set up only in other environments being rejected;
- unregistered redirect URIs being rejected;
- sign-ins without PKCE being rejected;
- `/oauth/token` accepting the right secret and rejecting a wrong one.

`tests/browser/console/app_members.spec.ts` covers giving access with roles, requiring a role, editing roles, removing access (signed out of that environment only), deleting a role, and another organization's member being refused.
