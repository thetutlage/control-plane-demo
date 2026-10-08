# Core concepts

```
Organization ── Acme
├── Users ............ people who run the console (user_orgs links them)
├── Members .......... people who sign in to Acme's apps
├── Actors ........... anything that can hold roles: members, later apps and agents
├── Apps ............. internal apps, registered once
├── Permission catalogue
├── Roles
├── Identity provider  the company's own provider, which members sign in with
└── Environments ..... development, staging, production
    ├── App setups ... each app's credentials and URLs here, once it reaches this stage
    ├── Sign-ins ..... sessions, grants and tokens at this environment's issuer
    └── Signing keys . for this environment's issuer
```

| Concept              | Table                 | In one line                                                                                                         |
| -------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Organization         | `organizations`       | A company using the control plane. Its `slug` appears in console URLs and issuer URLs.                              |
| User                 | `users`               | A control plane account. An email can sign up only once.                                                            |
| User ↔ organization  | `user_orgs`           | Which organizations a user can open. Signup creates one.                                                            |
| Environment          | `environments`        | A stage apps move through, with its own issuer. Every organization starts with development, staging and production. |
| App                  | `apps`                | An internal app, registered once for the organization.                                                              |
| App setup            | `app_environments`    | An app in one environment: its client ID, secret, URL and redirect URIs there.                                      |
| Actor                | `actors`              | An identity in the organization. Roles and audit events will point to it.                                           |
| Member               | `members`             | A person who signs in to the organization's apps. An email is unique within the organization.                       |
| Permission catalogue | `permission_catalogs` | The company's list of permission keys, used by every environment.                                                   |
| Role                 | `roles`               | A named list of permission keys, used by every environment.                                                         |
| Signing key          | `signing_keys`        | The key an environment's issuer signs tokens with.                                                                  |
| Identity provider    | `identity_providers`  | The company's own provider (Google Workspace, Entra, Okta), which its staff sign in with. One per organization.     |
| Member identity      | `member_identities`   | A member's account at the identity provider, by the provider's permanent ID for them.                               |

## Users are not members

A **user** runs the console. A **member** signs in to the internal apps. They're separate records, even when one person is both.

A member is the same person in every environment, with one password. What differs per environment is which apps they sign in to there.

## Enum columns

Small integer columns map to constants in `app/values/`:

| Column              | Values file                                                   |
| ------------------- | ------------------------------------------------------------- |
| `environments.kind` | `environment_kind.ts`: DEVELOPMENT 0, STAGING 1, PRODUCTION 2 |
| `members.status`    | `member_status.ts`: INVITED 0, ACTIVE 1, SUSPENDED 2          |
| `actors.type`       | `actor_type.ts`: MEMBER 0, APP 1, AGENT 2                     |
