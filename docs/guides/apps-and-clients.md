# Apps and clients

An **app** is registered once for the organization (`apps`). To let it sign members in to an environment, you configure a **client** for it in that environment (`app_clients`). Registering an app creates no clients; each one is set up by hand, with all its details.

```
App "Invoices"                      apps
├── client in Development           app_clients
├── client in Staging               app_clients
└── client in Production            app_clients
```

## Client columns

| Column                      | Notes                                                                            |
| --------------------------- | -------------------------------------------------------------------------------- |
| `client_id`                 | `app_` plus 24 random characters. Not secret; it appears in URLs                 |
| `client_secret`             | Encrypted with the app key. Use the `secret` getter to read it                   |
| `client_secret_hint`        | The secret's last four characters, for display                                   |
| `app_url`                   | Where the app runs in this environment                                           |
| `redirect_uris`             | Where members may be sent back after signing in. Each one must match exactly     |
| `post_logout_redirect_uris` | Where members may be sent after [logout](logout.md). Each one must match exactly |

Secrets start with `cp_live_` in production and `cp_test_` in every other environment, followed by 40 random characters.

## In the console

| URL                                | Page                                                               |
| ---------------------------------- | ------------------------------------------------------------------ |
| `/w/:org/apps`                     | Apps list, with **Register app**                                   |
| `/w/:org/apps/create`              | Register an app: name and slug                                     |
| `/w/:org/apps/:app`                | The app's **Overview** tab: issuer URL, client ID and app URL      |
| `/w/:org/apps/:app/settings`       | The app's **Settings** tab: its client                             |
| `/w/:org/apps/:app/clients/create` | Configure a client: app URL, redirect URIs, sign-out redirect URIs |
| `/w/:org/clients/:client/edit`     | Edit a client's URLs. Its environment can't change                 |

- **App pages** show the app's name and details, the environment switcher, then the tabs. Every tab shows the chosen environment ([Console layout](signup-and-console.md#layout)).
- **Settings tab.** Either "No client yet" with **Configure**, or the issuer URL, client ID, secret, app URL, redirect URIs and sign-out redirect URIs, with **Edit**, **Rotate secret** and **Remove**.
- **Configure client.**
  - The client is created in the environment chosen on the app's page, shown as a badge. An app has at most one client per environment.
  - Redirect URIs are entered one per line, between 1 and 10.
  - Sign-out redirect URIs are where the app may send members after [logout](logout.md): optional, one per line, up to 10, with the same rules.
  - Production accepts only `https`. Other environments also accept `http` on `localhost`, `127.0.0.1` and `[::1]`.
  - URLs can't contain wildcards or `#fragments`. These rules are in `app/validators/rules/client_url.ts` and `redirect_uri_list.ts`.
- **Secrets.**
  - In development and staging, the secret is masked with a **Show** button.
  - In production, the full secret is shown once, on the app page right after the client is created; after that, only the last four characters. It's passed to that one page view as the `clientSecret` flash message, and `AppClientTransformer` never sends a production secret.

## Changing a client

Client routes are shallow (`router.shallowResource`): a client ID is unique, so `/w/:org/clients/:client` needs no app in the URL. Clients are looked up through the organization (`organization.related('appClients')`), so another organization's client is a 404.

| Action            | Effect                                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edit**          | Saves the URLs, with the same rules as creating. The issuer uses them on the next request. Members already signed in stay signed in                                                                               |
| **Rotate secret** | Replaces the secret right away (`AppClient.rotateSecret()`). The old one stops working, so the app can't sign members in or refresh until it has the new one. The new secret is shown the same way as on creation |
| **Remove**        | Deletes the client, and with it its grants, codes and refresh tokens (foreign keys). Members are signed out of the app in that environment within 5 minutes. Settings goes back to **Configure**                  |

**Rotate secret** and **Remove** break a running app, so both ask first, on the Settings tab, saying what will happen next to the environment's badge.

## Creating a client in code

```ts
const client = await environment.createAppClient(app, {
  appUrl: 'https://invoices.acme.com',
  redirectUris: ['https://invoices.acme.com/auth/callback'],
})

client.clientId // 'app_…'
client.secret // 'cp_live_…'
```

`createAppClient()` is on `Environment` because the secret prefix depends on the environment's kind. `AppClient.generateCredentials(kind)` creates the credentials.

## How `oidc-provider` finds a client

When an app starts a sign-in or calls `/oauth/token`, `oidc-provider` asks the storage adapter (`app/oidc/storage_adapter.ts`) for the client. The adapter:

- reads `app_clients` by `client_id`, **only within the request's environment**, so a staging client is unknown to production;
- decrypts the secret;
- returns the same settings for every client:

| Setting                        | Value                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `grant_types`                  | `authorization_code`, `refresh_token`                                                                             |
| `response_types`               | `code`                                                                                                            |
| `token_endpoint_auth_method`   | `client_secret_basic`: the app sends `client_id:secret` in an HTTP Basic `Authorization` header to `/oauth/token` |
| `id_token_signed_response_alg` | `ES256`                                                                                                           |
| `redirect_uris`                | from the row                                                                                                      |
| `post_logout_redirect_uris`    | from the row                                                                                                      |

Every client must use **PKCE** (`pkce.required` in the issuer middleware), including clients with a secret.

## Tests

`tests/browser/console/apps.spec.ts` covers:

- registering an app;
- configuring a development client and revealing its secret;
- the production secret being shown only once;
- `https` being required in production, for redirect and sign-out URIs;
- editing a client, and the issuer refusing a redirect URI that was removed;
- rotating a secret: shown once, the old one refused, the new one accepted;
- removing a client signing members out of the app;
- other organizations' apps and clients returning 404.

`tests/functional/oidc/clients.spec.ts` covers:

- credential formats, and secrets being encrypted at rest;
- a registered client starting a sign-in;
- unknown clients and clients of other environments being rejected;
- unregistered redirect URIs being rejected;
- sign-ins without PKCE being rejected;
- `/oauth/token` accepting the right secret and rejecting a wrong one.
