# Environment isolation

Apps, members, the catalogue and roles belong to the organization and are shared by its environments. What runs in an environment never leaks into another: an app's setup there (credentials, URLs), its sign-ins (sessions, grants, tokens) and its signing keys. This is enforced in two places.

The organization's identity provider belongs to the organization too, with each member's tie to it (`member_identities`) and how each member signs in. One provider, and one redirect URI, serve every environment. A sign-in through it still happens in one environment: its cookies live on that environment's issuer host, and the signed `state` names the environment, so the provider's answer can only be finished where it started ([Identity provider](identity-provider.md#signing-in)).

## 1. The database

Every table that belongs to an environment has both `organization_id` and `environment_id`. A composite foreign key ties the pair to `environments`:

```ts
table
  .foreign(['organization_id', 'environment_id'])
  .references(['organization_id', 'id'])
  .inTable('environments')
```

This means a row can't name an environment from a different organization.

Links between environment rows include `environment_id` in the foreign key too. `oidc_grants` references `app_environments(environment_id, client_id)`, so a grant can only be for an app set up in its own environment, and `app_members` references `app_environments(environment_id, app_id)` the same way. `app_member_roles` references `app_members(environment_id, id)` and `roles(organization_id, id)`, so a role of another organization can't be held.

Links to organization rows include `organization_id`: `app_environments` references `apps(organization_id, id)`, and sessions, grants, members and app members reference `actors(organization_id, id)`. An app or actor of another organization can't be used.

## 2. The console

Console requests resolve the organization from the URL through middleware, and the environment too on an app's environment pages. Controllers only query through them. See [Signup and console access](signup-and-console.md#how-a-console-page-finds-its-data).

## Tests

- `tests/functional/database/environment_boundaries.spec.ts` tries to insert rows that cross environments and organizations, and expects each insert to fail.
- `tests/browser/console/environment_isolation.spec.ts` checks that pages show only their organization's data, and that another organization's URLs and environments return 404.

When you add an environment table, give it both columns and the composite foreign key, and add a boundary test.
