# Signup and console access

## Signup

`POST /signup` (`NewAccountController.store`) validates the form with `signupValidator` (`app/validators/user.ts`), then calls `OnboardingService.onboard()` (`app/services/onboarding_service.ts`).

In one transaction, `onboard()`:

1. creates the user;
2. creates the organization;
3. creates its Development, Staging and Production environments, with one signing key each;
4. links the user to the organization in `user_orgs`.

The user is then signed in and redirected to `/w/<org>`, which opens production.

### Organization slug rules

The slug appears in console URLs (`/w/acme`) and issuer URLs (`acme.<domain>/oauth`), so it must be:

- 3 to 32 characters, lowercase letters, digits and single hyphens (`acme-corp`, never `acme--corp`). Three is the minimum because DNS reserves `--` in a label's third and fourth characters, and staging's issuer host is `<slug>--staging`;
- not a reserved word such as `www`, `api`, `login` or `admin`;
- unused by any other organization.

Slugs can't be renamed.

## Login

`POST /login` (`SessionController.store`) checks the credentials with `User.verifyCredentials()` and redirects to `/w`. `GET /w` (`OrganizationsController.index`) opens the user's first organization. `GET /w/:org` (`OrganizationsController.show`) opens its environment last picked, remembered in the session, and otherwise production.

## Console URLs

```
/w/:org                                  opens the environment last picked
/w/:org/:environment/overview
/w/:org/:environment/apps
/w/:org/:environment/apps/:app           tabs: Overview, Settings
/w/:org/:environment/apps/:app/settings
/w/:org/:environment/members
/w/:org/:environment/members/:member
/w/:org/:environment/roles
```

Every console page belongs to the environment in its URL. Nothing on it comes from another environment.

## How a console page finds its data

Three named middleware run before every console controller (`start/routes.ts`):

| Middleware     | Sets               | Rule                                                                                                                                                      |
| -------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`         | `ctx.auth.user`    | The signed-in user, or a redirect to the login page.                                                                                                      |
| `organization` | `ctx.organization` | Finds `:org` among the **signed-in user's** organizations only, with its environments preloaded. Anything else is a 404, even if the organization exists. |
| `environment`  | `ctx.environment`  | Finds `:environment` among `ctx.organization.environments`. Anything else is a 404. Remembers it in the session, for `/w/:org`.                           |

Controllers then read only through `ctx.environment`:

```ts
// app/controllers/members_controller.ts
const members = await environment.related('members').query().orderBy('email', 'asc')
```

Never query a model directly by an id from the request (`Member.find(params.member)`). Go through `environment.related(...)`, so that another environment's rows can't be reached.

## Layout

`inertia/layouts/console.tsx` holds the top bar, with the organization name, and the sidebar: the environment switcher, then Overview, Apps, Members, Roles.

- **The switcher** (`inertia/components/environment_switcher.tsx`) keeps the section and drops the record: on `/w/acme/staging/apps/invoices`, picking Production opens `/w/acme/production/apps`. A record of one environment never exists in another.
- **It's colored by kind,** production in red. Everywhere else an environment appears, it's an `EnvironmentBadge` (`inertia/components/environment_badge.tsx`), never a sentence like "in Production".
- **Links** take their params from `useConsoleParams()`, which returns the organization and the current environment.

An app's pages (`inertia/components/app_screen.tsx`) are laid out as: the app's name and details, then the Overview and Settings tabs.

The layout and switcher get their data from shared props (`app/middleware/inertia_middleware.ts`): `organization`, `environments` and `currentEnvironment`.
