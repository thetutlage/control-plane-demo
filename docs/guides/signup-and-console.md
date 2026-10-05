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
/w/:org/overview
/w/:org/apps
/w/:org/apps/:app                    tabs: Overview, Settings
/w/:org/apps/:app/settings
/w/:org/members
/w/:org/roles
```

The organization always comes from the URL. Pages that show one environment's data (an app's tabs, Members, Roles) take it from `?environment=staging`. Without one, they use the environment last picked in that organization (remembered in the session), and otherwise production.

## How a console page finds its data

Two named middleware run before every console controller (`start/routes.ts`):

| Middleware     | Sets               | Rule                                                                                                                                                                                          |
| -------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organization` | `ctx.organization` | Finds `:org` among the **signed-in user's** organizations only, with its environments preloaded. Anything else is a 404, even if the organization exists.                                     |
| `environment`  | `ctx.environment`  | Finds the `environment` input among `ctx.organization.environments` (anything else is a 404), or falls back to the last one picked, then production. A GET with `?environment=` remembers it. |

Controllers then read only through these two objects:

```ts
// app/controllers/members_controller.ts
const members = await environment.related('members').query().orderBy('email', 'asc')
```

Never query a model directly by an id from the request (`Member.find(params.id)`). Go through `environment.related(...)`, so that another environment's rows can't be reached.

## Layout

`inertia/layouts/console.tsx` holds the top bar, with the organization name, and the sidebar: Overview, Apps, Members, Roles.

There's no environment switcher in the layout. Each page that shows one environment has its own (`inertia/components/environment_switcher.tsx`):

- **Switching** reloads the same page with `?environment=`, and the choice carries over to other pages.
- **The switcher is colored by kind,** production in red. Everywhere else an environment appears, it's an `EnvironmentBadge` (`inertia/components/environment_badge.tsx`), never a sentence like "in Production".
- **Forms always send their environment** (`qs={{ environment }}`), so a form opened before switching environments in another tab still writes to the environment it showed.

An app's pages (`inertia/components/app_screen.tsx`) are laid out as: the app's name and details, the environment switcher, then the tabs. Every tab shows the chosen environment.

The layout and switcher get their data from shared props (`app/middleware/inertia_middleware.ts`): `organization`, `environments` and `currentEnvironment`.
