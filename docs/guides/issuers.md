# Issuers and signing keys

Each environment is its own OpenID Connect **issuer**: the login server its apps redirect members to. Each issuer has its own URL, signing key, discovery document and JWKS.

## Issuer URLs

Issuers live on subdomains of the console's URL (`APP_URL`), under `/oauth`:

| Environment      | Issuer                                     |
| ---------------- | ------------------------------------------ |
| Acme production  | `https://acme.<domain>/oauth`              |
| Acme staging     | `https://acme--staging.<domain>/oauth`     |
| Acme development | `https://acme--development.<domain>/oauth` |

Locally, with `APP_URL=http://localhost:3333`:

```sh
curl http://acme--development.localhost:3333/oauth/.well-known/openid-configuration
curl http://acme.localhost:3333/oauth/jwks
```

`*.localhost` resolves to your machine without any setup.

The double hyphen separates the organization from the environment. Organization slugs can't contain one, and are at least 3 characters long, because DNS reserves `--` in a label's third and fourth characters (`ab--staging` would be refused by certificate authorities). In code:

```ts
environment.issuerSubdomain('acme') // 'acme--staging'
environment.issuerUrl('acme') // 'http://acme--staging.localhost:3333/oauth'
Environment.findForIssuerHost('acme--staging.localhost:3333') // Acme's staging environment
```

An issuer host serves only `/oauth/...` (the protocol) and `/sign-in/...` (the [sign-in page](member-login.md)). Every other path is a 404.

## Where the code lives

| File                                       | Does                                                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `app/models/environment.ts`                | `issuerSubdomain()`, `issuerUrl()`, `isIssuerHost()` and `findForIssuerHost()`: from an environment to its issuer, and back |
| `app/middleware/oidc_issuer_middleware.ts` | Server middleware: hands `/oauth/...` to `oidc-provider`                                                                    |
| `app/middleware/issuer_middleware.ts`      | Named middleware on the sign-in routes: puts the environment and its provider on `ctx.issuer`                               |
| `app/oidc/create_provider.ts`              | Builds an `oidc-provider` instance from its inputs, with our settings and hooks. No database access                         |
| `app/oidc/storage_adapter.ts`              | Where `oidc-provider` stores its records ([Sign-in records](sign-in-records.md)), and how it finds clients                  |
| `app/oidc/error_pages.ts`                  | The wording of the error pages members can see                                                                              |
| `app/controllers/sign_in_controller.ts`    | The sign-in page ([Member login](member-login.md))                                                                          |
| `app/models/member.ts`                     | `Member.findActive()`: the one rule for who can sign in                                                                     |

## Signing keys

`signing_keys` holds each environment's ES256 key pair.

- The private key is stored as a JWK, encrypted with the app key (`APP_KEY`).
- Signup creates one key for each environment, via `Environment.createSigningKey()`.
- `SigningKey.toJwk()` decrypts the key for the provider.
- The JWKS endpoint publishes only the public part.

Key rotation is not built yet.

## How a request reaches the provider

`app/middleware/oidc_issuer_middleware.ts` is a server middleware: it runs on every request, before routing. It only acts on paths under `/oauth`:

1. **Find the environment** with `Environment.findForIssuerHost(host)`: split the subdomain on `--`. The first part is the organization slug and the second the environment slug; no second part means production. If there's no match, return `404 {"error":"unknown_issuer"}`.
2. **Build the provider** with `createProvider()` from `app/oidc/create_provider.ts`. The middleware passes in the environment's issuer URL, its decrypted keys, the cookie keys, a storage adapter bound to the environment, and a `findAccount` that uses `Member.findActive()`. `createProvider()` builds the `oidc-provider` instance from its inputs only (issuer URL, keys, cookie keys, storage adapter, account lookup) and does no database lookups. Each request gets its own instance, which is then thrown away, so changes to keys or settings apply immediately.
3. **Mount and hand over.** Strip `/oauth` from the path, keep the full path as `originalUrl` (the way Express mounts a sub-app), and hand the request to `oidc-provider`, which writes the response itself.

These requests never pass through the console's body parser, session, CSRF or auth middleware.

### Behind a proxy

When TLS ends at a proxy (`portless` locally, a load balancer in production), `oidc-provider` must build its URLs from the `X-Forwarded-*` headers. The middleware doesn't let it trust them directly. It overwrites them with the protocol, host and IP that AdonisJS resolved, then sets `provider.proxy = true`. AdonisJS honours forwarded headers only from proxies its `trustProxy` setting allows (loopback by default), so both layers always agree.

## Not built yet

- Logout and key rotation.

Which apps can sign in is covered in [Apps and clients](apps-and-clients.md), and what they get back in [Tokens](tokens.md). What `oidc-provider` stores is covered in [Sign-in records](sign-in-records.md).

## Tests

`tests/functional/oidc/issuers.spec.ts` checks that:

- each environment has its own issuer and key;
- the private key is never published;
- organizations don't share keys;
- behind a trusted proxy, endpoints use the forwarded protocol;
- unknown subdomains return 404;
- an issuer host serves nothing outside `/oauth` and the sign-in page;
- the console host is not treated as an issuer.
