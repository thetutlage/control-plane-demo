# Core concepts

```
Organization ── Acme
├── Users ............ people who run the console (user_orgs links them)
├── Apps ............. internal apps, registered once
└── Environments ..... development, staging, production
    ├── Members ...... people who sign in to Acme's apps
    ├── Actors ....... anything that can hold roles: members, later apps and agents
    ├── App clients .. each app's credentials in this environment
    ├── Permission catalogue
    ├── Roles and role assignments
    └── Signing keys . for this environment's issuer
```

| Concept              | Table                 | In one line                                                                                              |
| -------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| Organization         | `organizations`       | A company using the control plane. Its `slug` appears in console URLs and issuer URLs.                   |
| User                 | `users`               | A control plane account. An email can sign up only once.                                                 |
| User ↔ organization  | `user_orgs`           | Which organizations a user can open. Signup creates one.                                                 |
| Environment          | `environments`        | A fully separate sign-in realm. Every organization starts with development, staging and production.      |
| App                  | `apps`                | An internal app. It belongs to the organization, not to one environment.                                 |
| App client           | `app_clients`         | The app in one environment: its credentials, URL and redirect URIs. Configured by hand, per environment. |
| Actor                | `actors`              | An identity in one environment. Role assignments and audit events point to it.                           |
| Member               | `members`             | A person who signs in to the organization's apps. An email is unique within an environment.              |
| Permission catalogue | `permission_catalogs` | The company's list of permission keys for one environment.                                               |
| Role                 | `roles`               | A named list of permission keys, defined in each environment.                                            |
| Role assignment      | `role_assignments`    | Gives an actor a role, optionally until `expires_at`.                                                    |
| Signing key          | `signing_keys`        | The key an environment's issuer signs tokens with.                                                       |

## Users are not members

A **user** runs the console. A **member** signs in to the internal apps. They're separate records, even when one person is both.

Members exist per environment. The same person has one member record in staging and another in production.

## Enum columns

Small integer columns map to constants in `app/values/`:

| Column              | Values file                                                   |
| ------------------- | ------------------------------------------------------------- |
| `environments.kind` | `environment_kind.ts`: DEVELOPMENT 0, STAGING 1, PRODUCTION 2 |
| `members.status`    | `member_status.ts`: INVITED 0, ACTIVE 1, SUSPENDED 2          |
| `actors.type`       | `actor_type.ts`: MEMBER 0, APP 1, AGENT 2                     |
