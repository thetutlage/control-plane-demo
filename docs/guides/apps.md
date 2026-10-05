# Apps

An **app** (`apps`) is an internal app in one environment, together with the OAuth client it signs in with. The same app in staging and in production is two rows that share nothing, not even their client ID.

## Columns

| Column                      | Notes                                                                            |
| --------------------------- | -------------------------------------------------------------------------------- |
| `name`, `slug`              | The slug is unique within the environment and appears in console URLs            |
| `client_id`                 | `app_` plus 24 random characters. Not secret; it appears in URLs                 |
| `client_secret`             | Encrypted with the app key. Use the `secret` getter to read it                   |
| `client_secret_hint`        | The secret's last four characters, for display                                   |
| `app_url`                   | Where the app runs                                                               |
| `redirect_uris`             | Where members may be sent back after signing in. Each one must match exactly     |
| `post_logout_redirect_uris` | Where members may be sent after [logout](logout.md). Each one must match exactly |

Secrets start with `cp_live_` in production and `cp_test_` in every other environment, followed by 40 random characters.

## In the console

| URL                                            | Page                                                                   | Controller                   |
| ---------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| `/w/:org/:environment/apps`                    | The environment's apps, with **Register app**                          | `AppsController.index`       |
| `/w/:org/:environment/apps/create`             | Register an app: name, slug, app URL, redirect URIs, sign-out URIs     | `AppsController.create`      |
| `/w/:org/:environment/apps/:app`               | The **Overview** tab: member counts, issuer URL, client ID and app URL | `AppsController.show`        |
| `/w/:org/:environment/apps/:app/members`       | The **Members** tab: everyone who has signed in to the app             | `AppMembersController.index` |
| `/w/:org/:environment/apps/:app/settings`      | The **Settings** tab: credentials and URLs                             | `AppSettingsController.show` |
| `/w/:org/:environment/apps/:app/settings/edit` | Edit the app's URLs                                                    | `AppSettingsController.edit` |

Rotating the secret is `POST …/apps/:app/secret` (`AppSecretsController.store`): it creates a new secret, which replaces the old one. Removing is `DELETE …/apps/:app` (`AppsController.destroy`).

- **Registering** issues the client ID and secret straight away, and opens the Settings tab.
  - Redirect URIs are entered one per line, between 1 and 10.
  - Sign-out redirect URIs are where the app may send members after [logout](logout.md): optional, one per line, up to 10, with the same rules.
  - Production accepts only `https`. Other environments also accept `http` on `localhost`, `127.0.0.1` and `[::1]`.
  - URLs can't contain wildcards or `#fragments`. These rules are in `app/validators/rules/client_url.ts` and `redirect_uri_list.ts`.
- **Members tab.** One row per member who has ever signed in to the app (`member_apps`, through `app.related('members')`), most recent sign-in first, with their first and last sign-in. An **Active** badge marks members with a live session at the issuer right now (`OidcSession.live` scope). The Overview tab shows both counts: "12 members have used Invoices · 3 active now".
  - Active means signed in at the issuer, not to this app. A session lasts 30 days and the app's grant 14, so a member can be active after the app's grant has expired. Their next visit to the app signs them in again without a password.
- **Secrets.**
  - In development and staging, the secret is masked with a **Show** button.
  - In production, the full secret is shown once, on the Settings tab right after registering or rotating; after that, only the last four characters. It's passed to that one page view as the `clientSecret` flash message, and `AppTransformer` never sends a production secret.

Apps are looked up through the environment (`environment.related('apps')`), so an app of another environment or organization is a 404.

## Changing an app

| Action            | Effect                                                                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edit**          | Saves the URLs, with the same rules as registering. The issuer uses them on the next request. Members already signed in stay signed in. The name, slug and credentials don't change                            |
| **Rotate secret** | Replaces the secret right away (`App.rotateSecret()`). The old one stops working, so the app can't sign members in or refresh until it has the new one. The new secret is shown the same way as on registering |
| **Remove**        | Deletes the app, and with it its grants, codes, refresh tokens and [sign-in history](members-and-actors.md) (foreign keys). Members are signed out of it within 5 minutes                                      |

**Rotate secret** and **Remove** break a running app, so both ask first, on the Settings tab, saying what will happen next to the environment's badge.

## Registering an app in code

```ts
const app = await environment.createApp({
  name: 'Invoices',
  slug: 'invoices',
  appUrl: 'https://invoices.acme.com',
  redirectUris: ['https://invoices.acme.com/auth/callback'],
})

app.clientId // 'app_…'
app.secret // 'cp_live_…'
```

`createApp()` is on `Environment` because the secret prefix depends on the environment's kind. `App.generateCredentials(kind)` creates the credentials.

## How `oidc-provider` finds a client

When an app starts a sign-in or calls `/oauth/token`, `oidc-provider` asks the storage adapter (`app/oidc/storage_adapter.ts`) for the client. The adapter:

- reads `apps` by `client_id`, **only within the request's environment**, so a staging app is unknown to production;
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

- registering a development app and revealing its secret;
- the production secret being shown only once;
- `https` being required in production, for redirect and sign-out URIs;
- slugs being unique per environment, and each environment's app getting its own credentials;
- the apps list showing only its environment's apps;
- editing an app, and the issuer refusing a redirect URI that was removed;
- rotating a secret: shown once, the old one refused, the new one accepted;
- the Members tab listing only the app's members, marking those with a live session, and the Overview counts;
- removing an app signing members out of it;
- apps of other environments and organizations returning 404.

`tests/functional/oidc/clients.spec.ts` covers:

- credential formats, and secrets being encrypted at rest;
- a registered app starting a sign-in;
- unknown apps and apps of other environments being rejected;
- unregistered redirect URIs being rejected;
- sign-ins without PKCE being rejected;
- `/oauth/token` accepting the right secret and rejecting a wrong one.
