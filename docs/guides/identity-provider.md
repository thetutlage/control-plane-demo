# Identity provider

A company's staff sign in with the company's own identity provider: Google Workspace, Microsoft Entra, Okta, or anything that speaks OpenID Connect. The organization connects it once, on the console's **Authentication** page, and every environment uses it.

Once a provider is connected, the sign-in page offers it above the password form ([Member login](member-login.md)). The model and its rules are in [the plan](../plan.md), under "Sign-in".

## Columns

`identity_providers`, one row per organization:

| Column               | Notes                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| `kind`               | `IdentityProviderKind`: OIDC 0, the company's own client at its provider |
| `issuer`             | The provider's issuer URL, exactly as the provider states it             |
| `client_id`          | The client the company created at its provider                           |
| `client_secret`      | Encrypted with the app key. Use the `secret` getter to read it           |
| `client_secret_hint` | The secret's last four characters, for display                           |

The console connects one provider per organization. The table doesn't enforce that, so a second provider later is another row.

The provider can vouch for anyone, whatever their email. There is no list of email domains: Okta and Entra hold people on outside emails, such as contractors, and that is the company's choice. Who it may sign in is decided per member, by an admin ([Who signs in with it](#who-signs-in-with-it)).

The console page is called **Authentication**, in the sidebar under Environments. The provider must be reachable from the internet: one behind a company's firewall can't be connected.

## The redirect URI

```
https://<console host>/sign-in/callback/<organization slug>
```

`organization.signInCallbackUrl()` builds it. The company registers this one URL at its provider, for every environment.

- **It is on the console host,** not an issuer host, so one URL covers development, staging and production.
- **The organization's slug is in the path,** so every provider has its own redirect URI. That is how a client that talks to several providers tells their answers apart when the provider doesn't say who it is (RFC 9700 §4.4.2).
- **`google` and `microsoft` can't be organization slugs** (`app/validators/user.ts`). They are kept for the callbacks of shared provider apps.

## In the console

| URL                                                  | Page                                                                  | Controller                           |
| ---------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `/w/:org/settings/identity-providers`                | **Authentication**: the provider's details, or that none is connected | `IdentityProvidersController.index`  |
| `/w/:org/settings/identity-providers/create`         | Connect: issuer URL, client ID and secret                             | `IdentityProvidersController.create` |
| `/w/:org/settings/identity-providers/:provider/edit` | Edit them                                                             | `IdentityProvidersController.edit`   |

It is a resource (`router.resource('identity-providers', …)`, without `show`), so a provider's ID is in its URLs. Another organization's ID is a 404.

- **The client secret is never sent back to the console,** only its last four characters. When editing, a blank secret keeps the current one.
- **Removing** asks first, then deletes the row.

## Checking the issuer URL

Saving fetches `<issuer>/.well-known/openid-configuration` and refuses the form unless the provider answers for that URL (`ProviderDiscoveryService`, through the `discoverableIssuer` rule):

- the document must have `authorization_endpoint`, `token_endpoint` and `jwks_uri`;
- its `issuer` must equal the URL typed, character for character. Tokens carry that value, so a near match would only fail later, at sign-in. The error names the URL the provider uses.

## Requests to a provider

Every request to a provider goes through `ProviderRequestService` (`get`, `postForm`): its configuration, its signing keys and its token endpoint. None of those URLs is ours. An admin types the issuer URL, and the provider's configuration names the rest, so each one is locked down. Without this, they would be a way to reach our own network.

| Rule                                                | Why                                                             |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `https` only                                        | Nothing else is a provider                                      |
| Every address the host resolves to is public        | Private, loopback and link-local addresses are ours, not theirs |
| The connection goes to the address that was checked | A second DNS answer can't swap it after the check               |
| Redirects aren't followed                           | A redirect could point back inside                              |
| 5 seconds, 256 KB                                   | A provider's documents are a few kilobytes                      |

`new ProviderRequestService({ allowLocal: true })` accepts `http` and local addresses, for a provider running on the same machine in tests.

## Signing in

```
Sign-in page   → POST acme--staging.<domain>/sign-in/<signInId>/provider
               → the provider: its own password and MFA
The provider   → GET <domain>/sign-in/callback/acme?code=…&state=…
               → GET acme--staging.<domain>/sign-in/<signInId>/provider/callback?code=…&state=…
               → /oauth/auth/<signInId>, and on to the app, as after a password
```

| Route                                      | Host    | Controller                       | Does                                                        |
| ------------------------------------------ | ------- | -------------------------------- | ----------------------------------------------------------- |
| `POST /sign-in/:signInId/provider`         | issuer  | `RedirectToProviderController`   | Sends the member to the provider                            |
| `GET /sign-in/callback/:org`               | console | `SignInCallbacksController.show` | Forwards the provider's answer to the issuer host           |
| `GET /sign-in/:signInId/provider/callback` | issuer  | `SignInWithProviderController`   | Verifies the answer, finds the member, finishes the sign-in |

The two issuer routes are single-action controllers (`handle`), named after what they do. Their route names are `redirect_to_provider` and `sign_in_with_provider`.

**Why three.** The redirect URI must be one fixed URL, but the cookies that finish a sign-in belong to one environment's issuer host. `oidc-provider` limits its sign-in cookie to paths under `/sign-in/<signInId>`, so both issuer routes live there.

**The `state`** is signed (`encryption.getMessageVerifier()`, purpose `provider_sign_in`, 10 minutes) and names the environment and the sign-in. It does two jobs:

- the console host's callback reads it to know where to forward. It checks the signature, and that the environment belongs to the organization in the path, then builds the target from our own records. It passes on only `code`, `state`, `error`, `error_description` and `iss`.
- Ally keeps a copy in an encrypted cookie on the issuer host and compares the two when the member comes back, so an answer only works in the browser that asked.

**Redirects here always use `.withQs(false)`.** `config/app.ts` makes every redirect carry the request's query string along, which would pass on parameters the callback is meant to drop, and leak the code into the next URL.

### The driver

`OidcDriver` (`app/identity_providers/oidc_driver.ts`) is an `@adonisjs/ally` driver for any OpenID Connect provider. It is created per request from the organization's provider row, not from `config/ally.ts`.

| Part                                                               | Who does it                                                                   |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| The redirect, `state` and PKCE (S256), each in an encrypted cookie | Ally                                                                          |
| The code exchange                                                  | Ally, sending through `ProviderRequestService` instead of its own HTTP client |
| A `nonce`, in its own encrypted cookie                             | The driver                                                                    |
| Verifying the ID token                                             | `verifyIdToken` (`app/identity_providers/id_token.ts`), with `jose`           |

`verifyIdToken` makes the checks OpenID Connect Core §3.1.3.7 asks of every client, the same for every provider: signed with one of the provider's published keys, issued by the provider we sent the member to, meant for our client, not expired, and carrying this browser's nonce. Only asymmetric algorithms are accepted, so a token "signed" with `none` or with our own client secret is refused.

It returns the member's permanent ID (`sub`), their email in lowercase, the name, and whether the provider calls the email verified: `true`, `false`, or `null` when it doesn't say, as Entra never does. The provider's userinfo endpoint is never called.

A sign-in makes four requests to the provider: its configuration twice (leaving and coming back), its keys, and the code exchange. Nothing is cached.

**Ally and Inertia.** Ally 6.3.1 lists Inertia 4 as an optional peer, and this app runs Inertia 5. It only calls `inertia.requestInfo()` and `inertia.location()`, which Inertia 5 has, so `package.json` has an `overrides` entry pointing Ally at the installed Inertia. Remove it once Ally's peer range includes Inertia 5.

### Finding the member

`member_identities` ties a member to the provider's permanent ID for them (`subject`). A member has one identity per provider, and an ID belongs to one member. `ProviderSignInService.admit()` decides:

| What the provider says                                                | Result                                                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| An ID we know                                                         | That member. Their name and email follow the provider's, unless another member has the email                                 |
| A new ID, the email of a member set to the provider, with no identity | Tied to that member. An invited member becomes active                                                                        |
| A new ID, an email nobody has                                         | Refused, unless the provider admits newcomers. Then: a new active member set to the provider, with no password and no access |
| A new ID, the email of a member tied to another ID                    | Refused: the address may have gone to a new person                                                                           |
| A member set to a password                                            | Refused. Their setting doesn't change                                                                                        |
| No email, or `email_verified: false`                                  | Refused                                                                                                                      |
| A suspended member                                                    | Refused                                                                                                                      |

- **Email is used once,** to pick up a member an admin had already added. After that only the ID counts.
- **Every refusal shows the same page,** "We couldn't sign you in", with `sign_in_refused`. The reason goes to the log (`ProviderSignInException`) and to an event.
- **Cancelling at the provider** returns to the sign-in page with "Sign-in was cancelled".
- **A provider that can't be reached** shows "We couldn't reach your company's sign-in".

## Who signs in with it

Each member has a setting, `members.sign_in_method` (`MemberSignInMethod`: PASSWORD 0, PROVIDER 1). **An admin sets it, and only an admin's action changes it.** The way that isn't theirs is refused: the password form refuses a provider member, and the provider refuses a password member. Without a provider connected, everyone is on a password.

| Where the admin sets it                                              | Route                                                   | Controller                          |
| -------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| Adding a member: a choice, shown when a provider is connected        | `POST /w/:org/members`                                  | `MembersController.store`           |
| Who signs in with the provider? Members still on a password, to tick | `GET …/identity-providers/:provider/members/create`     | `ProviderMembersController.create`  |
| Switching the ticked members, or one from their page                 | `POST …/identity-providers/:provider/members`           | `ProviderMembersController.store`   |
| Switching one member back to a password, from their page             | `DELETE …/identity-providers/:provider/members/:member` | `ProviderMembersController.destroy` |

- **Connecting a provider changes nobody.** It lands on the "who signs in with it?" page, and the Authentication page keeps a count of members still on a password with a link back to it.
- **Switching a member signs them out everywhere** (`member.signInWith()`), so the way they signed in before stops counting right away.
- **Each switch emails the member** how they sign in now. One switched to a password gets a link to set it ([Passwords and email](passwords.md)); until they do, their page says they have none.
- **People the provider lets through whom no admin added** are refused. The provider's edit form has "People my provider lets through can join without being added" (`identity_providers.admits_newcomers`), off by default.
- **Changing the issuer URL** means a different provider, whose IDs mean nothing to the old one's. The edit form asks to confirm ("I'm replacing the provider") when members are tied to it, then clears the ties. Members stay set to the provider and are matched by email again at their next sign-in.
- **Removing the provider** switches its members to a password, signs them out and emails each a link to set one. The confirmation says how many.

## A member's account at the provider

A member's page shows **Account at your identity provider** once a provider is connected and they are set to it. Nothing is fetched from the provider: every value is written when the member signs in through it (`ProviderSignInService`), into `member_identities`.

| Shown                 | Column              | Notes                                                                                                      |
| --------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| ID at the provider    | `subject`           | What the member is recognised by                                                                           |
| How they joined       | `origin`            | `MemberIdentityOrigin`: MATCHED_BY_EMAIL 0 (an admin added them), JOINED 1 (the provider admits newcomers) |
| First signed in       | `created_at`        |                                                                                                            |
| Last signed in        | `last_signed_in_at` |                                                                                                            |
| Email at the provider | `email`             | Shown only when it differs from the member's, which happens when another member already has that email     |

Before their first sign-in, the panel says they will be matched by email.

**Dissociate this account** (`DELETE /w/:org/members/:member/identities/:identity`, `MemberIdentitiesController.destroy`) deletes that one member's row and signs them out everywhere. They stay a member set to the provider, with the same roles, and their next sign-in is matched by email again. It is for an account that was deleted and recreated at the provider: the new ID is refused because the email is tied to the old one. The confirmation says that whoever the provider next sends with that email becomes this member. Nobody else is affected.

Once dissociated, the page reads as if the member had never signed in. That an admin did it is only in the `MemberIdentityDissociated` event, for the audit log.

## The daily re-check

A sign-in through the provider counts for a day (`PROVIDER_RECHECK` in `app/oidc/create_provider.ts`). Someone disabled at the provider loses every app within that long.

- **The session is marked** as signed in through the provider: `amr: ['provider']`, the standard field for how someone authenticated.
- **Its grants last a day, not 14** (`ttl.Grant`). The app's refresh then fails and it sends the member back to the issuer.
- **The issuer asks the provider again** when that sign-in is over a day old: a check added to `oidc-provider`'s own sign-in rules (`signInPolicy`, reason `provider_recheck`). Without it, the issuer's 30-day session would let them straight through.
- **The member isn't asked to click.** The sign-in page sends them back through the provider by itself (`providerRecheck`). If they are still signed in there, they see a redirect and nothing else. Not after an error such as cancelling, which would send them round again.
- **A member who signs in with a password** is untouched: 14 days, as before.

## Trying it with Google Workspace on your machine

Google accepts `http://localhost` redirect URIs, so a real Workspace works against the dev server.

1. In Google Cloud, in a project under your Workspace organization, set the OAuth consent screen's user type to **Internal**.
2. Create an OAuth client of type **Web application**, with the redirect URI the Authentication page shows: `http://localhost:3333/sign-in/callback/<organization slug>`.
3. Connect it on the Authentication page: issuer `https://accounts.google.com`, the client ID and the secret.
4. Add yourself as a member set to your identity provider, with a role on an app. Or tick "People my provider lets through can join without being added", sign in, and give yourself a role after.
5. Open the app and choose **Continue with your company account**.

When a sign-in is refused, the reason is in the server log, on a line starting "Sign-in through the identity provider failed".

## Events

Each change dispatches an event with the provider and the user who made it. Nothing listens yet; the audit log will.

| Event                        | When                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `IdentityProviderConnected`  | A provider is connected                                                                                      |
| `IdentityProviderChanged`    | Its details are saved                                                                                        |
| `IdentityProviderRemoved`    | It is removed (the row is gone)                                                                              |
| `MemberSignedInWithProvider` | A member signed in through it: `returning`, `matched_by_email` or `created`                                  |
| `ProviderSignInRefused`      | Someone the provider let through wasn't signed in, with the reason and email                                 |
| `MemberIdentityDissociated`  | An admin dissociated a member from their account at the provider, with the ID that was removed               |
| `MemberSignInMethodChanged`  | An admin changed how a member signs in: on the page above, on the member's page, or by removing the provider |

## Tests

- `tests/browser/console/identity_provider.spec.ts`: connecting, the secret staying encrypted and off the page, refused issuer URLs, editing with and without a new secret, removing, one provider per organization, and another organization's provider being out of reach. It swaps the discovery service for `StubbedProviderDiscovery` (`tests/helpers/identity_providers.ts`), so no test touches the network.
- `tests/functional/identity_providers/provider_discovery.spec.ts`: the real service against a provider on this machine, and every address and URL it must refuse.
- `tests/functional/identity_providers/provider_request.spec.ts`: posting to a token endpoint, and the URLs a post must refuse.
- `tests/browser/oidc/provider_sign_in.spec.ts`: the whole round trip against a real OpenID Connect provider running on the same machine (`setupOrganizationProvider` in `tests/helpers/fake_provider.ts`): each row of the table above, cancelling, a tampered `state`, another organization's path, and an answer opened in another browser.
- `tests/browser/console/provider_members.spec.ts`: connecting changing nobody, switching members over and back, being signed out on a switch, the choice when adding a member, the newcomers setting, replacing and removing the provider, and another organization's members being out of reach.
- `tests/browser/console/member_identity.spec.ts`: what the member's page shows before and after a sign-in, and dissociating a member whose account was recreated so they can sign in again.
- `tests/browser/oidc/provider_recheck.spec.ts`: a day's tokens for a provider sign-in and 14 for a password, being let through within a day and sent back through the provider after it, and someone the provider turns away not being signed in again.
- `tests/functional/identity_providers/id_token.spec.ts`: tokens signed with a key made in the test: one that holds up, and one refused for each check.
