import app from '@adonisjs/core/services/app'
import type Environment from '#models/environment'
import OnboardingService from '#services/onboarding_service'

/**
 * An organization that has just signed up: its user can sign in to the
 * console, and it has the default development, staging and production
 * environments, none of which has synced a catalogue yet.
 */
export async function setupOnboardedOrganization(options: { slug?: string; email?: string } = {}) {
  const slug = options.slug ?? 'acme'
  const onboarding = await app.container.make(OnboardingService)

  const { user, organization } = await onboarding.onboard({
    organizationName: `${slug} Inc.`,
    organizationSlug: slug,
    fullName: 'Ada Owner',
    email: options.email ?? `owner@${slug}.test`,
    password: 'secret1234',
  })

  const environments = await organization.related('environments').query()
  const bySlug = (environmentSlug: string): Environment => {
    const environment = environments.find((candidate) => candidate.slug === environmentSlug)
    if (!environment) {
      throw new Error(`Missing default environment "${environmentSlug}"`)
    }
    return environment
  }

  return {
    user,
    organization,
    development: bySlug('development'),
    staging: bySlug('staging'),
    production: bySlug('production'),
  }
}
