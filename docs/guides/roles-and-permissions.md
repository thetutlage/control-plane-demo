# Roles and permissions

Each environment has three parts:

```
Permission catalogue   which permission keys exist      permission_catalogs
Roles                  named lists of keys              roles
Role assignments       which actor has which role       role_assignments
```

## Permission catalogue

The company keeps one master list of permissions in its own repo and syncs it to each environment. An environment has at most one catalogue row, created on its first sync.

```json
{
  "billing:invoice.refund": { "description": "Refund a paid invoice" },
  "billing:invoice.read": {}
}
```

| Column            | Meaning                                  |
| ----------------- | ---------------------------------------- |
| `permissions`     | JSONB object of key → `{ description? }` |
| `hash`, `git_sha` | what was synced, and from which commit   |
| `synced_at`       | when; `null` until the first sync        |

We recommend `<area>:<resource>.<action>` for keys, but don't enforce it. The sync API isn't built yet.

## Roles

A role is a name and a JSONB list of permission keys. A role can include keys used by several apps.

```ts
await Role.create({
  organizationId: environment.organizationId,
  environmentId: environment.id,
  name: 'Finance Admin',
  description: null,
  permissions: ['billing:invoice.read', 'billing:invoice.refund'],
})
```

Roles are defined per environment. Staging's "Finance Admin" and production's are separate rows.

### Keys missing from the catalogue

A sync never fails because a role uses a key the catalogue doesn't have. Instead, the Roles page flags those keys: `RoleTransformer` compares each role's keys with the catalogue and returns `missingKeys`. If the environment has no catalogue yet, the page says so and flags nothing.

## Role assignments

A role assignment gives an actor a role in the same environment, optionally until `expires_at`. Each pair of role and actor appears at most once.

## JSONB arrays

`Role.permissions` and `AppClient.redirectUris` are JSON arrays. Their model columns use `prepare: JSON.stringify`. Without it, the `pg` driver sends a JavaScript array as a PostgreSQL array and stores `[]` as `{}`. Do the same for any new JSONB array column.
