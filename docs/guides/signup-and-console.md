# Signup and console access

## Signup

`POST /signup` (`NewAccountController.store`) validates the form with `signupValidator` (`app/validators/user.ts`), then calls `OnboardingService.onboard()` (`app/services/onboarding_service.ts`).

In one transaction, `onboard()`:

1. creates the user;
2. creates the organization;
3. creates its Development, Staging and Production environments, with one signing key each;
4. links the user to the organization in `user_orgs`.

The user is then signed in and redirected to `/w/<org>/overview`.

### Organization slug rules

The slug appears in console URLs (`/w/acme`) and issuer URLs (`acme.<domain>/oauth`), so it must be:

- 3 to 32 characters, lowercase letters, digits and single hyphens (`acme-corp`, never `acme--corp`). Three is the minimum because DNS reserves `--` in a label's third and fourth characters, and staging's issuer host is `<slug>--staging`;
- not a reserved word such as `www`, `api`, `login` or `admin`;
- unused by any other organization.

Slugs can't be renamed.

## Login

`POST /login` (`SessionController.store`) checks the credentials with `User.verifyCredentials()` and redirects to `/w`. `GET /w` (`OrganizationsController.index`) opens the user's first organization.

## Console URLs

```
/w/:org/overview                              organization pages
/w/:org/apps
/w/:org/environments/:environment/members     environment pages
/w/:org/environments/:environment/roles
```

The organization and environment always come from the URL, never from the session.

## How a console page finds its data

Two named middleware run before every console controller (`start/routes.ts`):

| Middleware     | Sets               | Rule                                                                                                                                                      |
| -------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organization` | `ctx.organization` | Finds `:org` among the **signed-in user's** organizations only, with its environments preloaded. Anything else is a 404, even if the organization exists. |
| `environment`  | `ctx.environment`  | Finds `:environment` among `ctx.organization.environments`. Anything else is a 404.                                                                       |

Controllers then read only through these two objects:

```ts
// app/controllers/members_controller.ts
const members = await environment.related('members').query().orderBy('email', 'asc')
```

Never query a model directly by an id from the request (`Member.find(params.id)`). Go through `environment.related(...)`, so that another environment's rows can't be reached.

## Layout

`inertia/layouts/console.tsx` holds the top bar, with the organization name and the environment switcher, and the sidebar.

- **Organization pages:** Overview and Apps.
- **Environment pages:** Members and Roles, under a heading with the current environment's name.
- **Switching environment** keeps you on the same page in the other environment.
- **Non-production environments** show a banner.

The layout gets its data from shared props (`app/middleware/inertia_middleware.ts`): `organization`, `environments` and `currentEnvironment`.
