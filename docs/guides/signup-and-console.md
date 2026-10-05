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
/w/:org/apps/:app                                 tabs: Overview, then one per environment
/w/:org/apps/:app/environments/:environment       the app's setup there, and who signed in
/w/:org/members
/w/:org/members/:member                           one section per environment
/w/:org/roles
/w/:org/settings/environments
```

Apps, members and roles belong to the organization. An environment is in the URL only where something differs per environment: an app's setup in it.

## How a console page finds its data

Named middleware run before every console controller (`start/routes.ts`):

| Middleware     | Sets               | Rule                                                                                                                                                      |
| -------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`         | `ctx.auth.user`    | The signed-in user, or a redirect to the login page.                                                                                                      |
| `organization` | `ctx.organization` | Finds `:org` among the **signed-in user's** organizations only, with its environments preloaded. Anything else is a 404, even if the organization exists. |
| `environment`  | `ctx.environment`  | Only on an app's environment pages. Finds `:environment` among `ctx.organization.environments`. Anything else is a 404.                                   |

Controllers then read only through those objects:

```ts
// app/controllers/members_controller.ts
const member = await organization.related('members').query().where('id', id).firstOrFail()
```

Never query a model directly by an id from the request (`Member.find(params.member)`). Go through `organization.related(...)`, so that another organization's rows can't be reached, and filter by `ctx.environment` on environment pages.

## Layout

`inertia/layouts/console.tsx` holds the top bar, with the organization name, and the sidebar: Overview, Apps, Members, Roles, then Settings. There's no environment switcher.

- **Environments appear where they differ:** as tabs on an app's pages (`inertia/components/app_screen.tsx`), with a dot filled when the app is set up there, and as sections on a member's page.
- **Environments are shown as an `EnvironmentBadge`** (`inertia/components/environment_badge.tsx`), colored by kind, production in red, never as a sentence like "in Production".
- **Settings → Environments** lists each environment with its issuer URL and how many apps are set up in it.

The layout and pages get the organization and its environments, in order, from shared props (`app/middleware/inertia_middleware.ts`): `organization` and `environments`.
