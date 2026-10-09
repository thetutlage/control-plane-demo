# Audit log

Every access change, sign-in and configuration change is recorded as an audit event, in PostgreSQL. A change and its event are saved together, so one can't exist without the other. The design and its reasons are in [the plan](../plan.md), under "Audit events".

There are no pages for it yet. Events are written and can be read through the models.

## An event

| Field      | Holds                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------- |
| `id`       | A UUID version 7, made when the event happened. It sorts by time and is the paging cursor           |
| `action`   | `category.name`, from the catalogue. The category is `access`, `sign_in` or `configuration`         |
| `summary`  | A sentence, written when it happened: "ada@acme.com changed the roles of sara@acme.com on Invoices" |
| actor      | Who did it: a user or a member, with the name they had then. None when the system did it            |
| subjects   | What it was done to: members, apps, roles, the identity provider, each with its name then           |
| `data`     | Anything else worth keeping, such as roles before and after. Never a secret or a password           |
| `context`  | The request's ID, IP address and browser                                                            |
| `batch_id` | Shared by the events one change recorded together, such as removing a provider                      |
| tenant     | `organization_id`, and `environment_id` unless the event is about the organization as a whole       |

## The catalogue

`app/audit/actions.ts` declares every action, top to bottom. `defineSubjects` lists the kinds of things events involve; `defineActions` lists the actions, each a function from what it needs to the event. Recording one is type-checked against it:

```ts
batch.record('access.roles_changed', admin, member, app, environment, before, after)
```

To add an action, add it there and record it where the change happens.

## Recording

`AuditMiddleware` gives every routed request `ctx.audit`, stamped with the request's ID, IP and browser. The organization, environment and issuer middleware add the tenant.

**A change is recorded in its transaction,** with `auditedTransaction` (`app/audit/transaction.ts`):

```ts
await auditedTransaction(audit, async (trx, batch) => {
  await appMember.useTransaction(trx).revoke()
  batch.record('access.revoked', auth.getUserOrFail(), member, app, environment, roles)
})
```

- The batch is written last, inside the transaction. If either fails, both are rolled back and the request fails.
- Model methods that open a transaction of their own (`revoke`, `deleteEverywhere`, `signOutEverywhere`, `signInWith`) join the one they are given.
- An email that follows a change is sent after the commit (`member.sendPasswordSetup()`).
- Saving something unchanged records nothing.

**An event with no change to save** is recorded on the request's scope and written when the request ends, also when the request threw:

```ts
audit.record('sign_in.refused', app, environment, 'password', reason, email, member)
```

If that write fails, the request still succeeds and the events are logged in full (`reportUnwritten` in `app/audit/store.ts`), to be put back by hand.

## What is recorded

| Category        | Actions                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `access`        | `member_added`, `member_joined`, `granted`, `roles_changed`, `revoked`, `role_created`, `role_changed`, `role_deleted`, `sign_in_method_changed`, `identity_dissociated`, `signed_out_everywhere`, `password_setup_sent`       |
| `sign_in`       | `succeeded`, `refused`, `access_denied`, `token_request_refused`, `authorization_request_refused`, `password_set`, `password_reset_requested`                                                                                  |
| `configuration` | `organization_created`, `app_created`, `app_deleted`, `app_set_up`, `app_setup_changed`, `app_setup_removed`, `client_secret_rotated`, `identity_provider_connected`, `identity_provider_changed`, `identity_provider_removed` |

- **A refused sign-in keeps the real reason.** The page says "Email or password is incorrect" for every failure; the event says `unknown_email`, `wrong_password`, `not_active`, `signs_in_with_the_provider` or `no_password_set`, or the provider's reason. The member is a subject when the email or the provider's ID named one.
- **`sign_in.succeeded` means an app was handed a code for the member.** That happens when the app has no session of its own for them: a first visit, after a sign-out, or once its session with us has run out. It is not every time they open the app, which we never see. Its `method` is `password`, `provider`, or `session` when they were already signed in here and weren't asked for anything.
- **`sign_in.access_denied` is recorded once,** when a member who proved who they are is refused the app. They get no `sign_in.succeeded`.
- **Removing a provider** records the removal and one `access.sign_in_method_changed` per member it switches, in one batch.

- **A request an app gets wrong has the app as its actor.** `sign_in.token_request_refused` is a wrong client secret, or a code or refresh token that was expired or already used; a used one coming back can mean it was stolen. `sign_in.authorization_request_refused` is a sign-in the app started wrongly, such as with a redirect URI that isn't registered. Neither names a member, and neither stores the secret, the code or the token.

Not recorded: a member signing out, left out for now; token exchanges and refreshes that work, which are frequent and repeat what `sign_in.succeeded` said; and console users signing in to the console, since at login there is no organization to file the event under.

## Events from oidc-provider

Four events come from inside `oidc-provider`, on requests under `/oauth` that never reach the router. `OidcIssuerMiddleware` builds a provider instance per request, gives the request an audit scope of its own, and records on it right there:

| Recorded                                | From                                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `sign_in.succeeded`                     | `authorization.success`                                                                                                |
| `sign_in.access_denied`                 | The `admit` callback, when it answers no                                                                               |
| `sign_in.token_request_refused`         | `grant.error`                                                                                                          |
| `sign_in.authorization_request_refused` | `authorization.error`, except `access_denied`, `login_required` and `interaction_required`, which are ordinary answers |

- **Each records straight onto the request's scope.** By then `oidc-provider` has loaded the member and the client through our own callbacks: `findAccount` returns the member on the account, and the storage adapter adds the app's ID and name to the client (`app_id`, `app_name`, declared as extra client metadata).
- **A request naming a client we don't know has no app, and is left out.** Anyone can send those.
- **The scope is written once `oidc-provider` has handled the request and before it answers,** from a Koa middleware added with `provider.use`.
- **How the member got in** is read from `oidc.result`, which holds what the sign-in page submitted and is missing when they weren't asked for anything. The provider sign-in adds `how` to it (`returning`, `matched_by_email`, `created`).
- **An app's client ID is public,** so anyone who knows it can send token requests that fail, and each writes an event. Rate limits on the issuer's endpoints, part of housekeeping, are what bound that.

## Reading

Through the organization or the environment, like everything else, so a tenant only ever gets its own:

```ts
const events = await organization
  .related('auditEvents')
  .query()
  .withScopes((scopes) => scopes.involving({ type: 'member', id: member.id }))
  .whereIn('category', ['access', 'sign_in'])
  .withScopes((scopes) => scopes.page(50, cursor))
  .preload('refs')
```

- `involving(thing, role?)`: events the thing is the actor or a subject of, or only one of the two.
- `page(limit, cursor?)`: newest first, one more row than `limit`, which says whether another page follows. The cursor is the last event's ID. There are no totals.
- `event.actor` and `event.subjects` read the preloaded `refs`.

## Tables

- `audit_events`: one row per event.
- `audit_event_refs`: one row per thing an event involves, the actor at position 0, then each subject. It points at nothing, so an event still names a member or an app that has since been deleted.

Deleting an organization deletes its events.

## The package

`auditlogs/` holds the parts that aren't about this app, to be extracted later: the catalogue helpers, `Scope`, `Batch`, `Collector`, `Queue`, an in-memory store and the Lucid store. Nothing in it imports from `app/`. The control plane uses a collector per request and batches; it has no queue, since a queue can lose what it holds when the process dies.

## Tests

- `auditlogs/tests`: the package, without a database (`node ace test auditlogs`).
- `tests/functional/auditlogs/lucid_store.spec.ts`: what is written, transactions committing and rolling back with their events, and reading through the models.
- `tests/browser/console/audit_events.spec.ts`: every console action's event.
- `tests/browser/oidc/audit_events.spec.ts`: the sign-in pages' events, including each reason for a refused password.
- `assertRecorded` and `auditEvents` (`tests/helpers/audit.ts`) check the stored events. There is no fake.
