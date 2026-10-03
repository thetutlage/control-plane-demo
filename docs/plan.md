# Control Plane: Goals and Plan

_Status: draft, 2026-10-02. Milestone 0 in progress: the schema is in place, and the models, signup, and console are being reworked step by step._

## 1. What we are building

A **central identity and governance server for a company's internal apps**. A company registers its apps, adds its staff, and gives each person roles per app. Staff sign in once through the control plane and use every internal app from there. Every action is recorded in an audit log. Later, AI agents get identities of their own under the same rules.

In standard terms it is three things:

| Part | Industry term | Answers |
|---|---|---|
| Identity | OpenID Connect (OIDC) identity provider | Who is this? |
| Access | Role-based access control, set per app | What can they do in this app? |
| Audit | Append-only event log | Who did what, when, and in which app? |

The **SDK** is how apps use all three. It is the product surface. The control plane UI is the admin console.

It is a **hosted, multi-tenant service**. Each company is a tenant (an *organization*), and its data, signing keys, and login domain are isolated from other tenants.

### Non-goals for v1

- Permissions on individual records (for example, "editor of project X"). This becomes a relationship-based authorization system like Google Zanzibar, which is a separate product. Permissions are **static**: an app declares them, and admins combine them into roles. Apps handle record-level checks themselves.
- Directory sync and upstream single sign-on (see §5, D2).
- Billing, customer-facing (B2C) identity, and social login for end customers.

## 2. Design principles

1. **Use standard protocols, not invented ones.** Apps sign members in with OIDC Authorization Code + PKCE. Any framework or off-the-shelf OIDC client works, and the SDK is a convenience layer on top, not a requirement.
2. **The request path never calls the control plane.** This principle is what keeps the SDK fast.
   - Access tokens are short-lived signed JWTs that carry the member's roles and permissions.
   - The SDK verifies them locally against cached signing keys (JWKS). An auth plus permission check costs microseconds and needs no network call.
   - The cost is revocation lag. Tokens last about 5 minutes, refresh tokens rotate on every use, and an optional revocation push (webhook or server-sent events) lets apps drop sessions immediately.
3. **Audit writes never block an app.** The SDK buffers events and sends them in batches in the background. The server accepts them with one bulk insert.
4. **"Actor" is a first-class concept from day one.** Whoever holds a role or appears in an audit entry is an *actor*: a member, an app (machine-to-machine), or later an agent. Adding agents must not require reworking the schema.
5. **The control plane audits itself.** Every admin change (role granted, member suspended, secret rotated) creates an audit event automatically.

### Performance budgets

These are the targets we will benchmark against.

| Operation | Target |
|---|---|
| SDK token verification and `can()` check | under 1 ms, no network call |
| Login redirect round trip, server time | p95 under 100 ms |
| Management API reads | p95 under 30 ms |
| Management API writes | p95 under 75 ms |
| Audit event emitted from an app | non-blocking, delivered within 5 s |
| Audit explorer query (1M rows, filtered) | p95 under 200 ms |

## 3. Core domain model

The tables in `database/migrations` are the source of truth. This section explains them.

```
── Management plane (shared by every environment of an organization) ──
User ── a control plane account: signs up and runs the console.
        email unique across all users; one account per person
UserOrg ── user ↔ organization (many-to-many). Signup creates one
           organization; more can be created later, with a switcher
Organization (tenant) ── name, slug (login subdomain)
App ── an internal app, registered once per organization
AdminAuditEvent ── (ClickHouse) console actions by users, tagged with the
                   environment when one applies

── Data plane (one hard boundary per environment) ──
Environment ── kind: development | staging | production
  Every row below carries organization_id AND environment_id, tied
  together by a composite foreign key to environments, and never
  references another environment.
  Actor ── anything that holds roles or acts in audit events:
           member | app | agent
  Member ── a person who signs in to the internal apps.
            email unique per environment
  AppClient ── the App in this environment: client_id, redirect_uris
  PermissionCatalog ── the company's master catalogue for this
                       environment (JSONB), hash, git SHA, synced_at
  Role ── a named set of catalogue keys (JSONB), can span apps
  RoleAssignment ── actor × role, with optional expires_at
  AuditEvent ── (ClickHouse) actor, action, target, app, ip, user_agent,
                metadata
```

**Users and members are different people, or different roles of the same person.**
- **Users** run the control plane. One account per email. They belong to organizations through `user_orgs`, and are shown in a billing area later rather than in the main sidebar.
- **Members** sign in to the organization's internal apps. They exist per environment, so the same person has a separate member record in staging and in production.
- A member of Acme can also sign up as a user with the same email and create their own organization.

**Environments belong to the organization, not to each app.** "Acme staging" is one sign-in realm: all of Acme's staging apps share its members and single sign-on. An `App` is registered once per organization and has an `AppClient` in each environment.

**Every environment is fully isolated, and the setup is the same in each one:** sync the catalogue, define roles, add members, and assign roles.
- **Per environment:** everything that runs in it. That covers members, sessions, and MFA enrolments; app clients and credentials; the permission catalogue, roles, and role assignments; signing keys and issuer; and runtime audit events.
- **Shared across environments:** only the management layer. That is the organization, its users, billing, app registrations, and the console audit log.
- **No change in one environment ever affects another.** Promoting from staging to prod takes extra steps on purpose. We prefer that to accidental changes.
- **Staging uses separate staging accounts.** The people testing staging are usually real employees. They get a staging member record, either invited there or later federated in. Prod members are never copied in.

**The console mirrors this split.** Organization pages (Overview, Apps) have no environment switcher. Environment pages (Members, Roles, Audit log) sit under an environment switcher, and the current environment is always visible.

### Multi-tenancy rules

- **Isolation is enforced in one place.** Every environment table has `organization_id` and `environment_id`, so data can also be found across a whole organization. Console requests resolve the organization and environment once, and controllers only read through them. Composite foreign keys make links across environments impossible in the database itself. Tests try to read across tenants and across environments, and both attempts must fail.
- **Each environment gets its own OIDC issuer**, for example `https://acme.<our-domain>` for prod and `https://acme--staging.<our-domain>` for staging. Each issuer has its own discovery document, JWKS, and signing keys. A token issued for one tenant or environment fails verification in any other because both `iss` and the key differ. The SDK checks `iss` and audience against the environment it is configured for. Issuers are subdomains of the console URL (`APP_URL`). Organization and environment slugs cannot be renamed, because they are part of every app's issuer URL. Custom domains (`login.acme.com`) come later and are production only.
- **Each environment has its own credentials, and the key prefix shows which one:** `cp_test_…` for dev and staging, `cp_live_…` for prod. A staging CI key cannot write to production.
- **Dev and staging are relaxed but clearly labelled.** They allow `http://localhost` redirects, keep keys viewable, show a console banner, and add a `[STAGING]` prefix to emails. Production requires https, shows secrets once, and applies production rate limits.
- **No automatic copying between environments.** Members and role assignments are never mirrored from prod to staging, because that spreads real personal data into a weaker environment and creates surprise access. Later, an explicit and audited "import members from environment X" action could cover the need. A new environment can clone *settings* (branding, session lifetimes, MFA policy) from an existing one, but never secrets.
- **Two levels of admin:** *platform operators* (us, with a separate guard and console) and the organization's *users*.
- **Rate limits apply per tenant**, so one busy company cannot slow down the others.

### Permission catalogue

The company keeps **one master catalogue of its permissions in one repo** (for example, an `access` repo). The company models its permissions once, and apps get built around them. The research behind this is summarised below.

```ts
// the company's access repo: permissions.ts
export default defineCatalog({
  'billing:invoice.read':   { description: 'View invoices' },
  'billing:invoice.refund': { description: 'Refund an invoice' },
  'hr:employee.read':       { description: 'View employee records' },
  'company:pii.view':       { description: 'See personal data of customers' },
})
```

- **Sync:** `await controlPlane.catalog.sync(catalog)` runs from that repo's CI. **The credential decides the target environment**, so there is no `env` parameter to get wrong, and a staging key cannot touch prod. Because only one repo writes the catalogue, syncs never clobber each other.
- **Each environment holds its own copy of the catalogue** in `permission_catalogs`. Promoting it is the prod pipeline running the same sync with the prod key.
- **Sync is declarative and idempotent.** An unchanged catalogue costs one cheap request (the hash matches), and every sync returns a diff (added, changed, removed).
- **The catalogue is the source of truth, and sync never rejects a change.** If a key is removed while a role still lists it, nothing breaks, because no app checks that key any more. The console flags role keys that are missing from the catalogue.
- **Key naming is the company's choice.** We do not enforce namespaces. The docs recommend `<area>:<resource>.<action>`, as used by AWS (`s3:GetObject`), GCP, and Backstage, so that keys from different areas never collide.
- **Roles are built in the console** from the keys in the environment's catalogue. They are stored as a JSONB list of keys, they can span apps (a "Finance" role covering Billing and Payroll), and they exist only in the environment where they were created.
- **Promoting roles from staging to prod is manual for now:** you recreate the role in prod. If customers ask for it, we can add an explicit, reviewed "copy roles from environment X" action that shows a diff and is audited. It will never sync automatically.
- **Tokens carry all of the member's permissions.** An app that needs less can downscope its token, through token exchange or a narrower scope.
- **The catalogue generates types**, so `member.can('billing:invoice.raed')` (misspelled) is a compile error in apps that import it.
- **Catalogue keys become agent capabilities.** The same catalogue, plus optional input constraints, is what agents request in M6.

**Why one master catalogue.** Roles modelled once for the whole company are common: Auth0 tenant roles, Keycloak composite roles, Entra access packages, AWS and GCP organization roles, and SailPoint business roles all work this way. Systems with one global catalogue (AWS, GCP, Backstage, Zanzibar) namespace their keys so that different areas never collide. Ownership of each area is usually handled by code review (for example, CODEOWNERS in the repo), which is the company's job rather than ours.

### Audit events

- **Storage:** two ClickHouse tables, `audit_events` (app activity, per environment) and `admin_audit_events` (console actions, per organization). Both are partitioned by month and sorted by tenant first, so every query reads one tenant's slice.
- **Ingest:** apps and the SDK send events in batches to a dedicated ingest endpoint with a documented JSON contract. It writes straight to ClickHouse using async inserts, which batch on the server, so there is no queue in between. The endpoint can later move to a Go service without changing the contract.
- **Reads:** the console reads through one module that always filters by organization and environment.
- **Schema:** plain `.sql` migrations in `database/clickhouse/migrations/`, run by a small `ace` command. The AdonisJS app owns the schema; the ingest service only writes.

## 4. Agent identity: research notes

Both candidate specs are **drafts**. Neither should shape the core schema beyond the principle that "an agent is an actor".

**Agent Auth Protocol** ([agentauthprotocol.com](https://agentauthprotocol.com/specification), v1.0-draft)
- Two levels of identity. A *host* is a persistent runtime with its own Ed25519 keypair. An *agent* is a short-lived actor under one host, with its own keypair.
- Agents send self-signed JWTs that live for 60 seconds or less. The server stores only public keys, never shared secrets.
- Permissions are named *capabilities* with JSON-Schema inputs and constraints such as `max`, `in`, and `not_in`. For example: "transfer at most $500".
- A member approves an agent through a device-code style flow or CIBA, and can approve some capabilities and deny others.
- Endpoints: `/.well-known/agent-configuration`, `/agent/register`, `/agent/status`, `/agent/request-capability`, `/agent/revoke`, `/capability/list`, `/capability/execute`, `/agent/introspect`.
- Agents expire when idle and have a maximum and an absolute lifetime. Revoking a host also revokes all of its agents.

**auth.md** ([workos/auth.md](https://github.com/workos/auth.md))
- An extension of OAuth. The service publishes an `AUTH.md` manifest and an `agent_auth` block in `/.well-known/oauth-authorization-server`.
- Agents arrive with an **ID-JAG**: an identity assertion from their platform (IETF draft) that is exchanged for a token through the RFC 7523 JWT-bearer grant.
- Agents can also register anonymously, and a human later "claims" them with a 6-digit code.
- Security events, such as a revoked assertion, arrive as RFC 8935 SETs.

**Fit for us.** Agent Auth Protocol fits internal governance better. Its capabilities map directly onto app permissions, its constraints add guardrails, and its host and agent split lines up with "staff member's laptop or CI runner → agent". auth.md is aimed at agents signing up to outside SaaS products. The piece worth taking from it is **ID-JAG acceptance**, so that an agent from Claude, ChatGPT, or similar can prove which staff member it acts for. Plan: build Agent Auth Protocol first, and add ID-JAG as another way to sign in.

## 5. Decisions needed before building

| # | Decision | Status |
|---|---|---|
| D1 | Self-hosted per company, or multi-tenant SaaS? | **Decided: hosted multi-tenant.** See the multi-tenancy rules in §3. |
| D2 | Our own accounts, or the company's existing identity provider? | **Decided: our own accounts first** (passkeys, password, TOTP). There are two separate later features: *upstream SSO* (staff sign in with Google, Okta, or Entra) and *directory sync* (SCIM 2.0 automatically creates and removes staff when HR or IT changes them). We will choose the order later. |
| D3 | OAuth/OIDC engine | **Decided: `oidc-provider`, with a new instance per request.** See §8. |
| D4 | Permission model | **Decided: one master catalogue of static permissions**, kept in one company repo and synced per environment. Roles span apps, and tokens carry all of the member's permissions. See §3. |
| D5 | SDK shape | **Decided: one framework-agnostic TypeScript package, with no framework adapters.** Its functions take plain inputs (token string, callback URL, cookie values) and return plain results. The docs show a short wiring example for each popular framework. |
| D6 | Databases | **Decided: PostgreSQL for app data, self-hosted ClickHouse for audit events from day one.** See "Audit events" in §3. |
| D7 | Audit tamper-evidence | **Decided: none in v1.** Events are append-only and only the ingest path writes them, which matches WorkOS, Okta, Auth0 and GitHub. Archiving, exports and integrity digests come later if customers ask. |
| D8 | Environments | **Decided: full isolation.** Members, app clients, catalogues, roles, role assignments, keys, and runtime audit are all separate per environment. Only the management layer (organization, its users, billing, app registrations) is shared. Environments sit at the organization level. This matches WorkOS, Clerk, Auth0, Okta, Stytch, Descope, and Permit.io. Promoting roles between environments is manual for now (§3). |
| D9 | Environment limits | **Decided:** dev, staging, and prod by default, with the number of environments set by plan. Billing counts active **prod** members only. Later: short-lived preview environments per pull request. |
| D10 | Real staff in staging | **Decided: separate staging member records.** Every environment is set up the same way: sync the catalogue, define roles, add members, assign roles. |

## 6. Milestones

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
- Catalog sync API and the console views of app permissions, roles, role assignments, and groups.

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

**M6: Agents**
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

| | `oidc-provider` 9.12 (panva) | `@jmondi/oauth2-server` 5.0 |
|---|---|---|
| Shape | A complete OIDC server, itself a Koa app, mounted as the first server middleware | A plain OAuth2 library: we write the controllers, the HTTP adapter (about 25 lines), and 5 storage repositories |
| Maturity | About 1M weekly downloads. **OpenID Certified** (Basic, logout profiles, FAPI 1/2, CIBA). Single maintainer, sponsored by Auth0/Okta | About 40k weekly downloads. Its OIDC support became stable 6 weeks ago. Single maintainer, self-audited only; a serious PKCE bypass was fixed without a public advisory |
| AdonisJS glue | About 110 lines in one middleware plus the login controller. The Koa bridge relies on implicit behaviour (`headersSent`, `ctx.respond = false`). Two session cookies exist side by side | Native AdonisJS controllers, about 1,200 lines including repositories and migrations. Total control |
| Who owns security | The library: PKCE, refresh rotation, reuse detection, single-use codes | **Us.** Our repositories have to check which grants and scopes a client may use, detect refresh reuse, and prevent a race when two requests use the same code or refresh token. Defaults are unsafe: `aud` is not validated, and codes and refresh tokens are JWTs that are not hashed |
| Logout, sessions, `prompt` | Built in (RP-initiated and back-channel logout) | Not supported, so we build them (about 85 lines so far, with more to come) |
| Key rotation and algorithms | Multiple keys, ES256 and EdDSA | One key and RS256 only, until a future major version. We replaced its signer with a jose-based one |
| Agent roadmap | Device flow, DPoP, PAR, and CIBA are **built in**. Token exchange (RFC 8693) and the JWT-bearer grant (RFC 7523) need custom grants, about 70 lines, using **internal helpers that are not covered by semver**, so we would pin exact versions | None built in except a thin token exchange. Device flow, DPoP, PAR, and the JWT-bearer grant would all be ours to write |
| Multi-tenancy | One provider instance per issuer (decision: create one per request, see below) | One server instance per issuer |
| Token endpoint, client_credentials, 50 connections | **9.3k req/s, p99 9 ms** (JWT access token, no database write) | 3.4k req/s, p99 26 ms. It writes every token to the database, and SQLite was in WAL mode |
| Discovery / JWKS | 24k / 37k req/s | 8k / 8.5k req/s (runs through the full AdonisJS middleware stack) |
| Known gaps | Client secrets stored so they can be compared (we must encrypt them at rest). JWT access tokens cannot be introspected or revoked; we rely on short TTLs, which our design does anyway. Expired rows need a cleanup job | Everything in the rows above |

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
5. Subdomain issuers (`acme.<domain>`, `acme--staging.<domain>`), as already planned.

Spike code: `scratchpad/spike-oidc-provider`, `scratchpad/spike-ts-oauth2-server`, and `scratchpad/single-instance`.

### `oidc-provider` behaviours to verify

These are defaults found in the source. Each one must be checked against best practice, decided, and documented in the guides when the step that touches it is built.

1. **Refresh tokens outlive the SSO session.** With `offline_access`, refresh tokens are not bound to the session (`expiresWithSession`, `lib/helpers/defaults.js:301`). Deleting a member's session does not sign them out of apps; their grants must be deleted too.
2. **Logout keeps `offline_access` grants.** The end-session endpoint revokes a grant only if it is not marked `persistsLogout`, which `offline_access` sets (`lib/actions/end_session.js:162`). After logout and a new sign-in, the old grant and its refresh token still work.
3. **No refresh tokens without `offline_access`** (`issueRefreshToken`, `lib/helpers/defaults.js:305`). Apps then renew only by sending the browser back to `/authorize`, which doesn't work for background calls, CLIs or agents.
4. **Grants are reused per session and app** (`loadExistingGrant`, `lib/helpers/defaults.js:544`). If an app logs out only locally, the refresh token it discarded stays valid until it expires.
5. **Using a code or refresh token is check-then-mark, not atomic** (`lib/helpers/grant_source.js:23`). Our storage adapter makes marking atomic. Still open: whether the losing request of a race should also revoke the grant (RFC 6749 §4.1.2 says a reused code SHOULD revoke its tokens).
6. **Features on by default:** PAR, DPoP, resource indicators, userinfo and RP-initiated logout. Access tokens are opaque and stored by default.
7. **Unsafe fallbacks:** without `jwks`, a built-in development key is used. Without an adapter, an in-memory store shared by every instance is used.
8. **Default lifetimes and error page.** `oidc-provider` warns that it uses its default TTL for interactions (and other records) and its default HTML error page. Lifetimes are set with token contents; the error page with the member login page.
