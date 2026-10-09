# Control Plane: Goals and Plan

_Status: draft, 2026-10-02. Milestone 0 in progress: the schema is in place, and the models, signup, and console are being reworked step by step._

## 1. What we are building

A **central identity and governance server for a company's internal apps**. A company registers its apps, adds its staff, and gives each person roles per app. Staff sign in once through the control plane and use every internal app from there. Every action is recorded in an audit log. Later, AI agents get identities of their own under the same rules.

In standard terms it is three things:

| Part     | Industry term                                                                    | Answers                                                            |
| -------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Identity | OpenID Connect (OIDC) identity provider                                          | Who is this?                                                       |
| Access   | Catalogue sync, typed `can()`, roles; invites with roles; a default role per app | Access reviews, expiring grants, a "who has access to what" report |
| Audit    | Append-only event log                                                            | Who did what, when, and in which app?                              |

The **SDK** is how apps use all three. It is the product surface. The control plane UI is the admin console.

It is a **hosted, multi-tenant service**. Each company is a tenant (an _organization_), and its data, signing keys, and login domain are isolated from other tenants.

### Non-goals for v1

- Permissions on individual records (for example, "editor of project X"). This becomes a relationship-based authorization system like Google Zanzibar, which is a separate product. Permissions are **static**: an app declares them, and admins combine them into roles. Apps handle record-level checks themselves.
- Directory sync (SCIM) and SAML. Upstream sign-in over OIDC is in Release 1 (see §6).
- Billing, customer-facing (B2C) identity, and social login for end customers.

## 2. Design principles

1. **Use standard protocols, not invented ones.** Apps sign members in with OIDC Authorization Code + PKCE. Any framework or off-the-shelf OIDC client works, and the SDK is a convenience layer on top, not a requirement.
2. **The request path never calls the control plane.** This principle is what keeps the SDK fast.
   - Access tokens are short-lived signed JWTs that carry the member's roles and permissions.
   - The SDK verifies them locally against cached signing keys (JWKS). An auth plus permission check costs microseconds and needs no network call.
   - The cost is revocation lag. Tokens last about 5 minutes, refresh tokens rotate on every use, and an optional revocation push (webhook or server-sent events) lets apps drop sessions immediately.
3. **Audit writes never block an app.** The SDK buffers events and sends them in batches in the background. The server accepts them with one bulk insert.
4. **"Actor" is a first-class concept from day one.** Whoever holds a role or appears in an audit entry is an _actor_: a member, an app (machine-to-machine), or later an agent. Adding agents must not require reworking the schema.
5. **The control plane audits itself.** Every admin change (role granted, member suspended, secret rotated) creates an audit event automatically.

### Performance budgets

These are the targets we will benchmark against.

| Operation                                | Target                             |
| ---------------------------------------- | ---------------------------------- |
| SDK token verification and `can()` check | under 1 ms, no network call        |
| Login redirect round trip, server time   | p95 under 100 ms                   |
| Management API reads                     | p95 under 30 ms                    |
| Management API writes                    | p95 under 75 ms                    |
| Audit event emitted from an app          | non-blocking, delivered within 5 s |
| Audit explorer query (1M rows, filtered) | p95 under 200 ms                   |

## 3. Core domain model

The tables in `database/migrations` are the source of truth. This section explains them.

```
── Organization level: everything that is created (shared by every environment) ──
User ── a control plane account: signs up and runs the console.
        email unique across all users; one account per person
UserOrg ── user ↔ organization (many-to-many). Signup creates one
           organization; more can be created later, with a switcher
Organization (tenant) ── name, slug (login subdomain)
Actor ── anything that holds roles or acts in audit events:
         member | app | agent
Member ── a person who signs in to the internal apps.
          email unique per organization
App ── an internal app: name, slug
PermissionCatalog ── the company's master catalogue (JSONB), hash,
                     git SHA, synced_at
Role ── a named set of catalogue keys (JSONB), can span apps
AuditEvent ── access, sign-in and configuration events (PostgreSQL),
              each with several subjects, tagged with the environment
              when one applies. See "Audit events"

── Environment level: runtime and access ──
Environment ── kind: development | staging | production
  Every row below carries organization_id AND environment_id, tied
  together by a composite foreign key to environments, and never
  references another environment.
  AppEnvironment ── the app in this environment: client_id, secret,
                    app_url, redirect_uris. Missing until the app
                    reaches this stage
  AppMember ── an actor's access to an app in this environment, with
               their first and last sign-in, and one or more roles
               (app_member_roles). No app member, no sign-in
  Sessions, grants, codes, refresh tokens ── oidc-provider's records
  SigningKey ── the keys this environment's issuer signs with
  Activity events ── (ClickHouse) what the organization's apps send
                     through the SDK
```

**Users and members are different people, or different roles of the same person.**

- **Users** run the control plane. One account per email. They belong to organizations through `user_orgs`, and are shown in a billing area later rather than in the main sidebar.
- **Members** sign in to the organization's internal apps. A person is one member across every environment, with one password. What they can sign in to is decided per environment, by access.
- A member of Acme can also sign up as a user with the same email and create their own organization.

**Everything is created once, for the organization. Environments decide where it runs and who gets in.** _Decided 2026-10-05, after two shorter-lived designs the same day (see below)._

- **Created once:** apps, members, the permission catalogue, and roles. Nobody needs "a development app" or "staging permissions": an app moves through development, staging and production, as a Vercel project or a Neon schema change does, and the same people, permissions and roles follow it.
- **Per environment:**
  - _the app's setup there:_ client ID, secret, app URL, redirect URIs. These genuinely differ: development runs on `localhost`, production on its own domain with a `cp_live_` secret. An app with no setup in an environment hasn't reached that stage;
  - _access:_ which roles each member holds on each app. A member with no role on an app can't sign in to it there. Beta testers get access in staging only. The same person can hold different roles in staging and in production;
  - _runtime:_ the issuer and its signing keys, sessions, grants and tokens, and audit events.
- **Changing a definition changes it everywhere at once.** That is safe for the catalogue, because tokens are built from roles, not filtered through the catalogue (see "Permission catalogue"): removing a key revokes nothing. Editing a role does change access in every environment at once. To try a role change in staging first, create a new role, assign it in staging, then move production's assignments to it.
- **One member, one password, everywhere.** Credentials are only ever typed on our sign-in page, never into an app, so a development app sees no more than a production one. Suspending a member signs them out of every app in every environment.

**Two designs this replaced, both on 2026-10-05.** _Full isolation_ (members, apps, catalogue and roles all per environment, as WorkOS and Clerk do) made every app, role and person exist up to three times, although none of them is really per environment. A _per-page environment filter_ over shared apps (closer to Retool and Appsmith) left pages mixing environments. The research on both still holds: repeating setup per environment is the common complaint about identity products, and editors unsure which environment they are in is the common complaint about low-code platforms. This design shares what is defined, and keeps what runs and who gets in per environment, always labelled with the environment.

**The console has no global environment switcher.** Apps, members, permissions and roles are organization pages. Environments appear only where something differs per environment: as tabs on an app's page (that environment's setup, and its members with their roles), and as sections on a member's page (their access in each environment). Environments are always shown as colored badges.

### Multi-tenancy rules

- **Isolation is enforced in one place.** Every environment table (app setups, access, sign-in records, keys) has `organization_id` and `environment_id`, so data can also be found across a whole organization. Console requests resolve the organization and environment once, and controllers only read through them. Composite foreign keys make links across environments impossible in the database itself. Tests try to read across tenants and across environments, and both attempts must fail.
- **Each environment gets its own OIDC issuer**, for example `https://acme.<our-domain>/oauth` for prod and `https://acme--staging.<our-domain>/oauth` for staging. Each issuer has its own discovery document, JWKS, and signing keys. A token issued for one tenant or environment fails verification in any other because both `iss` and the key differ. The SDK checks `iss` and audience against the environment it is configured for. Issuers are subdomains of the console URL (`APP_URL`). Organization and environment slugs cannot be renamed, because they are part of every app's issuer URL. Custom domains (`login.acme.com`) come later and are production only.
- **Each environment has its own app credentials, and the key prefix shows which one:** `cp_test_…` for dev and staging, `cp_live_…` for prod. A staging secret cannot sign anyone in to production.
- **Dev and staging are relaxed but clearly labelled.** They allow `http://localhost` redirects, keep keys viewable, show a console banner, and add a `[STAGING]` prefix to emails. Production requires https, shows secrets once, and applies production rate limits.
- **Access is never copied between environments automatically.** Granting production access because someone has staging access would create surprise access. Later, an explicit and audited "copy access from environment X" action could cover the need. A new environment can clone _settings_ (branding, session lifetimes, MFA policy) from an existing one, but never secrets.
- **Two levels of admin:** _platform operators_ (us, with a separate guard and console) and the organization's _users_.
- **Rate limits apply per tenant**, so one busy company cannot slow down the others.

### Permission catalogue

The company keeps **one master catalogue of its permissions in one repo** (for example, an `access` repo). The company models its permissions once, and apps get built around them. The research behind this is summarised below.

```ts
// the company's access repo: permissions.ts
export default defineCatalog({
  'billing:invoice.read': { description: 'View invoices' },
  'billing:invoice.refund': { description: 'Refund an invoice' },
  'hr:employee.read': { description: 'View employee records' },
  'company:pii.view': { description: 'See personal data of customers' },
})
```

- **Sync:** `await controlPlane.catalog.sync(catalog)` runs from that repo's CI, with an organization-level key. Because only one repo writes the catalogue, syncs never clobber each other.
- **One catalogue for the organization,** in `permission_catalogs`, used by every environment.
- **Sync is declarative and idempotent.** An unchanged catalogue costs one cheap request (the hash matches), and every sync returns a diff (added, changed, removed).
- **Sync never rejects a change, and never revokes anything.** Tokens carry the keys of the member's roles (with aliases resolved), **not filtered through the catalogue**. Removing a key from the catalogue only removes it from the role editor, and the console flags roles that still list it. _Do not change this in a refactor._ The catalogue is one for the organization and syncs when the access repo merges, but each environment runs its own version of an app. Say `billing:invoice.void` is removed and synced today, development's Invoices has stopped using it, and production's Invoices still checks it on the Void button until next week's deploy. Filtering tokens would stop everyone in production voiding invoices from the moment of the merge, an outage in an app nobody deployed. Unfiltered, a removed key keeps travelling in tokens until someone takes it off the roles, which is harmless once no code checks it. `tests/browser/oidc/tokens.spec.ts` guards this ("a key missing from the catalogue stays in the token").
- **`inactive` is the deliberate off switch** _(decided 2026-10-06, built with catalogue sync)_. Marking a key inactive drops it from every token at the next refresh, in every environment: a conscious decision to stop granting it, as in the `@adonisplus/permissions` package. Removing a key is a clean-up; marking it inactive is a revocation.
- **Key naming is the company's choice.** We do not enforce namespaces. The docs recommend `<area>:<resource>.<action>`, as used by AWS (`s3:GetObject`), GCP, and Backstage, so that keys from different areas never collide.
- **Roles are built in the console** from the catalogue's keys, once for the organization. They are stored as a JSONB list of keys and can span apps (a "Finance" role covering Billing and Payroll).
- **Roles are assigned per app, per environment, and a member can hold several on one app.** A token for an app carries the union of the keys of the roles held on that app, in that environment. There are no roles made of other roles.
- **Types follow the app's own version of the catalogue.** An app compiles against the catalogue version it imports, so its types move through environments with its code.
- **The catalogue generates types**, so `member.can('billing:invoice.raed')` (misspelled) is a compile error in apps that import it.
- **Catalogue keys become agent capabilities.** The same catalogue, plus optional input constraints, is what agents request in M6.

**Several roles per member, not one.** _(Researched 2026-10-05.)_ The NIST RBAC model requires that a user can hold several roles at once; Auth0, Retool (whose groups are "always additive") and Keycloak allow it, with permissions combined as a union. WorkOS started with one role per membership and added multiple roles as an opt-in, because combined roles ("Approver + Viewer") multiplied. Clerk allows one role per membership, the usual convention in customer-facing SaaS rather than for staff. Keycloak also offers composite roles (roles made of roles), and its docs warn they make auditing harder, so we leave them out. Sources: [WorkOS multiple roles](https://workos.com/blog/multiple-roles), [Auth0 RBAC](https://auth0.com/docs/manage-users/access-control/rbac), [Retool permission groups](https://docs.retool.com/org-users/concepts/permission-groups), [Keycloak server administration](https://www.keycloak.org/docs/latest/server_admin/index.html), [Clerk roles](https://clerk.com/docs/guides/organizations/control-access/roles-and-permissions), [NIST RBAC model](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=916402).

**Why one master catalogue.** Roles modelled once for the whole company are common: Auth0 tenant roles, Keycloak composite roles, Entra access packages, AWS and GCP organization roles, and SailPoint business roles all work this way. Systems with one global catalogue (AWS, GCP, Backstage, Zanzibar) namespace their keys so that different areas never collide. Ownership of each area is usually handled by code review (for example, CODEOWNERS in the repo), which is the company's job rather than ours.

**How other products handle permissions** _(researched 2026-10-05)_. Assigning permissions is easy everywhere. Defining them and using them in code is where the work goes, and no product derives types from the permissions it syncs.

| Product  | Defining permissions                                                                                          | Using them in the app                                                                                                 | Assigning them                                                       | Type safety                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Retool   | No app permissions. Permission groups only control who can use, edit or own an app or resource                | Each component's Hidden or Disabled field checks a group by name: `current_user.groups.some(g => g.name === 'Admin')` | Users join groups by hand or through SSO group sync                  | None. Renaming a group breaks every check; a feature request asks for keys |
| Appsmith | Fixed platform actions (view, edit, create, delete) on apps, pages, queries and data sources. Enterprise only | Logic inside an app still checks the user's role or group                                                             | Roles go to users or groups                                          | None                                                                       |
| Okta     | No permission list. Groups, or custom scopes on a custom authorization server (a paid add-on)                 | A groups claim in the token, checked by group name                                                                    | By hand, by rule, or synced from AD or Workday                       | None. Finer-grained access is a separate product (Okta FGA)                |
| Auth0    | Per API, in the dashboard                                                                                     | "Add permissions in the access token", then string checks on the `permissions` claim                                  | Role → permissions, user → roles, in the dashboard                   | None                                                                       |
| WorkOS   | Dashboard, API, CLI, YAML seed file or Terraform                                                              | `role` and `permissions` claims in the access token, checked as strings                                               | Roles on organization memberships, or from the customer's IdP groups | None                                                                       |
| Clerk    | Dashboard: role → feature → permission (`org:invoices:create`)                                                | `has({ permission })`                                                                                                 | Roles to organization members                                        | A hand-written global `ClerkAuthorization` type, which can drift           |

- **Low-code platforms have no app permissions at all.** Retool and Appsmith govern the platform (who can view or edit an app), not what a user may do inside it. Inside an app, access is a group-name check repeated in each component's settings, invisible in review and broken by a rename. This is their weak spot for internal-app governance, and the one our catalogue fills.
- **Identity products make you define every permission twice:** once in a dashboard, again as strings in code, with nothing keeping them in step. A typo or rename fails silently as a denial.
- **Every environment repeats the setup.** Auth0 (a tenant per environment, synced with its Deploy CLI) and WorkOS (seed files, Terraform) fix that only with extra tooling.
- **What we do differently:** the catalogue is defined once in code, synced once from CI for every environment, and its types come from the same definition. `aliases` make renames safe. Assignment stays a console concern, as everywhere else.

Sources: [WorkOS RBAC](https://workos.com/docs/rbac/integration), [WorkOS permissions](https://workos.com/docs/reference/roles/permission), [Terraform provider for WorkOS](https://github.com/osodevops/terraform-provider-workos), [Retool current_user](https://docs.retool.com/permissions/guides/current-user), [Retool forum: groups by name](https://community.retool.com/t/hide-show-components-based-off-of-permission-group/1983), [Retool forum: keys instead of names](https://community.retool.com/t/ability-to-check-for-permission-group-using-keys-instead-of-group-name/39942), [Appsmith granular access control](https://docs.appsmith.com/advanced-concepts/granular-access-control), [Appsmith custom roles](https://docs.appsmith.com/advanced-concepts/granular-access-control/reference/custom-roles), [Okta groups claim](https://developer.okta.com/docs/guides/customize-tokens-groups-claim/main/), [Okta authorization servers](https://developer.okta.com/docs/concepts/auth-servers/), [Auth0 RBAC for APIs](https://auth0.com/docs/get-started/apis/enable-role-based-access-control-for-apis), [Auth0 role permissions](https://auth0.com/docs/manage-users/access-control/configure-core-rbac/roles/add-permissions-to-roles), [Clerk roles and permissions](https://clerk.com/docs/guides/organizations/control-access/roles-and-permissions), [Clerk custom types](https://clerk.com/docs/guides/development/override-clerk-types-interfaces).

### Sign-in

_Decided 2026-10-07; how a member signs in made an admin's choice 2026-10-08._

**The identity provider says who someone is. Backlit says what they can do.** The two are kept separate: no role or app access is ever derived from the provider's groups or attributes. Every role a member holds was given in Backlit, by a named person or by an app's default role.

**How a member signs in is set by an admin, and only ever changes when an admin changes it.** Each member has one setting, _the company's provider_ or _a password_, and the other way is refused for them. There is no "both": a member with both keeps a working password after being disabled at the provider. Slack and Notion offer the choice company-wide (required, required except guests, optional), never both per person.

| Signs in with          | Password form | Set or reset a password | The provider's button |
| ---------------------- | ------------- | ----------------------- | --------------------- |
| The company's provider | Refused       | Not offered             | Signs them in         |
| A password             | Works         | Offered                 | Refused               |

Where an admin sets it:

- **Adding a member:** the admin picks one. With no provider connected it is a password, and the choice isn't shown. The member sets their own password from an email; the admin never types one.
- **On a member's page:** for that member.
- **Right after connecting a provider:** the last step asks "Who signs in with it? Everyone, or I'll choose". Connecting alone changes nobody, so a mistake in the setup locks nobody out.
- **On the Authentication page, later:** how many members still sign in with a password, and an action to switch the ones selected.

What follows, with nothing changing a member's setting except an admin's action or a confirmation the admin accepts:

- **A provider member's first sign-in** ties them to their provider ID. Their setting was already the provider.
- **Removing the provider** says how many members sign in with it; confirming switches them to a password and emails them to set one (the email from step 4).
- **Replacing the provider** keeps members on the provider and clears their ties, since the old provider's IDs mean nothing to the new one. Each is matched by email again at their next sign-in. Changing the issuer URL asks for the same confirmation.
- **People the provider lets through whom no admin added** are refused, unless the admin turns on "People my provider lets through can join without being added". Then a first sign-in creates them, set to the provider, with no access.

_An earlier version tied a member to the provider on their first provider sign-in and switched them then. It left anyone who never used the button with a working password, and it changed a member's setting without an admin deciding._

- **One identity provider per organization,** connected over OIDC with the company's own client at its own provider (issuer URL, client ID, secret). Whatever that provider says is authoritative, because it is the company's own tenant. A shared "Sign in with Google" client is not used for members: it would mean trusting an email from a provider that may not own the domain.
- **The provider belongs to the organization,** like members do. The company registers one redirect URI, on the console host: `https://<domain>/sign-in/callback/<org slug>`. That URL only forwards the browser to the environment's issuer host that started the sign-in, which holds the session and exchanges the code. One central URL is what a shared Google or Microsoft client needs later (they allow no wildcards), and a URL per provider is the mix-up defence RFC 9700 asks for when the provider doesn't send `iss`.
- **The provider can vouch for anyone, whatever their email.** _(Researched 2026-10-08.)_ Google Workspace accounts are always on the company's domains, but Okta ties users to no domain (an admin can add `designer@gmail.com`) and Entra has guests with outside emails. Putting contractors in the provider is how IT keeps one place to cut access, so we don't hold a list of email domains. Whether such a person may join without being added is the admin's setting above.
- **Why WorkOS's domain rule doesn't apply.** WorkOS rejects a profile whose email isn't on a domain the organization has proven it owns, because the products built on it keep one user per email across all their customers: Foo's admin could create `sara@bar.com` in Foo's provider and sign in as Bar's Sara. Our members belong to one organization, sign in on that organization's issuer host, and are only looked up among its members, so a provider can only ever vouch for its own company's members. **The rule becomes necessary the day anything joins people across organizations by email.** Console users are already global by email, so they must never sign in through an organization's own provider.
- **The sign-in page shows the provider's button above the password form.** There is no email-first step; each form refuses the members set to the other. An organization with no provider has only the password form.
- **Members are found by the provider's ID, never by email.** The first match is by email; after that the member is pinned to the provider's `sub`, which never changes. The token must carry an email, and is refused only when the provider says it is unverified: Okta sends that flag, Entra has none and calls its email claim "not guaranteed to be correct", so requiring it would lock Entra out. Inside a company the email is a field an admin sets, and the exposure is narrow: someone able to change their own email to a colleague's, before that colleague's first sign-in, would get the roles waiting for them. A first sign-in matched by email is recorded for the audit log.
- **Provider members are re-checked with the provider daily:** their grants last a day instead of 14, so apps send them back through the provider, silently if they are still signed in there. SCIM (Release 2) makes it immediate.
- **Why no rules from provider attributes.** Providers hold organizational groups (Finance, Engineering), not "Approver on Invoices". Exact mapping needs IT to keep one group per app role, and mixing rules with manual changes has no clean answer: either a rule silently undoes an admin's change, or a rule-given role can't be taken from one person. Our buyer is the engineering lead, who often doesn't run the provider. Group mapping is a Release 2 opt-in if deals ask.
- **Why one provider.** Companies with two office suites usually sign in through one; a second provider mostly arrives with an acquisition. No public data covers companies of 50 to 500 people, so ask prospects: "Where do your staff sign in today, and is there anyone who signs in somewhere else?" The table has no one-per-organization rule and the console's URLs carry the provider's ID, so a second provider later is another row, not a redesign.
- **One provider for every environment.** _(Researched 2026-10-08.)_ The provider answers "is this Sara from Acme?", which is the same in staging and production; what differs per environment is access, and that is already separate. Some larger companies run a second copy of their provider for testing (Okta sells a "Preview Sandbox"), and WorkOS scopes connections to one environment, which is the repeated setup we set out to avoid. If a deal needs it, a provider can later be limited to chosen environments, with its own redirect URI (`/sign-in/callback/acme/preview`).
- **The provider must be reachable from the internet.** After the member signs in, our server calls the provider for the result, and it refuses private addresses (rule 8). Google Workspace, Entra and Okta always are. A company running its own provider behind a firewall has to expose it or wait for a self-hosted Backlit, which the plan sets aside.
- **Signing out here doesn't sign the member out of the provider.** Sign-out ends our session and every app's tokens in that browser. The provider's own session stays, so the button signs them straight back in while it lasts. _Decided 2026-10-08: this is fine as it is. Sending them through the provider's sign-out too was the alternative; Okta, Entra and Google differ on supporting it._
- **A day between re-checks, fixed for now.** A setting for it comes with session length per app (Release 2).
- **The console page is called Authentication,** not "Sign-in", which read as the page where members sign in, and not "Identity provider", since the page will also hold session lengths and the second factor for password members. Clerk and WorkOS use the same word.
- **Built on `@adonisjs/ally`,** (`^6.3.1`; npm's `latest` tag points at the AdonisJS 6 line) with one generic OIDC driver that adds discovery and ID token verification, created per request from the organization's provider. Chosen over `openid-client`: the flow stays in AdonisJS idiom, Ally already does the redirect, state, PKCE and code exchange, and its Google driver serves console users later. What Ally lacks for OpenID Connect is small and ours: reading the provider's configuration, a nonce, and verifying the ID token with `jose`. Its HTTP client is replaced with ours, so every request to a provider gets rule 8. TOTP comes from the flow's two-factor pack (`withTotpManagement` on `Member`).
- **Routes that aren't a resource are single-action controllers named after what they do:** `RedirectToProviderController` and `SignInWithProviderController`. Everything else is a resource with the seven methods (`IdentityProvidersController`, `ProviderMembersController`).

**Rules the sign-in must follow** _(researched 2026-10-07; check each one off in the guide when its step is built)_

1. **A redirect URI per provider.** RFC 9700 §4.4.2: a client that talks to several providers MUST prevent mix-up, by checking the `iss` response parameter (RFC 9207) or by using a distinct redirect URI per issuer, and MUST store the issuer each request went to, bound to the browser. Google's discovery document advertises `iss`; Microsoft's and Okta's don't. So the path carries the provider (`/sign-in/callback/acme`, later `/sign-in/callback/google`), the callback checks it against the stored issuer, and `iss` is checked too when present.
2. **The forwarding URL is not an open redirector** (RFC 9700 §2.1). It forwards only to an issuer host of ours, found from the organization in the path and the signed `state`, never to a URL from the query string.
3. **`state`, `nonce` and PKCE, all three.** RFC 9700 §4.7.1 lets PKCE stand in for `state` only when the provider is known to support it, and Microsoft's discovery document doesn't say. The PKCE verifier and the nonce never leave the issuer host's session, so a code seen in transit can't be redeemed.
4. **Verify the ID token:** signature against the provider's keys, `iss`, `aud`, `exp`, `nonce`. Ally doesn't; the driver does it with `jose`.
5. **Identify by `sub`, never by email.** Google: "you shouldn't use the `email` field in the ID token as a unique identifier". Microsoft: "Never use claims like `email`, `preferred_username` or `unique_name`" for access; use `tid` + `oid`. Email is used once, to match an invited member on their first sign-in, and only when the provider says it is verified.
6. **Google, shared client:** the ID token's `hd` claim must equal one of the company's domains. The `hd` request parameter is only a hint ("client-side requests can be modified").
7. **Microsoft, shared client:** the token's `tid` must equal the tenant recorded when the admin approved the app. Email is trusted only when domain-owner verified (`xms_edov`); Microsoft removes unverified emails from tokens of new multi-tenant apps. Publisher verification (a Microsoft partner account) is needed for a consent screen that doesn't say "Unverified".
8. **Fetching a typed issuer URL is an SSRF risk** (OWASP): https only, every resolved address public, the connection bound to the address that was checked (DNS rebinding), no redirects, a short timeout, and outbound network rules where the host allows them.
9. **Callback responses** send `Referrer-Policy: no-referrer` and load nothing from other sites (RFC 9700 §4.2.4). Codes are in the URL, so request logs must not keep the query string of callback paths.
10. **For SOC 2:** it sets criteria, not architecture, so nothing here needs redesigning for it. What auditors will ask of this feature: secrets encrypted with rotatable keys (done through the encryption service), tenant isolation that is tested (done), and a record of every provider change and every sign-in, successful or refused (CC7.2). Emit events for those from step 1, so the audit milestone only has to store them.

**Steps:**

1. Sign-in settings in the console: the provider's details. _Built 2026-10-08 ([guide](guides/identity-provider.md)): rules 1 (the URL), 8 and the events of rule 10. The saved provider isn't used for sign-in yet._
2. The OIDC driver and the sign-in, creating the member on first sign-in. _Part A built 2026-10-08: the driver on Ally, requests to the provider (rule 8, now for every provider URL) and ID token verification (rule 4)._ _Part B built 2026-10-08: the three routes, the forwarding callback (rules 1, 2, 3 and 9) and finding the member (rule 5). Both the provider's button and the password form show until step 3. Not yet tried against a real provider._
3. How each member signs in, as the admin's setting: the choice when adding a member and on their page, switching members over when a provider is connected, the setting for people who weren't added, clearing ties when the provider is replaced, and the daily re-check. _Built 2026-10-08. Two things wait for mail (step 4): a member switched to a password, or left on one when the provider is removed, has no way to set a password yet._
4. Mail: the email a member sets their password from, password reset, and the notice a provider member gets. Removing a provider is finished here, since it emails the members it switches to a password. _Built 2026-10-08 ([guide](guides/passwords.md)), on `@adonisjs/mail` and persona's `withManagedPassword`. Left for housekeeping: a mail queue that survives a restart, and rate limits by IP on the password and reset forms._
5. On a member's page: their account at the provider, and "Reset sign-in link" for one tied to the wrong account. _Built 2026-10-08, as "Dissociate this account" ([guide](guides/identity-provider.md#a-members-account-at-the-provider)). Narrowed the same day. A member's page already says whether they have set a password and when they last signed in, so there is no separate list of waiting members. The page of refused sign-ins moved to the audit log, and the default role per app to the access work; see "Later"._
6. TOTP for members who sign in with a password. _Skipped for now (2026-10-08); password members sign in with a password alone until it is built._
7. Real providers (Google Workspace, Entra, Okta), with a setup guide for each. This settles which claims Entra needs configured (it sends no email for staff by default) and what sets Okta's `email_verified`.

Later, each its own step:

- **One-click Google and Microsoft,** through one Backlit app registered at each, in place of pasted credentials (rules 6 and 7). Needs their verification of us: a real domain, a privacy policy, and a Microsoft partner account. Okta stays on pasted credentials.
- **Console users signing in with Google,** from the flow's social-auth pack. Never through an organization's own provider (see the domain rule above).
- **The console page for refused sign-ins,** built on the audit log, where refusals are stored as `sign_in.refused`. A table of its own now would be duplicated then.
- **A default role per app,** with the access work around catalogue sync. Until then, someone who joins through "People my provider lets through can join without being added" has no access to any app until an admin gives them a role, and the setting says so.

### Audit events

_Designed 2026-10-09. Nothing is built yet._ It became urgent because access changes leave no record today: giving or removing app access, assigning roles, editing a role, rotating a secret and signing a member out everywhere write nothing, and the nine events from the sign-in work are dispatched with nothing listening.

**What an event is.** A named action, who did it, what it was about, and what changed. It is written once and never edited.

- **Named actions, not row diffs.** "Ada gave Sara the Approver role on Invoices", not "a row was inserted in `app_member_roles`". The Laravel and Rails audit packages mostly hook the ORM and store a diff; that answers a different question.
- **Several subjects per event.** A role assignment is about the member, the role, the app and the environment. A member's page, an app's page and a role's page then each show their own events from the same data. WorkOS (`targets`) and Okta (`target`) both use a list; Spatie's and `audited`'s single subject is the limit to avoid.
- **Everything known at the time is on the event:** the actor's name and email as they were, IP, browser, organization, environment, and the before and after. It reads without lookups and survives the member being deleted.
- **Refusals are events too:** a refused sign-in is as much a record as a successful one.
- **The ID and `occurred_at` are set when the event is created,** not when it is written. A retried write then carries the same IDs, so a store can drop duplicates. IDs are UUID version 7, which sort by creation time.

**Four categories,** taken from the action's name (`access.role_assigned`):

| Category      | What goes in it                                                                                                                 | Volume | Store      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- |
| Access        | Who can do what changed: app access, role assignments, a role's permissions, the sign-in method, a dissociated provider account | Small  | PostgreSQL |
| Sign-in       | Signed in, refused, signed out, password set or reset                                                                           | Small  | PostgreSQL |
| Configuration | Apps, environments, the identity provider, client secrets, signing keys                                                         | Small  | PostgreSQL |
| Activity      | What the company's own apps send through the SDK                                                                                | Large  | ClickHouse |

- **Why two stores.** The first three are read as "this member's events, newest first", an index lookup PostgreSQL answers in milliseconds at any size and ClickHouse is weakest at. They must never be lost, and an admin expects to see one the moment they make the change. Activity is the opposite: large, sent in batches, with no transaction of ours to join, and filtered and counted over long ranges. Google Cloud (Admin Activity against Data Access) and AWS CloudTrail (management against data events) make the same split.
- **No single list mixes all four.** Category tabs replace it, so nothing merges two stores by time.
- **Volumes are estimates,** for a 500-person customer: tens of access events a day, a few thousand sign-ins, 100,000 or more activity events.

**How events relate.** There are no links from one event to another. A member's page filtered to Access and Sign-in already reads as the story (refused, dissociated by an admin, signed in, matched by email). Shared IDs group the rest, as Okta does with `transaction.id` and its session IDs:

- the **scope's context**, such as the request's or job's ID, stamped on every event recorded through it;
- the **batch's ID** (one unit of work, such as removing a provider and switching each of its members);
- the **sign-in's ID**, tying "sent to the provider" to "refused" or "signed in".

Wide logs in Stripe's sense (one line per request, written at its end) don't carry over: an audit event is a fact at a moment and can't be widened later.

**A catalogue of actions.** Every action is declared once, in one file that reads top to bottom. `defineSubjects` gives a function per kind of thing that turns a value into a reference (`type`, `id`, `label`). `defineActions` lists the actions, each a plain function from whatever it needs to the event: its actor, its subjects, a sentence, and any data. `record` takes the parameters of the action it names, so a wrong name, a missing argument or a wrong type is a compile error.

```ts
const s = defineSubjects({
  user: (user: User) => ({ id: user.id, label: user.email }),
  member: (member: Member) => ({ id: member.id, label: member.email }),
  app: (app: App) => ({ id: app.id, label: app.name }),
})

const actions = defineActions({
  'access.role_assigned': (
    admin: User,
    member: Member,
    app: App,
    before: string[],
    after: string[]
  ) => ({
    actor: s.user(admin),
    subjects: [s.member(member), s.app(app)],
    summary: `${admin.email} changed the roles of ${member.email} on ${app.name}`,
    data: { before, after },
  }),
})

batch.record('access.role_assigned', admin, member, app, before, after)
```

- **The sentence is written by the action and stored as text.** There are no templates to render. It says what was true then, so it stays right after a rename or a deletion, and it can't be reworded or translated later.
- **The actor is passed like everything else,** and has the same shape as a subject. It has its own slot because "what did Ada do" and "what was done to Ada" are different questions. Null means the system did it.
- **An action can take two subjects of the same kind,** and leave one out with a condition.
- **`data` is free.** The console shows it as keys and values, the same for every action.
- **Tried and dropped:** a catalogue declaring subjects, data fields and a sentence template per action through builders (too much machinery), subjects keyed by kind (no two of the same kind), and actions as loose functions with no catalogue (nothing central to read).

**The module.** A separate package, with stores as providers, so PostgreSQL and ClickHouse are two implementations of one contract. Five units, each with one job:

| Unit          | Job                                                                  | Lifetime                    | Flush                                                         |
| ------------- | -------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------- |
| **Store**     | Writes and reads events in one database                              | The process                 |                                                               |
| **Queue**     | A writer that lives forever                                          | The process                 | Its own rules (a size, an interval, shutdown), or by hand     |
| **Collector** | A writer that has an end                                             | A request, a command, a job | By hand, by whoever knows the end                             |
| **Scope**     | Stamps events with its context and hands them to its writer          | Whatever its creator wants  | None of its own                                               |
| **Batch**     | Events that belong together, made from a scope, carrying its context | A sign-in, a transaction    | By hand, by whoever made it, optionally through a transaction |

```ts
// One for the process
const audit = new Scope(actions, new Queue(store), { pid: process.pid })

// One per request, flushed by the middleware when the request ends
const scope = audit.child(new Collector(store), { requestId: request.id() })
scope.record('sign_in.refused', app, email, member)

// Events that must be written with a change
const batch = scope.batch()
await db.transaction(async (trx) => {
  await appMember.syncRoles(roleIds, trx)
  batch.record('access.role_assigned', admin, member, app, before, after)
  await batch.flush({ client: trx })
})
```

- **A scope holds no events and never flushes a batch.** Its events can be spread over calls that outlive it by minutes or hours, so it can't know when a batch is done.
- **Only the queue has flushing rules.** A collector and a batch have no timer, so neither can keep itself alive.
- **A queue and a collector never throw from a flush.** They take a reporter, which is told the error and handed the events. Nobody awaits the queue's own writes, and a request that has done its work shouldn't fail on its log. The queue keeps the events for its next write; the collector lets go of them.
- **A batch does throw.** Flushed in a transaction, a swallowed failure would leave PostgreSQL with an aborted transaction that "commits" as a rollback, and the app thinking the change was saved.
- **A request scope uses a collector, not the queue,** or the queue outlives the request. This is guidance, not a rule.
- **The core knows nothing about transactions.** `flush(options)` passes its options to the store; the PostgreSQL store accepts a query client and does one multi-row insert on it. Lucid has no "before commit" hook (only `on('commit')` and `after('commit' | 'rollback')`), so nothing can attach itself to a transaction unasked.
- **Flushing last inside the transaction** avoids both failures WorkOS names: the change saved with no event, and an event for a change that rolled back.
- **Writers take the store when constructed.** A batch reaches it through its scope's writer.
- **Unflushed batches are not reported.** A batch is left unflushed legitimately whenever its transaction fails before the flush, so a warning would mostly be noise. To revisit if a forgotten flush ever bites.

**The PostgreSQL store** (`auditlogs/src/stores/lucid.ts`, migration 28).

- **Two tables.** `audit_events` has one row per event. `audit_event_refs` has one row per thing an event involves: the actor, then each subject. "Everything involving Sara, as actor or subject" is one index lookup there, and the `role` column narrows it to one side. A JSON array of subjects with a GIN index would be one table, but PostgreSQL can't read it newest-first from the index, so a busy member's page would slow as it grew.
- **Refs point at nothing.** The label is the record, and events outlive what they describe. Only the organization and environment are foreign keys, on the events table, so deleting an organization deletes its events.
- **The tenant comes from the scope's context.** The store is told which context keys have columns (`organizationId`, `environmentId`); the rest of the context is JSON. The core has no idea of tenants.
- **An event already stored is skipped with its refs,** so writing a batch again changes nothing.

**Stores only write. Reading is the app's.** Events are read through `organization.auditEvents` and `environment.auditEvents`, like everything else in the console, so a tenant can't be handed another's events. `AuditEvent` has two scopes: `involving(thing, role?)` and `page(limit, cursor?)`.

- **The event's ID is the order and the paging cursor.** Pages are newest first with no totals, since counting every match is what makes a log slow.
- **Tried and dropped:** a `query` method on the store contract, the same for every store. It was a small query language beside Lucid, nothing forced a caller to pass the organization, and the Laravel packages' drivers only write for the same reason. Activity events in ClickHouse get a reader of their own.

**In the control plane.** Access and configuration changes go through a batch flushed in the change's transaction, so a change can't exist without its record. Events with no transaction (a refused sign-in) go to the request's collector, written before the response. The event classes dispatched today are replaced by these calls.

- **The catalogue** is `app/audit/actions.ts`, and the store `app/audit/store.ts`.
- **`AuditMiddleware`** gives every routed request a scope on `ctx.audit`, with the request's ID, IP and browser, and flushes its collector when the request ends. No `try/finally` is needed: the framework catches an error at each level of the middleware stack, so `next()` returns even when the handler threw. The organization, environment and issuer middleware add the tenant with `audit.with()`.
- **Events the collector can't write are logged in full** by the reporter, to be put back by hand. The request still succeeds.
- **There is no process-wide scope and no queue here,** since nothing in the control plane may take the path that can lose events. Commands and jobs build a scope of their own when the first one needs it.
- **Tests assert on the rows.** There is no fake: the app's tests run against the real database.
- **Requests `oidc-provider` handles under `/oauth` never reach the router.** `OidcIssuerMiddleware` gives them a scope of their own and records on it, inline: an app handed a code (`sign_in.succeeded`), a member refused an app, and an app's token or authorization request being refused, with the app as the actor. _Built 2026-10-09._ Each records straight onto the scope, because the member and the client are already loaded by then, through our own `findAccount` and storage adapter. Refused requests naming a client we don't know are left out. A known app's client ID is public, so failed requests for it can be sent by anyone and each writes an event; rate limits in housekeeping bound that.
- **A member signing out is not recorded, for now.** It is the one request where `oidc-provider` never loads the member, so it needs a lookup a listener can't wait for.
- **Tried and dropped for these events:** noting them in a list and loading the member and app again afterwards (a second lookup of what the request already had), then a separate recorder class, then a separate function with a made-up event for access denied and a variable shared between two callbacks for sign-out. Each added a hop to follow; the recording now sits in the middleware and reads top to bottom.
- **`sign_in.succeeded` is recorded when the app gets its code,** not when a password is submitted. It then covers a member who is already signed in and goes to a second app without seeing a sign-in page. It is about once per app per browser every 1 to 14 days, not every time the app is opened, which we never see. A separate "app opened" event was considered and dropped: it would have said the same thing.

**In the SDK.** How other SDKs send events, read 2026-10-09:

| SDK                           | Buffering                                                               | If the process crashes                       |
| ----------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| WorkOS audit logs (Node)      | None: one request per event, no retry, an idempotency key added for you | Lost unless the caller retries               |
| PostHog (Node)                | 20 events or 5 seconds, 100 per batch, queue capped at 10,000           | Queued events are lost; `shutdown()` flushes |
| OpenTelemetry batch processor | Queue of 2,048, every 5 seconds, 512 per batch                          | Lost; a full queue drops                     |

None lets an app commit events with its own data. WorkOS tells its customers to build that themselves: an outbox table written in the action's transaction, a worker draining it with retries, a stable idempotency key, and an alert on the age of the oldest undelivered row. Our SDK offers both, with the same units:

- **Buffered,** the default: a scope on the queue. A crash can lose the last few seconds.
- **With the app's transaction:** a batch flushed through the app's transaction into an outbox table in the app's own database. The SDK ships the migration and the worker, and our ingest endpoint drops duplicates by event ID. It needs an adapter per way of talking to a database; which comes first is decided with the SDK.

**Order of work.** The module's core is in `auditlogs/`, with nothing from the app or the framework in it, so it lifts out later (_built 2026-10-09: the catalogue, the four units, an in-memory store, and the PostgreSQL store with its two tables_). The wiring and the whole catalogue are built too: 26 actions across access, sign-in and configuration, replacing the nine event classes from the sign-in work ([guide](guides/audit-log.md)). Next come the pages. The ClickHouse store and the ingest endpoint come with the SDK, the only thing that produces activity events.

**Still to settle:**

- how long events are kept, and what is erased from them when a member or organization is deleted;
- the pages: an explorer, a member's and an app's events, refused sign-ins, and export.

**Sources:** [WorkOS audit logs](https://workos.com/docs/audit-logs) and ["When the action succeeds and the audit write doesn't"](https://workos.com/blog/audit-log-write-reliability); [Okta System Log query](https://developer.okta.com/docs/reference/system-log-query/); [GitHub's audit log](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization); [Google Cloud Audit Logs](https://docs.cloud.google.com/logging/docs/audit); [AWS CloudTrail concepts](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-concepts.html); [Stripe's canonical log lines](https://stripe.com/blog/canonical-log-lines); [Laravel Auditing drivers](https://laravel-auditing.com/guide/audit-drivers.html) and [resolvers](https://laravel-auditing.com/guide/audit-resolvers.html); [Spatie activitylog batches](https://spatie.be/docs/laravel-activitylog/v4/advanced-usage/batch-logs); [audited](https://github.com/collectiveidea/audited); [Rails `EventReporter`](https://api.rubyonrails.org/v8.1.3/classes/ActiveSupport/EventReporter.html); [PostHog Node](https://posthog.com/docs/libraries/node); [OpenTelemetry trace SDK](https://opentelemetry.io/docs/specs/otel/trace/sdk/); [auditlog.dev](https://www.auditlog.dev/).

## 4. Agent identity: research notes

The research is in [research/agent-auth.md](research/agent-auth.md) (2026-10-05): how agents reach apps, MCP today, where the industry is going, Agent Auth Protocol and WorkOS Agent Blueprints in practice, auth.md and ID-JAG, and how products model agents.

**Undecided.** The earlier plan was to build Agent Auth Protocol first and add ID-JAG later. That is reopened: Claude and ChatGPT speak MCP OAuth today, and no major client speaks Agent Auth Protocol yet. The open questions are at the end of the research. The principle stays: an agent is an actor.

## 5. Decisions needed before building

| #   | Decision                                                       | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Self-hosted per company, or multi-tenant SaaS?                 | **Decided: hosted multi-tenant.** See the multi-tenancy rules in §3.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D2  | Our own accounts, or the company's existing identity provider? | **Revised 2026-10-07: the company's identity provider first.** Members sign in with the company's Google Workspace, Entra or Okta over OIDC (_upstream sign-in_, Release 1); a serious company won't give staff a second password. An admin sets each member to the provider or to a password (§3, "Sign-in"); passwords are for people outside the provider and for organizations without one, with TOTP. Member passkeys and SMS codes are dropped. SAML and _directory sync_ (SCIM 2.0) are Release 2. |
| D3  | OAuth/OIDC engine                                              | **Decided: `oidc-provider`, with a new instance per request.** See §8.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D4  | Permission model                                               | **Decided: one master catalogue of static permissions**, kept in one company repo and synced once for the organization. Roles span apps; members hold several roles per app, per environment, and an app's token carries the union of their keys. See §3.                                                                                                                                                                                                                                                 |
| D5  | SDK shape                                                      | **Decided: one framework-agnostic TypeScript package, with no framework adapters.** Its functions take plain inputs (token string, callback URL, cookie values) and return plain results. The docs show a short wiring example for each popular framework.                                                                                                                                                                                                                                                |
| D6  | Databases                                                      | **Revised 2026-10-09: PostgreSQL for everything except what apps send.** Access, sign-in and configuration events stay in PostgreSQL, written with the change they describe. Activity events from the SDK go to ClickHouse from the start, since their volume is the only large one (§3, "Audit events"). The 2026-10-07 revision had put all audit events in PostgreSQL for Release 1.                                                                                                                   |
| D7  | Audit tamper-evidence                                          | **Decided: none in v1.** Events are append-only and only the ingest path writes them, which matches WorkOS, Okta, Auth0 and GitHub. Archiving, exports and integrity digests come later if customers ask.                                                                                                                                                                                                                                                                                                 |
| D8  | Environments                                                   | **Decided: definitions shared, runtime and access per environment.** Apps, members, the catalogue and roles are created once for the organization. Each environment has its own app setups (credentials, URLs), access (member × app × role), issuer, keys, sessions and audit. Revised 2026-10-05 from full isolation (§3).                                                                                                                                                                              |
| D9  | Environment limits                                             | **Decided:** dev, staging, and prod by default, with the number of environments set by plan. Billing counts active **prod** members only. Later: short-lived preview environments per pull request.                                                                                                                                                                                                                                                                                                       |
| D10 | Real staff in staging                                          | **Decided: one member record per person, with access per environment.** Staging access is granted separately from production access. Revised 2026-10-05 from separate member records per environment (§3).                                                                                                                                                                                                                                                                                                |

## 6. Releases and milestones

### Two releases

_Decided 2026-10-07. Where this and the milestones below disagree, this wins._

**Who it is for.** A company of 50 to 500 people with a small platform or internal-tools team, building several TypeScript apps and deploying them itself. The buyer is the engineering or platform lead. They come looking after an audit asks who has access to their admin tools, or when they rebuild login and roles for the third app. Not for now: companies that need self-hosting, SAML-only shops, other languages.

**What we are.** The layer between a company's identity provider and the apps it builds. The identity provider answers "who is this?". We answer "what can they do in this app, and what did they do?". We don't compete with Okta; we sit behind it.

|             | Release 1: get on the shortlist                                                                                                  | Release 2: win the deal                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Goal        | Sign up, integrate one app in 15 minutes, and tick login, RBAC and audit                                                         | Pass a security review and beat "just use Okta"                                       |
| Sign-in     | The company's identity provider over OIDC (Google Workspace, Entra, Okta); a password with TOTP for members an admin sets to one | SAML, SCIM, identity provider groups mapped to roles (opt-in), session length per app |
| Access      | Catalogue sync, typed `can()`, roles                                                                                             | Access reviews, expiring grants, a "who has access to what" report                    |
| Audit       | Console self-audit and its pages (PostgreSQL); ingest of app activity (ClickHouse); CSV export                                   | Streaming to a SIEM, retention policies                                               |
| SDK         | TypeScript, with wiring docs for three frameworks                                                                                | Revocation push; a second language if deals ask                                       |
| Trust       | Key rotation, expired-row cleanup, sign-in rate limits, encrypted secrets                                                        | SOC 2, custom login domains, status page                                              |
| Being found | Landing page, docs, pricing, comparisons (Okta directly, Cloudflare Access, WorkOS, Keycloak)                                    | Agents: MCP sign-in for internal apps, agents as actors in the audit log              |

**Release 1 build order:** sign-in with the company's identity provider (steps in §3, "Sign-in"), audit for the control plane's own events (§3, "Audit events"; moved up 2026-10-08), catalogue sync, the SDK with activity events, housekeeping, the public site.

**Cut from Release 1:** member passkeys, SMS codes, access rules from identity provider attributes, several identity providers per organization, the benchmark harness, load tests, device management, several secrets per client, billing (invoiced by hand). ClickHouse was on this list until 2026-10-09; it is back in, for activity events only (D6).

### Milestones

Each milestone ends with something that can be demonstrated.

**M0: Foundations**

- Organizations and environments, tenant and environment context, and scoped queries with isolation tests.
- Company signup: the user, the organization, and its environments.
- Domain schema (§3) and the actor abstraction.
- Admin console shell.
- Admin authentication with passkeys or password plus TOTP.
- Self-auditing hook.
- Benchmark harness, so the budgets in §2 are measured from the start.

**M1: Directory**

- Invite, activate, and suspend staff.
- Register apps: client credentials, redirect URIs, secret rotation. **v1 has one secret per client**, so rotating replaces it immediately and the old secret stops working. Several secrets at once, like WorkOS's create-then-delete rotation with `last_used_at`, can come later; it needs an override of `oidc-provider`'s single-secret check.
- Catalog sync API and the console views of app permissions, roles, access, and groups.

**M2: Identity provider**

- OIDC discovery, `/authorize`, `/token`, `/userinfo`, JWKS, and end-session (logout).
- PKCE, refresh rotation with reuse detection, and client credentials for app-to-app calls.
- Signing key rotation, single sign-on across apps, and a list of signed-in apps per member.
- _Demo: a sample app signs in through the control plane._

**M3: SDK v1 (TypeScript)**

- `auth` middleware with local verification.
- `member.can('billing:invoice.refund')`, typed from the catalogue.
- A typed management API client.
- `defineCatalog` and `catalog.sync()`.
- The `audit.log()` emitter with background batching.
- Wiring examples in the docs for AdonisJS, Express/Hono, and Next.js.
- _Demo: a new app integrated in under 15 minutes._

**M4: Audit**

- Ingest API.
- Explorer UI with filters for actor, app, action, target, and time.
- Per-member timelines.
- Retention policy and CSV/JSON export.

**M5: Hardening**

- Rate limits on auth endpoints.
- Required MFA by policy.
- Session and device management, with forced sign-out.
- Revocation webhooks or server-sent events.
- Load tests against the budgets.
- Security review.

**M6: Agents** _(order to be decided; see §4)_

- Agent Auth Protocol host and agent registration.
- App permissions exposed as capabilities.
- An approval screen showing constraints.
- Agents appear as actors in the audit log, alongside the member they act for.
- Then ID-JAG acceptance.

**Later**

- Upstream SSO (Google, Okta, Entra) and directory sync (SCIM 2.0).
- Custom login domains per tenant.
- Access reviews ("re-confirm who still needs Finance Admin").
- Just-in-time and expiring role grants.
- SDKs in other languages.

## 7. Definition of done for v1 (M0–M5)

> A company signs up for the hosted control plane, registers an app, invites staff, and assigns roles. A developer adds the SDK to an existing Node app in under 15 minutes and gets single sign-on, permission checks, and audit logging. An admin can answer "who did what, in which app, and when?" from one screen. Suspending a staff member signs them out of every app within 5 minutes, or immediately when revocation push is on. All of this meets the performance budgets in §2.

## 8. OAuth engine spike findings

Both spikes ran in copies of this repo (in the scratchpad) on AdonisJS 7 with an Inertia login page, two tenants, and JWT access tokens that carry roles. Each one passed its end-to-end suite.

|                                                    | `oidc-provider` 9.12 (panva)                                                                                                                                                                                                                   | `@jmondi/oauth2-server` 5.0                                                                                                                                                                                                                                                            |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shape                                              | A complete OIDC server, itself a Koa app, mounted as the first server middleware                                                                                                                                                               | A plain OAuth2 library: we write the controllers, the HTTP adapter (about 25 lines), and 5 storage repositories                                                                                                                                                                        |
| Maturity                                           | About 1M weekly downloads. **OpenID Certified** (Basic, logout profiles, FAPI 1/2, CIBA). Single maintainer, sponsored by Auth0/Okta                                                                                                           | About 40k weekly downloads. Its OIDC support became stable 6 weeks ago. Single maintainer, self-audited only; a serious PKCE bypass was fixed without a public advisory                                                                                                                |
| AdonisJS glue                                      | About 110 lines in one middleware plus the login controller. The Koa bridge relies on implicit behaviour (`headersSent`, `ctx.respond = false`). Two session cookies exist side by side                                                        | Native AdonisJS controllers, about 1,200 lines including repositories and migrations. Total control                                                                                                                                                                                    |
| Who owns security                                  | The library: PKCE, refresh rotation, reuse detection, single-use codes                                                                                                                                                                         | **Us.** Our repositories have to check which grants and scopes a client may use, detect refresh reuse, and prevent a race when two requests use the same code or refresh token. Defaults are unsafe: `aud` is not validated, and codes and refresh tokens are JWTs that are not hashed |
| Logout, sessions, `prompt`                         | Built in (RP-initiated and back-channel logout)                                                                                                                                                                                                | Not supported, so we build them (about 85 lines so far, with more to come)                                                                                                                                                                                                             |
| Key rotation and algorithms                        | Multiple keys, ES256 and EdDSA                                                                                                                                                                                                                 | One key and RS256 only, until a future major version. We replaced its signer with a jose-based one                                                                                                                                                                                     |
| Agent roadmap                                      | Device flow, DPoP, PAR, and CIBA are **built in**. Token exchange (RFC 8693) and the JWT-bearer grant (RFC 7523) need custom grants, about 70 lines, using **internal helpers that are not covered by semver**, so we would pin exact versions | None built in except a thin token exchange. Device flow, DPoP, PAR, and the JWT-bearer grant would all be ours to write                                                                                                                                                                |
| Multi-tenancy                                      | One provider instance per issuer (decision: create one per request, see below)                                                                                                                                                                 | One server instance per issuer                                                                                                                                                                                                                                                         |
| Token endpoint, client_credentials, 50 connections | **9.3k req/s, p99 9 ms** (JWT access token, no database write)                                                                                                                                                                                 | 3.4k req/s, p99 26 ms. It writes every token to the database, and SQLite was in WAL mode                                                                                                                                                                                               |
| Discovery / JWKS                                   | 24k / 37k req/s                                                                                                                                                                                                                                | 8k / 8.5k req/s (runs through the full AdonisJS middleware stack)                                                                                                                                                                                                                      |
| Known gaps                                         | Client secrets stored so they can be compared (we must encrypt them at rest). JWT access tokens cannot be introspected or revoked; we rely on short TTLs, which our design does anyway. Expired rows need a cleanup job                        | Everything in the rows above                                                                                                                                                                                                                                                           |

The speed numbers are from single processes on SQLite, an Apple M3 Pro, and autocannon. They are useful for comparing the two libraries, not as capacity estimates.

### Decision: `oidc-provider`, with a new instance per request

A `Provider` is a JavaScript object tied to one issuer domain. Rather than keeping one object per tenant in memory, **we create one per request from that tenant's keys and settings, and discard it afterwards.** The prototype is `scratchpad/single-instance/test_per_request.mjs`, and it passes 29 of 29 checks:

- each company and environment has its own issuer, keys, and JWKS, and tokens are rejected elsewhere;
- one company's client is unknown at another company;
- 300 interleaved concurrent requests showed no mixing;
- key rotation works;
- auth code + PKCE gives ID tokens and JWT access tokens;
- refresh rotation and reuse detection work;
- SSO works, and another environment correctly gets `login_required`.

Why this approach:

- **No patches, no cache, no cross-process messaging.** Every request sees the current keys and client settings straight away.
- **Creating the object costs about 73 µs, with no database calls** (we pass the tenant's config in).
- **It is slower than reusing an instance, and that does not matter here.** Token endpoint throughput is about 5.5k req/s at p99 18 ms, against about 19k req/s for a reused instance (single process, in-memory adapter). The control plane only handles logins, refreshes (about every 5 minutes per active member), and app-to-app tokens. App requests are verified locally by the SDK and never reach us.
- If load ever requires it, keeping recently used instances in memory for a short time is a contained change.

The costs that remain:

1. The Koa bridge middleware, which needs integration tests.
2. Exact version pins with a diff review on each upgrade, because the custom grants for agents use non-semver helpers.
3. Client secrets encrypted at rest (decided over hashing, so `oidc-provider` compares them unmodified), with `private_key_jwt` offered for apps that can use it.
4. Overrides for first-party behaviour: no consent screen, and keeping `offline_access`.
5. Subdomain issuers under `/oauth` (`https://acme.<domain>/oauth`, `https://acme--staging.<domain>/oauth`), as already planned. Kept over path-based issuers (`<domain>/oauth/acme/staging`) because the browser then isolates each environment's sign-in cookies by host, and custom domains are a plain host swap. Organization slugs are at least 3 characters, since DNS reserves `--` in a label's third and fourth characters.

### Deployment notes (Fly.io behind Cloudflare)

- **Now:** proxy the apex and a `*` record through Cloudflare (Universal SSL covers `*.<domain>` for free), with SSL mode Full (strict). Import a Cloudflare Origin CA certificate for `<domain>` and `*.<domain>` into Fly with `fly certs import`. Configure `trustProxy` for Cloudflare and Fly, and read the client IP from `CF-Connecting-IP` only when the request came from Cloudflare.
- **Custom domains (production only):** start with Fly custom domains through its certificates API ($0.10/month per hostname); move to Cloudflare for SaaS only if customer domains need Cloudflare's WAF.

Spike code: `scratchpad/spike-oidc-provider`, `scratchpad/spike-ts-oauth2-server`, and `scratchpad/single-instance`.

### `oidc-provider` behaviours to verify

These are defaults found in the source. Each one must be checked against best practice, decided, and documented in the guides when the step that touches it is built.

1. **Refresh tokens outlive the SSO session.** With `offline_access`, refresh tokens are not bound to the session (`expiresWithSession`, `lib/helpers/defaults.js:301`). Deleting a member's session does not sign them out of apps; their grants must be deleted too. _Decided in step 6 (logout): everything issued belongs to the browser's session (`expiresWithSession: true`); when it ends, nothing issued in it works for any app. Step 5 had unbound them (`false`), which also stopped logout from revoking grants (item 2). Grants (14 days) are shorter than the session (30 days, renewed on every visit), so only logout ends a session before its grants. A suspended member can't refresh because `findAccount` no longer finds them._
2. **Logout keeps `offline_access` grants.** The end-session endpoint revokes a grant only if it is not marked `persistsLogout`, which `offline_access` sets (`lib/actions/end_session.js:162`). After logout and a new sign-in, the old grant and its refresh token still work. _Corrected in step 6: the switch is `expiresWithSession`, not the scope. A grant whose tokens outlive the session is marked `persistsLogout` (`lib/helpers/process_response_types.js:117`). With tokens bound to the session, logout revokes the session's grants._
3. **No refresh tokens without `offline_access`** (`issueRefreshToken`, `lib/helpers/defaults.js:305`). Apps then renew only by sending the browser back to `/authorize`, which doesn't work for background calls, CLIs or agents. _Decided in step 5: every app gets a refresh token (`issueRefreshToken`), without `offline_access`._
4. **Grants are reused per session and app** (`loadExistingGrant`, `lib/helpers/defaults.js:544`). If an app logs out only locally, the refresh token it discarded stays valid until it expires. _Changed in step 5: every visit to the issuer creates a new grant, so its tokens get a full 14 days (a reused grant kept its original expiry). A grant's expiry is fixed at creation; saving it again doesn't extend it (`lib/models/base_token.js`)._ _Step 6: each visit first revokes the app's previous grant in that browser's session (`session.grantIdFor`), so a browser holds at most one grant per app and logout, which revokes the grants the session remembers, revokes them all. Other browsers' grants are untouched. Caveat: two tabs of the same app going through the issuer at the same moment can make one tab's code exchange fail once (its grant was revoked by the other); the app sends the member through again._
5. **Using a code or refresh token is check-then-mark, not atomic** (`lib/helpers/grant_source.js:23`). Our storage adapter makes marking atomic. A reused code does revoke its grant's tokens (tested in step 5). Still open: whether the losing request of a race should also revoke the grant.
6. **Features on by default:** PAR, DPoP, resource indicators, userinfo and RP-initiated logout. Access tokens are opaque and stored by default. _Step 5: access tokens are JWTs (`resourceIndicators`, one `urn:client:<client_id>` resource per client, `aud` = `client_id`), and userinfo is off: it only accepts stored tokens without an audience (`lib/actions/userinfo.js:45`). With userinfo off, `conformIdTokenClaims` no longer applies, so the ID token carries `name` and `email`._
7. **Unsafe fallbacks:** without `jwks`, a built-in development key is used. Without an adapter, an in-memory store shared by every instance is used.
8. **Default lifetimes and error page.** `oidc-provider` warns that it uses its default TTL for interactions (and other records) and its default HTML error page. Lifetimes are set with token contents. _The error page was replaced in step 4 (`resources/views/errors/oidc.edge`). Lifetimes are set in step 5 (docs/guides/tokens.md). Refresh tokens for apps with a secret are replaced only once 70% through their life (`rotateRefreshToken`); we keep that default, since a stolen refresh token is useless without the client secret (RFC 9700)._
9. **Default logout pages.** RP-initiated logout is on by default and renders `oidc-provider`'s unstyled confirmation and success pages (`logoutSource`, `postLogoutSuccessSource`). Replace them with pages in the sign-in style when logout is built. _Done in step 6 (`resources/views/oidc/sign_out.edge`, `signed_out.edge`). The confirmation submits itself when the request carries a valid `id_token_hint`, and always signs out of every app._
10. **`offline_access` needs `prompt=consent`.** The authorization endpoint drops `offline_access` unless the request's `prompt` includes `consent` (`lib/actions/authorization/scopes.js:25`), as OIDC Core §11 asks. With no consent step, our apps never get it, which is why refresh tokens are issued without it (item 3).
11. **No grant means a consent prompt, and an interaction can end with an error.** When `loadExistingGrant` returns nothing, `oidc-provider` asks for consent, through the same interaction URL as sign-in. Finishing an interaction with `{ error, error_description }` makes the resumed request fail with that error (`lib/actions/authorization/resume.js:90`), which is sent to the app's redirect URI. _Step 3 of the shared-definitions work uses both: a member without access gets no grant, the sign-in page answers the consent prompt with "You don't have access", and going back ends it with `access_denied`._
12. **`extraTokenClaims` runs on every access token issued**, at the code exchange and on every refresh (`lib/models/formats/opaque.js:47`, which the JWT format also uses). Its claims are spread before the registered ones (`lib/models/formats/jwt.js:116`), so they can't override `sub`, `aud` or `exp`. _Permissions step: it adds `permissions` to access tokens, so a role change reaches an app within one access token's lifetime (5 minutes) without revoking anything._
13. **Nothing asks a signed-in member to sign in again but `max_age` and `prompt`.** The login prompt's own checks (`lib/helpers/interaction_policy/prompts/login.js`) only look at what the app's request asks for, so a session is trusted for its whole 30 days however the member signed in. A session does record how and when (`amr`, `loginTs`, with `session.past(seconds)`), and a login result can set `amr`. _Sign-in step 3: sign-ins through the identity provider set `amr: ['provider']`, and a check added to the policy (`provider_recheck`) asks for sign-in again once that is a day old. `ttl` values can be functions of the request, so those sessions' grants last a day._

### Logout (step 6)

Guide: `docs/guides/logout.md`.

| Logout                 | Who                 | What it does                                                                                                                                                                    |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sign out in an app** | A member            | The app clears its session and sends the browser to `/oauth/session/end`. The session ends and every app's tokens from that browser stop working. Other devices stay signed in. |
| **Console logout**     | App admins (`User`) | Signs out of the console. Unrelated to members.                                                                                                                                 |

- **Decided: one sign-out, for every app in the browser.** Like Cloudflare Access and Keycloak. Okta's default (app-only logout) leaves the SSO session alive, so signing in again needs no password, which reads as "sign out didn't work". Products put "sign out everywhere" and the device list on an identity-provider page (Okta My Settings, Microsoft My Sign-Ins, Keycloak Account Console), never in apps: for us, a member account page on the issuer, later.
- **No token revocation endpoint (RFC 7009) for now:** nothing needs an app-only sign-out.
- **Sign-out redirect URIs are registered per client** and matched exactly, as RP-Initiated Logout §3 requires. Apps reach other pages through `state` or their own cookie.
- **Apps notice within 5 minutes,** at their next refresh. Later: back-channel logout through the SDK; admins forcing sign-out from the console (M5).

### Notes for the SDK

Found while building the sample app (`../control-plane-samples/invoices`). The SDK should do these for apps, so they don't have to.

- **One refresh at a time per session.** A refresh token is replaced once it's 70% through its life. If two requests refresh at that moment with the same session, the second presents the token the first just used; `oidc-provider` treats that as reuse and revokes the grant, so the member is bounced through the issuer (silently, if their session is alive). Run refreshes single-flight per session.
- **Refresh ahead of time.** Refresh when the access token expires within about 30 seconds, not after a request fails.
- **When a refresh fails, send the member through the issuer** with a top-level redirect, back to where they were (`return_to`, local paths only). APIs answer `401`, and the frontend navigates; a `fetch` can't follow a redirect to the sign-in page.
- **Session storage.** The sample keeps the session (access, refresh and ID tokens) in a cookie encrypted with the app's secret. Browsers cap a cookie at about 4 KB; the session is about 1.5 KB today. Once permissions go into the access token, a member with many could exceed it: keep the token's permissions compact, or store the session server-side with only an ID in the cookie, or split it across cookies.
- **Sign-out** clears the app's session, then redirects to the issuer's `end_session_endpoint` with `id_token_hint` and a registered `post_logout_redirect_uri`; other pages go through `state`.
