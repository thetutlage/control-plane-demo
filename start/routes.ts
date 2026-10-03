/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

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
 * Console pages of one organization, under `/w/:org`. Organization pages
 * are shared by every environment. Environment pages sit under
 * `environments/:environment` and only ever read data through the resolved
 * environment.
 */
router
  .group(() => {
    router.get('overview', [controllers.Overview, 'show'])
    router
      .resource('apps', controllers.Apps)
      .only(['index', 'create', 'store', 'show'])
      .params({ apps: 'app' })
      .where('app', router.matchers.slug())
    router
      .resource('apps.clients', controllers.AppClients)
      .only(['create', 'store'])
      .params({ apps: 'app' })
      .where('app', router.matchers.slug())

    router
      .group(() => {
        router.get('members', [controllers.Members, 'index'])
        router.get('roles', [controllers.Roles, 'index'])
      })
      .prefix('environments/:environment')
      .where('environment', router.matchers.slug())
      .use(middleware.environment())
  })
  .prefix('w/:org')
  .where('org', router.matchers.slug())
  .use([middleware.auth(), middleware.organization()])
