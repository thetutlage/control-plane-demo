# Identity provider

A company's staff sign in with the company's own identity provider: Google Workspace, Microsoft Entra, Okta, or anything that speaks OpenID Connect. The organization connects it once, on the console's **Authentication** page, and every environment uses it.

**Not used for sign-in yet.** This guide covers connecting the provider. Members still sign in with a password ([Member login](member-login.md)) until the next steps are built. The model and its rules are in [the plan](../plan.md), under "Sign-in".

## Columns

`identity_providers`, one row per organization:

| Column               | Notes                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| `kind`               | `IdentityProviderKind`: OIDC 0, the company's own client at its provider |
| `domains`            | The staff email domains, lowercase: `["acme.com", "acme.io"]`            |
| `issuer`             | The provider's issuer URL, exactly as the provider states it             |
| `client_id`          | The client the company created at its provider                           |
| `client_secret`      | Encrypted with the app key. Use the `secret` getter to read it           |
| `client_secret_hint` | The secret's last four characters, for display                           |

The console connects one provider per organization. The table doesn't enforce that, so a second provider later is another row.

## The redirect URI

```
https://<console host>/sign-in/callback/<organization slug>
```

`organization.signInCallbackUrl()` builds it. The company registers this one URL at its provider, for every environment. The route itself comes with the sign-in step.

- **It is on the console host,** not an issuer host, so one URL covers development, staging and production.
- **The organization's slug is in the path,** so every provider has its own redirect URI. That is how a client that talks to several providers tells their answers apart when the provider doesn't say who it is (RFC 9700 §4.4.2).
- **`google` and `microsoft` can't be organization slugs** (`app/validators/user.ts`). They are kept for the callbacks of shared provider apps.

## In the console

| URL                                                  | Page                                                                  | Controller                           |
| ---------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `/w/:org/settings/identity-providers`                | **Authentication**: the provider's details, or that none is connected | `IdentityProvidersController.index`  |
| `/w/:org/settings/identity-providers/create`         | Connect: domains, issuer URL, client ID and secret                    | `IdentityProvidersController.create` |
| `/w/:org/settings/identity-providers/:provider/edit` | Edit them                                                             | `IdentityProvidersController.edit`   |

It is a resource (`router.resource('identity-providers', …)`, without `show`), so a provider's ID is in its URLs. Another organization's ID is a 404.

- **Email domains** are entered one per line, between 1 and 20. Commas and spaces work too, a leading `@` is dropped, and duplicates collapse (`app/validators/rules/email_domain_list.ts`).
- **The client secret is never sent back to the console,** only its last four characters. When editing, a blank secret keeps the current one.
- **Removing** asks first, then deletes the row.

## Checking the issuer URL

Saving fetches `<issuer>/.well-known/openid-configuration` and refuses the form unless the provider answers for that URL (`ProviderDiscoveryService`, through the `discoverableIssuer` rule):

- the document must have `authorization_endpoint`, `token_endpoint` and `jwks_uri`;
- its `issuer` must equal the URL typed, character for character. Tokens carry that value, so a near match would only fail later, at sign-in. The error names the URL the provider uses.

**The URL comes from a form, so the fetch is locked down.** Without this, the form would be a way to reach our own network.

| Rule                                                | Why                                                             |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `https` only                                        | Nothing else is a provider                                      |
| Every address the host resolves to is public        | Private, loopback and link-local addresses are ours, not theirs |
| The connection goes to the address that was checked | A second DNS answer can't swap it after the check               |
| Redirects aren't followed                           | A redirect could point back inside                              |
| 5 seconds, 256 KB                                   | A discovery document is a few kilobytes                         |

`new ProviderDiscoveryService({ allowLocal: true })` accepts `http` and local addresses, for a provider running on the same machine in tests.

## Events

Each change dispatches an event with the provider and the user who made it. Nothing listens yet; the audit log will.

| Event                       | When                            |
| --------------------------- | ------------------------------- |
| `IdentityProviderConnected` | A provider is connected         |
| `IdentityProviderChanged`   | Its details are saved           |
| `IdentityProviderRemoved`   | It is removed (the row is gone) |

## Tests

- `tests/browser/console/identity_provider.spec.ts`: connecting, the secret staying encrypted and off the page, refused issuer URLs and domains, editing with and without a new secret, removing, one provider per organization, and another organization's provider being out of reach. It swaps the discovery service for `StubbedProviderDiscovery` (`tests/helpers/identity_providers.ts`), so no test touches the network.
- `tests/functional/identity_providers/provider_discovery.spec.ts`: the real service against a provider on this machine, and every address and URL it must refuse.
