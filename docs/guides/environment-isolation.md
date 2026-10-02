# Environment isolation

An environment never sees another environment's data, even within the same organization. This is enforced in two places.

## 1. The database

Every table that belongs to an environment has both `organization_id` and `environment_id`. A composite foreign key ties the pair to `environments`:

```ts
table
  .foreign(['organization_id', 'environment_id'])
  .references(['organization_id', 'id'])
  .inTable('environments')
```

This means a row can't name an environment from a different organization.

Links between environment rows include `environment_id` in the foreign key too. For example, `role_assignments` references `roles(environment_id, id)` and `actors(environment_id, id)`. A production role can't be assigned to a staging actor: the insert fails.

`app_clients` is the one link to an organization-level table. It references `apps(organization_id, id)`, so an app can only get clients in its own organization's environments.

## 2. The console

Console requests resolve the organization and environment from the URL through middleware, and controllers only query through them. See [Signup and console access](signup-and-console.md#how-a-console-page-finds-its-data).

## Tests

- `tests/functional/database/environment_boundaries.spec.ts` tries to insert rows that cross environments and organizations, and expects each insert to fail.
- `tests/browser/console/environment_isolation.spec.ts` checks that one environment's pages never show another's data, and that another organization's URLs return 404.

When you add an environment table, give it both columns and the composite foreign key, and add a boundary test.
