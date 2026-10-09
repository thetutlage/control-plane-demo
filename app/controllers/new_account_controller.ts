import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { signupValidator } from '#validators/user'
import OnboardingService from '#services/onboarding_service'

export default class NewAccountController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  @inject()
  async store({ request, response, auth, audit }: HttpContext, onboarding: OnboardingService) {
    const { organizationName, organizationSlug, fullName, email, password } =
      await request.validateUsing(signupValidator)
    /**
     * The organization doesn't exist until the transaction creates it,
     * so the event's batch is made inside, once its ID is known
     */
    const { user, organization } = await db.transaction(async (trx) => {
      const created = await onboarding.onboard(
        { organizationName, organizationSlug, fullName, email, password },
        trx
      )
      const batch = audit.with({ organizationId: created.organization.id }).batch()
      batch.record('configuration.organization_created', created.user, created.organization)
      await batch.flush({ client: trx })
      return created
    })

    await auth.use('web').login(user)
    response.redirect().toRoute('overview.show', { org: organization.slug })
  }
}
