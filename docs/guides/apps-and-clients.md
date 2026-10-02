# Apps and clients

An **app** is registered once for the organization (`apps`). To let it sign members in to an environment, you configure a **client** for it in that environment (`app_clients`). Registering an app creates no clients; each one is set up by hand, with all its details.

```
App "Invoices"                      apps
├── client in Development           app_clients
├── client in Staging               app_clients
└── client in Production            app_clients
```

## Client columns

| Column               | Notes                                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| `client_id`          | `app_` plus 24 random characters. Not secret; it appears in URLs             |
| `client_secret`      | Encrypted with the app key. Use the `secret` getter to read it               |
| `client_secret_hint` | The secret's last four characters, for display                               |
| `app_url`            | Where the app runs in this environment                                       |
| `redirect_uris`      | Where members may be sent back after signing in. Each one must match exactly |

Secrets start with `cp_live_` in production and `cp_test_` in every other environment, followed by 40 random characters.

## Creating a client

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

When an app starts a sign-in or calls `/token`, `oidc-provider` asks the storage adapter (`app/middleware/oidc_storage_adapter.ts`) for the client. The adapter:

- reads `app_clients` by `client_id`, **only within the request's environment**, so a staging client is unknown to production;
- decrypts the secret;
- returns the same settings for every client:

| Setting                        | Value                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `grant_types`                  | `authorization_code`, `refresh_token`                                                                       |
| `response_types`               | `code`                                                                                                      |
| `token_endpoint_auth_method`   | `client_secret_basic`: the app sends `client_id:secret` in an HTTP Basic `Authorization` header to `/token` |
| `id_token_signed_response_alg` | `ES256`                                                                                                     |
| `redirect_uris`                | from the row                                                                                                |

Every client must use **PKCE** (`pkce.required` in the issuer middleware), including clients with a secret.

## Tests

`tests/functional/oidc/clients.spec.ts` covers:

- credential formats, and secrets being encrypted at rest;
- a registered client starting a sign-in;
- unknown clients and clients of other environments being rejected;
- unregistered redirect URIs being rejected;
- sign-ins without PKCE being rejected;
- `/token` accepting the right secret and rejecting a wrong one.
