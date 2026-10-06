# Agent auth: research

_Researched 2026-10-05. Nothing here is decided; the plan (§4 and M6) links here, and we pick a direction later._

The question: how do AI agents act on a company's internal apps, and whose identity do they act with? Two setups to start from:

- **Automation.** A browser agent drives the app while the staff member is signed in. The app sees the person's session and nothing else.
- **An agent with its own identity.** The app exposes an interface (MCP or otherwise) and the agent signs in to it, either for a staff member or for the organization.

## 1. How agents reach apps today

MCP is one way in, not the only one. Every way comes down to which token the agent presents to the app's API.

| Way in                                                               | Identity the app sees                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Browser or computer use (Claude in Chrome, ChatGPT Atlas, Comet)     | The person's own session. At most a Web Bot Auth signature (RFC 9421) saying which platform it is, never which person |
| MCP server                                                           | Almost always the person, through OAuth (see §2)                                                                      |
| REST or OpenAPI tools with OAuth                                     | Same as MCP                                                                                                           |
| CLIs used by coding agents (`gh` and others)                         | The person's token. Coding agents often prefer CLIs to MCP to save context                                            |
| A2A (agent to agent, now at the Linux Foundation)                    | Declares OAuth requirements in an Agent Card; no delegation model of its own                                          |
| Webhooks and assignment (Linear, Jira)                               | The agent's own identity: it is assigned work and receives an event                                                   |
| Agents built into the product (Agentforce, Rovo, Notion, ServiceNow) | Either, chosen per agent                                                                                              |

Whatever the transport, the control plane's part is the same: issue the token, and let the app's SDK check it.

## 2. MCP today: the agent acts as the person

Connecting GitHub, Linear, Notion, Atlassian, Salesforce, Asana or Stripe to Claude or ChatGPT gives the agent **the person's own OAuth token and all of their permissions**. Claude's docs: "Claude inherits each person's permissions from the connected service."

- **The agent shows up only as the OAuth client** (`client_id`, "this is Claude"), and products surface it in their own UI: GitHub's app badge on the avatar, Slack's "Sent using @Claude" footer, Linear's "User (via Application)". Almost no server uses the `act` claim.
- **Known problems:** the agent holds every right the person has, which makes prompt injection serious (a public GitHub issue led an agent to leak private repos); over-broad scopes; consent scattered across people; and the token is a bearer token that lasts as long as its refresh token, across every conversation.
- **Controls that exist:** Claude and ChatGPT admins choose which connectors are allowed and can block or require approval per tool; servers allowlist clients (Atlassian, Notion, GitHub).

**The spec (revision 2026-07-28):**

- The MCP server is an OAuth resource server and publishes Protected Resource Metadata (RFC 9728) pointing at its authorization server, **which can be a separate service, such as ours**.
- Clients register with Client ID Metadata Documents (CIMD); dynamic registration is deprecated. Clients send `resource` (RFC 8707), and tokens must be issued for that one server. Servers must not pass tokens on.
- **Enterprise-Managed Authorization** (stable since June 2026) builds on ID-JAG / Okta Cross App Access. The company's identity provider grants the connection, so there's no consent screen per person. Claude trusts only Okta for it so far.
- Claude's requirements of an authorization server: it reads the first `authorization_servers` entry, uses CIMD if `client_id_metadata_document_supported` is advertised (falling back to dynamic registration), and calls back to `https://claude.ai/api/mcp/auth_callback`.

## 3. Where the industry is going

User tokens over OAuth were the answer available, not a design for agents. OAuth stops at the client: the app sees "Sara, through Claude", but not which agent run it is, what that run may do, or why. The new efforts add the agent as a principal between the client and the person.

| Problem with user tokens today                                                                                    | The answer being built                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| The app can't tell an agent from a person, for audit or for policy (stricter limits, no deletes)                  | The token says it is an agent (WorkOS `sub_profile: "ai_agent"`, with the person in `act`)                                                      |
| The agent gets all of the person's rights                                                                         | A **ceiling** per agent: delegated access is the person's permissions ∩ the ceiling. Agent Auth Protocol adds **constraints** ("refund ≤ $500") |
| One token for every run, so one compromised run can't be revoked alone                                            | One identity per run, revocable alone                                                                                                           |
| Lifetimes fit apps (months), not tasks                                                                            | Short sessions with a hard cap                                                                                                                  |
| No identity for an agent without a person: a static API key, or the agent "pretending to be a human" in a browser | **Autonomous** mode: the agent acts as itself in the organization, up to its ceiling                                                            |
| Agents handing work to subagents                                                                                  | Chained sessions that can't escalate, with lifetime anchored to the root                                                                        |
| Stolen bearer tokens                                                                                              | Per-agent key pairs and request JWTs that live 60 seconds                                                                                       |
| Consent happens once, up front                                                                                    | Approval when a capability is requested (CIBA, device flow), partial approval per capability                                                    |
| Logs don't say why                                                                                                | WorkOS's `intent` claim travels with the token into logs                                                                                        |
| Offboarding                                                                                                       | Revocation cascades from the person to their hosts and agents                                                                                   |

**The four models, and who uses them:**

| Model                                                                  | Used by                                                                               | Catch                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Impersonation (shared account, borrowed session)                       | Nobody recommends it                                                                  | Can't tell who did what                            |
| Delegated: person in `sub`, agent recorded as actor or client          | Claude and ChatGPT connectors, Auth0, Cloudflare, Stytch, Okta Cross App Access       | Ends with the person's session; no background work |
| Own identity: client credentials or a workload ID, roles from an admin | Linear `actor=app`, Slack bot tokens, Agentforce service agents, GitHub installations | Needs a human owner; roles can grow too broad      |
| Hybrid: a registered agent with a ceiling, delegated or autonomous     | Entra Agent ID, WorkOS Agent Auth, Okta, Agent Auth Protocol, ServiceNow role-masking | More moving parts                                  |

The direction: **a token that names the agent, who it acts for (a person or the organization), and its own permissions, short-lived and revocable per run.**

## 4. Agent Auth Protocol in practice

An open protocol (v1.0 draft, from the Better Auth team) for **agents the app doesn't run**, such as a staff member's Claude Code. Example: the Invoices app and Sara.

**What the app does** (reference server: the Better Auth plugin):

```ts
agentAuth({
  providerName: 'invoices',
  capabilities: [
    { name: 'list_invoices', description: 'List invoices', input: {/* JSON Schema */} },
    { name: 'refund_invoice', description: 'Refund an invoice', input: {/* JSON Schema */} },
  ],
  deviceAuthorizationPage: '/approve',
  onExecute: async ({ capability, arguments: args, agentSession }) => {
    // agentSession.agentId: which agent; agentSession.user.id: for whom
  },
})
```

The plugin creates its tables, publishes `/.well-known/agent-configuration`, serves `/agent/register` and `/agent/status`, and checks every request. The app declares capabilities and runs them; it doesn't build an MCP server.

**How the agent signs in:**

1. Sara adds one generic MCP server to Claude Code, once, for every app that speaks the protocol: `claude mcp add auth-agent -- npx @auth/agent-cli mcp --url https://invoices.acme.com`.
2. She asks "refund invoice 1042". The CLI reads the discovery document, creates a key pair for the **host** (her Claude Code, the first time only) and one for **this agent** (this conversation), and calls `/agent/register` with both public keys and the capabilities it wants.
3. The host is unknown, so the app answers with a device code (`https://invoices.acme.com/device?code=ABCD-1234`, valid 5 minutes) and the CLI opens it in her browser.
4. Sara signs in the normal way, sees "Claude Code wants: list invoices, refund invoices", and approves either or both. The host is now **linked to Sara**.
5. The CLI polls `/agent/status` every 5 seconds until the agent is `active`.

Her next conversation registers a new agent under the same host and gets the default capabilities without a browser. Anything beyond the defaults asks again.

**What comes back:** no token. Approval only makes the agent `active`.

- On each request the CLI signs a fresh JWT with the agent's private key, valid 60 seconds, naming the host, the agent and the app. The app checks it against the stored public key, checks the grant, and runs the capability.
- Private keys stay on Sara's machine in `~/.agent-auth/` (`host.json`, `agents/<id>.json`), encrypted only if `AGENT_AUTH_ENCRYPTION_KEY` is set. The app stores public keys only. A leaked request is useless after 60 seconds; a lost laptop means revoking the host, which revokes its agents.
- Agents expire on three clocks: idle time, continuous use, and an absolute lifetime. A reactivated agent drops back to its default capabilities.

**For us, the protocol splits in two.** The Better Auth plugin puts everything in the app because each Better Auth app is its own login server. The protocol separates an **authorization server** (discovery, registration, approval, keys, grants, revocation) from **where a capability runs** (each capability can name its own `location`, which checks the agent JWT against the authorization server's keys or through `/agent/introspect`). We would be the authorization server and the internal app the location, as with sign-in today.

No major agent client speaks it yet; it is reached through the `@auth/agent-cli` MCP bridge.

## 5. WorkOS Agent Blueprints in practice

In early access (September 2026). For **agents the app's own backend runs**.

- A **blueprint** is the agent's definition: its permission ceiling, who may invoke it, and lifetimes. An **instance** is the blueprint in one organization. Each mint creates a revocable **session**.
- Tokens are ordinary JWTs signed with the same keys as user tokens, with `sub_profile: "ai_agent"`, the blueprint ID, `permissions`, an optional `intent`, and in delegated mode the person in `act`. Access tokens last at most an hour; refresh tokens are single-use and re-derive permissions each time.
- **Delegated** minting requires the person's live access token, and the result is their permissions ∩ the ceiling. Once their session ends, WorkOS refuses. **Autonomous** minting has no person; the result is the ceiling.

**Scenario: "every night, chase unpaid invoices".**

1. Sara asks the app's assistant for it; the app saves a schedule. The team made a blueprint "Invoice chaser" with the ceiling `invoices:read`, `reminders:send`.
2. At 2 a.m. the app's scheduler (its own code, on its own servers) calls WorkOS **with the app's WorkOS API key**: mint an autonomous token for "Invoice chaser" in Acme. WorkOS checks the key and that the blueprint allows autonomous use by Acme.
3. The scheduler starts the agent run and hands it the JWT. The agent never sees the API key.
4. The agent calls the app's API. Reading invoices works; a refund (say, from an injected invoice note) is refused.

**WorkOS never authenticates the agent.** It trusts the app's backend, which vouches for the agent because it is the backend's own job. What this buys: the long-lived secret stays in reviewed code, and the part that text can trick (the model loop) holds only a one-hour token capped below everything else. A nightly job runs autonomous, not delegated, because there's no live session.

**When an in-app agent needs none of this.** If the agent runs inside the person's request, while they are signed in, and does only what a button would, the app already knows who they are and checks their permissions as it does for the button. A separate token matters when the agent runs as a separate service, runs after the person leaves, should be capped below the person (a button does one reviewed thing; an agent decides at run time from text it didn't all get from the person), should be named in the audit log, or acts for nobody.

WorkOS doesn't cover agents it can't vouch for through a backend, such as Sara's Claude Code; that is Agent Auth Protocol's case.

## 6. auth.md and ID-JAG

- **auth.md** (WorkOS's "Agent Registration") is for third-party agents arriving at a service. The service publishes an `AUTH.md` manifest and an `agent_auth` block in `/.well-known/oauth-authorization-server`. Agents can register anonymously and a person **claims** them later with a short code (like the device flow); until then they get limited access. Revocation arrives as Security Event Tokens (RFC 8935).
- **ID-JAG** (IETF OAuth working-group draft, Okta and Ping authors) lets an agent platform prove which person it acts for: the client exchanges the person's ID token at their identity provider for an ID-JAG, and redeems it at the app's authorization server through the JWT-bearer grant (RFC 7523). It underlies MCP's Enterprise-Managed Authorization and Okta's Agent SSO. This is how a Claude or ChatGPT agent could prove "for Sara" without a consent screen.

## 7. How products and identity vendors model agents

- **Linear:** `actor=app` creates a dedicated app user (not billed, no admin scope) that can be assigned or mentioned. The person stays the assignee and the agent is the **delegate**.
- **GitHub:** an app acts as itself (installation token, attributed to the app) or as a user (user token, attributed to the user). The Copilot coding agent commits as the bot with the requester as co-author, pushes only to `copilot/*`, and the requester can't approve its PR.
- **Slack:** bot tokens belong to the app and survive the installer leaving; user tokens act as the user.
- **Salesforce Agentforce:** service agents run as a dedicated Agent User with their own permission sets; employee agents run as the signed-in user.
- **Atlassian Rovo:** admins pick per agent between "user's account" (logged as the user) and "agent's account" (its own grants, changes under the agent's name). An audit event records who invoked it.
- **ServiceNow:** by default the agent inherits the invoking user's roles, optionally masked to a subset; or it runs as a dedicated AI user.
- **Notion custom agents:** their own permissions, which can exceed the person using them. An agent with no owner for 7 days stops running.
- **Retool Agents:** groups get Use/Edit/Own on an agent; Retool advises OAuth tools so access follows the user rather than a shared service account.
- **Microsoft Entra Agent ID** (GA April 2026): blueprints hold credentials for many agent identities; interactive agents use On-Behalf-Of, autonomous ones client credentials. A **sponsor** (the business owner) is required and passes to their manager when they leave. Audit rows carry `agentType`.
- **Okta for AI Agents** (GA April 2026): agents in the directory with human owners, a deactivate switch, access reviews, and Cross App Access built into SSO.
- **Auth0 for AI Agents:** delegation only, a vault for third-party tokens, and approval mid-task through CIBA push.

**Patterns:**

- Mature products offer both "for a person" and "own identity", chosen per agent.
- An agent is a special kind of user inside the app: not billed, never admin, assignable.
- Every organization agent has a required human owner, and ownership moves on when they leave.
- Good audit rows record both the agent and the person.
- Shared agents are where data leaks: an agent that sees more than the person using it.
- Identity providers are becoming where agents are registered and authorized, whatever the transport.

## 8. What this could mean for the control plane

Candidates, not decisions.

- **Agents are actors.** The schema already allows it, and `app_members` is keyed by `actor_id`, so an organization agent could get access and roles per app, per environment, as members do.
- **A staff member's agent (delegated).**
  - Today's clients speak MCP OAuth: we would act as the MCP authorization server (CIMD, `resource`, audience-bound tokens). The token names the member and the client ("Claude").
  - Agent Auth Protocol, with the control plane as authorization server and the app as the capability's location, adds per-run identity, constraints and approval mid-task, but no major client speaks it yet.
  - ID-JAG acceptance would let Claude or ChatGPT prove which member it acts for.
- **The company's own agents (autonomous).** The app's backend already holds a client secret per environment; it could ask the control plane for an agent token, as WorkOS's backend minting does. The agent needs a human sponsor.
- **A ceiling for every agent,** so a connected agent never holds all of a member's roles: for example, an admin decides that agents on Invoices may only read.
- **Audit rows with both principals:** the agent and the member or organization it acted for.
- **Browser automation** stays the member's session; there is little to do there.

**Open questions:**

1. Which comes first: a member's agent connecting to an app, or the company's own agents?
2. Do delegated agents start with the member's full roles, or with a ceiling from day one?
3. Does the ceiling come from the permission catalogue (keys an agent may hold), from roles, or both?
4. Who sponsors an organization agent, and what happens to it when they leave?
5. Plan §4 said to build Agent Auth Protocol first. Do we keep that, or start with MCP OAuth, which clients speak today?

## Sources

- MCP: [authorization spec](https://modelcontextprotocol.io/specification/latest/basic/authorization), [2026-07-28 revision](https://blog.modelcontextprotocol.io/posts/2026-07-28/), [security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices), [Enterprise-Managed Authorization](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization), [Claude connector authentication](https://claude.com/docs/connectors/building/authentication), [Claude connectors](https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities), [ChatGPT apps auth](https://developers.openai.com/apps-sdk/build/auth), [GitHub MCP vulnerability](https://invariantlabs.ai/blog/mcp-github-vulnerability)
- Agent Auth Protocol: [overview](https://agentauthprotocol.com/), [specification](https://agentauthprotocol.com/specification), [build a server](https://agentauthprotocol.com/docs/build-server), [MCP and CLI](https://agentauthprotocol.com/docs/mcp), [hosts](https://agentauthprotocol.com/docs/host), [approval](https://agentauthprotocol.com/docs/approval), [authentication](https://agentauthprotocol.com/docs/authentication)
- WorkOS: [Agent Blueprints](https://workos.com/docs/authkit/agent-blueprints), [Agent Auth changelog](https://workos.com/changelog/agent-auth), [AI agents vs service accounts](https://workos.com/blog/ai-agents-vs-service-accounts), [Agent Registration](https://workos.com/docs/authkit/agent-auth), [auth.md](https://github.com/workos/auth.md)
- Standards: [RFC 8693](https://www.rfc-editor.org/rfc/rfc8693.html), [ID-JAG draft](https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-assertion-authz-grant/), [WIMSE AIMS draft](https://datatracker.ietf.org/doc/draft-ietf-wimse-aims/), [OpenID Foundation AIIM whitepaper](https://arxiv.org/pdf/2510.25819), [Cloudflare signed agents](https://blog.cloudflare.com/signed-agents/)
- Vendors: [Entra Agent ID](https://learn.microsoft.com/en-us/entra/agent-id/key-concepts), [Entra sponsors](https://learn.microsoft.com/en-us/entra/agent-id/agent-owners-sponsors-managers), [Okta for AI Agents](https://www.okta.com/blog/ai/okta-for-ai-agents-general-availability/), [Okta Cross App Access](https://developer.okta.com/docs/concepts/xaa/), [Auth0 for AI Agents](https://auth0.com/blog/auth0-for-ai-agents-generally-available/)
- Products: [Linear agents](https://linear.app/developers/agents), [GitHub app authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/about-authentication-with-a-github-app), [Copilot agent risks](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations), [Slack tokens](https://docs.slack.dev/authentication/tokens), [Rovo agent identity](https://support.atlassian.com/studio/docs/configure-a-rovo-agents-identity/), [Notion custom agents](https://www.notion.com/help/custom-agents-sharing-and-permissions), [Retool agent permissions](https://docs.retool.com/permissions/guides/agent-permissions)
