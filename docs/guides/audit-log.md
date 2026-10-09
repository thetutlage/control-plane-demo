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
| `sign_in`       | `succeeded`, `refused`, `access_denied`, `password_set`, `password_reset_requested`                                                                                                                                            |
| `configuration` | `organization_created`, `app_created`, `app_deleted`, `app_set_up`, `app_setup_changed`, `app_setup_removed`, `client_secret_rotated`, `identity_provider_connected`, `identity_provider_changed`, `identity_provider_removed` |

- **A refused sign-in keeps the real reason.** The page says "Email or password is incorrect" for every failure; the event says `unknown_email`, `wrong_password`, `not_active`, `signs_in_with_the_provider` or `no_password_set`, or the provider's reason. The member is a subject when the email or the provider's ID named one.
- **`sign_in.access_denied` is recorded each time the "You don't have access" page is shown,** so reloading it records it again.
- **Removing a provider** records the removal and one `access.sign_in_method_changed` per member it switches, in one batch.

Not recorded yet: sign-outs, and anything else `oidc-provider` handles under `/oauth` without reaching the router. Token refreshes won't be. Console users signing in to the console aren't either: at login there is no organization to file the event under.

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
