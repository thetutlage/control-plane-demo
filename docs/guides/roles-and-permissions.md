# Roles and permissions

An organization has two parts, used by every environment:

```
Permission catalogue   which permission keys exist      permission_catalogs
Roles                  named lists of keys              roles
```

Members hold roles **per app, per environment**, as [app members](members-and-actors.md#access-to-apps). A member can hold several roles on one app.

## Permission catalogue

The company keeps one master list of permissions in its own repo and syncs it to the control plane. An organization has at most one catalogue row, created on its first sync.

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

We recommend `<area>:<resource>.<action>` for keys, but don't enforce it. The sync API isn't built yet. During development, `node ace db:seed` (`database/seeders/permission_catalog_seeder.ts`) gives every organization the catalogue in `database/permission_catalog.json`.

## Roles

A role is a name and a JSONB list of permission keys. A role can include keys used by several apps.

```ts
await organization.related('roles').create({
  name: 'Finance Admin',
  description: null,
  permissions: ['billing:invoice.read', 'billing:invoice.refund'],
})
```

Roles are defined once, and every environment uses the same ones.

### In the console

| URL                        | Page                                                                           | Controller               |
| -------------------------- | ------------------------------------------------------------------------------ | ------------------------ |
| `/w/:org/roles`            | Roles, with how many keys each has and how many are missing from the catalogue | `RolesController.index`  |
| `/w/:org/roles/create`     | New role: name, description, and keys picked from the catalogue                | `RolesController.create` |
| `/w/:org/roles/:role/edit` | Edit the role, or **Delete role** (asks first)                                 | `RolesController.edit`   |

- **Names** are unique within the organization.
- **Keys** are checkboxes grouped by area (the part before `:`). Only catalogue keys can be added (`app/validators/role.ts`). A role may have no keys at all: it still decides who can sign in to an app.
- **Keys that left the catalogue** stay on the role when it's saved, listed ticked under "Missing from the catalogue", until the admin unticks them.
- **Deleting a role** (`role.deleteEverywhere()`) takes it from everyone holding it. App members it was the only role of lose access to that app and are signed out of it. The confirmation says how many members hold the role.

### Keys missing from the catalogue

A sync never fails because a role uses a key the catalogue doesn't have. Instead, the Roles page flags those keys: `RoleTransformer` compares each role's keys with the catalogue and returns `missingKeys`. If no catalogue has been synced yet, the page says so and flags nothing.

## JSONB arrays

`Role.permissions` and `AppEnvironment.redirectUris` are JSON arrays. Their model columns use `prepare: JSON.stringify`. Without it, the `pg` driver sends a JavaScript array as a PostgreSQL array and stores `[]` as `{}`. Do the same for any new JSONB array column.
