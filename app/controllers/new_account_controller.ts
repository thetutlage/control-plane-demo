import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { signupValidator } from '#validators/user'
import OnboardingService from '#services/onboarding_service'

export default class NewAccountController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  @inject()
  async store({ request, response, auth }: HttpContext, onboarding: OnboardingService) {
    const { organizationName, organizationSlug, fullName, email, password } =
      await request.validateUsing(signupValidator)
    const { user, organization } = await onboarding.onboard({
      organizationName,
      organizationSlug,
      fullName,
      email,
      password,
    })

    await auth.use('web').login(user)
    response.redirect().toRoute('overview.show', { org: organization.slug })
  }
}
