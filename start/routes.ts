/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import env from '#start/env'
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').renderInertia('home', {}).as('home')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
    router.get('w', [controllers.Organizations, 'index'])
  })
  .use(middleware.auth())

/**
 * The console of one organization opens on the environment last picked
 */
router
  .get('w/:org', [controllers.Organizations, 'show'])
  .where('org', router.matchers.slug())
  .use([middleware.auth(), middleware.organization()])

/**
 * Console pages of one environment, under `/w/:org/:environment`. Every
 * page reads its data through that environment, so nothing on it belongs
 * to another one.
 */
router
  .group(() => {
    router.get('overview', [controllers.Overview, 'show'])

    router
      .resource('apps', controllers.Apps)
      .only(['index', 'create', 'store', 'show', 'destroy'])
      .params({ apps: 'app' })
    router.get('apps/:app/members', [controllers.AppMembers, 'index'])
    router.get('apps/:app/settings', [controllers.AppSettings, 'show'])
    router.get('apps/:app/settings/edit', [controllers.AppSettings, 'edit'])
    router.put('apps/:app/settings', [controllers.AppSettings, 'update'])
    router.post('apps/:app/secret', [controllers.AppSecrets, 'store'])

    router
      .resource('members', controllers.Members)
      .only(['index', 'create', 'store', 'show'])
      .params({ members: 'member' })
    router.delete('members/:member/sessions', [controllers.MemberSessions, 'destroy'])

    router.get('roles', [controllers.Roles, 'index'])
  })
  .prefix('w/:org/:environment')
  .where('org', router.matchers.slug())
  .where('environment', router.matchers.slug())
  .where('app', router.matchers.slug())
  .where('member', router.matchers.number())
  .use([middleware.auth(), middleware.organization(), middleware.environment()])

/**
 * The sign-in page of an environment's issuer, on the issuer's own host
 * (`acme.<domain>`, `acme--staging.<domain>`). oidc-provider sends members
 * here; its own endpoints live under `/oauth` and never reach the router.
 */
router
  .group(() => {
    router.get('sign-in/:signInId', [controllers.SignIn, 'show']).as('sign_in.show')
    router.post('sign-in/:signInId', [controllers.SignIn, 'store']).as('sign_in.store')
  })
  .domain(`:issuer.${new URL(env.get('APP_URL')).hostname}`)
  .use(middleware.issuer())
