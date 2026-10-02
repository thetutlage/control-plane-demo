# Guides

Short guides to how the control plane works, and where each part lives in the code. For goals, decisions and the reasoning behind them, see [the plan](../plan.md).

1. [Getting started](getting-started.md): run the app, the database and the tests.
2. [Core concepts](core-concepts.md): users, organizations, environments, members and apps.
3. [Signup and console access](signup-and-console.md): how accounts are created and how console pages find their data.
4. [Environment isolation](environment-isolation.md): how data stays inside one environment.
5. [Members and actors](members-and-actors.md): the people who sign in to internal apps.
6. [Roles and permissions](roles-and-permissions.md): the catalogue, roles and role assignments.
7. [Issuers and signing keys](issuers.md): each environment's OpenID issuer.
8. [Apps and clients](apps-and-clients.md): registering apps and configuring their clients per environment.
9. [Sign-in records](sign-in-records.md): what `oidc-provider` stores while members sign in, and where.
