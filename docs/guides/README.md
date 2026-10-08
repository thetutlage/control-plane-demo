# Guides

Short guides to how the control plane works, and where each part lives in the code. For goals, decisions and the reasoning behind them, see [the plan](../plan.md).

1. [Getting started](getting-started.md): run the app, the database and the tests.
2. [Core concepts](core-concepts.md): users, organizations, environments, members and apps.
3. [Signup and console access](signup-and-console.md): how accounts are created and how console pages find their data.
4. [Environment isolation](environment-isolation.md): what is shared by environments, and what stays inside one.
5. [Members and actors](members-and-actors.md): the people who sign in to internal apps.
6. [Roles and permissions](roles-and-permissions.md): the catalogue, roles and role assignments.
7. [Issuers and signing keys](issuers.md): each environment's OpenID issuer.
8. [Apps](apps.md): registering apps once, and setting them up in each environment they reach.
9. [Member login](member-login.md): the sign-in page members see, single sign-on, and every error page on an issuer host.
10. [Sign-in records](sign-in-records.md): what `oidc-provider` stores while members sign in, and where.
11. [Tokens](tokens.md): swapping the code for tokens, what's inside them, refreshing, and how long everything lasts.
12. [Logout](logout.md): signing out of one app signs out of every app in the browser.
13. [Identity provider](identity-provider.md): connecting the company's own provider (Google Workspace, Entra, Okta), signing in through it, who signs in with it, and the daily re-check.
14. [Passwords and email](passwords.md): the emails members get, setting a first password, and resetting a forgotten one.
