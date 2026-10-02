# Issuers and signing keys

Each environment is its own OpenID Connect **issuer**: the login server its apps redirect members to. Each issuer has its own URL, signing key, discovery document and JWKS.

## Issuer URLs

Issuers are subdomains of the console's URL (`APP_URL`):

| Environment      | Issuer                               |
| ---------------- | ------------------------------------ |
| Acme production  | `https://acme.<domain>`              |
| Acme staging     | `https://acme--staging.<domain>`     |
| Acme development | `https://acme--development.<domain>` |

Locally, with `APP_URL=http://localhost:3333`:

```sh
curl http://acme--development.localhost:3333/.well-known/openid-configuration
curl http://acme.localhost:3333/jwks
```

`*.localhost` resolves to your machine without any setup.

The double hyphen separates the organization from the environment. Organization slugs can't contain one, so `acme--staging` always means Acme's staging environment. In code:

```ts
environment.issuerSubdomain('acme') // 'acme--staging'
environment.issuerUrl('acme') // 'http://acme--staging.localhost:3333'
```

## Signing keys

`signing_keys` holds each environment's ES256 key pair.

- The private key is stored as a JWK, encrypted with the app key (`APP_KEY`).
- Signup creates one key for each environment, via `Environment.createSigningKey()`.
- `SigningKey.toJwk()` decrypts the key for the provider.
- The JWKS endpoint publishes only the public part.

Key rotation is not built yet.

## How a request reaches the provider

`app/middleware/oidc_issuer_middleware.ts` runs on every request, before routing:

1. **Is the host a subdomain of `APP_URL`?** If not, the request continues to the console as usual.
2. **Find the environment.** Split the subdomain on `--`: the first part is the organization slug and the second the environment slug. No second part means production. If there's no match, return `404 {"error":"unknown_issuer"}`.
3. **Build the provider.** Create a new `oidc-provider` instance from the environment's issuer URL and keys. Each request gets its own instance, which is then thrown away, so changes to keys or settings apply immediately.
4. **Hand over the request.** `oidc-provider` writes the response itself.

Issuer requests never pass through the console's body parser, session, CSRF or auth middleware.

## Not built yet

- The member login page, token contents, logout and key rotation.

Which apps can sign in is covered in [Apps and clients](apps-and-clients.md). What `oidc-provider` stores is covered in [Sign-in records](sign-in-records.md).

## Tests

`tests/functional/oidc/issuers.spec.ts` checks that:

- each environment has its own issuer and key;
- the private key is never published;
- organizations don't share keys;
- unknown subdomains return 404;
- the console host is not treated as an issuer.
