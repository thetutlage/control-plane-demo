import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Organization from '#models/organization'
import { EnvironmentKind } from '#values/environment_kind'

/**
 * Every organization starts with these environments. Each one is a fully
 * isolated sign-in realm with its own members, roles and keys.
 */
const DEFAULT_ENVIRONMENTS = [
  { name: 'Development', slug: 'development', kind: EnvironmentKind.DEVELOPMENT },
  { name: 'Staging', slug: 'staging', kind: EnvironmentKind.STAGING },
  { name: 'Production', slug: 'production', kind: EnvironmentKind.PRODUCTION },
]

/**
 * Signs someone up for the control plane: creates their user account, their
 * first organization with its default environments (each with a signing
 * key), and links the two, all or nothing.
 */
export default class OnboardingService {
  async onboard(signup: {
    organizationName: string
    organizationSlug: string
    fullName: string | null
    email: string
    password: string
  }): Promise<{ user: User; organization: Organization }> {
    return db.transaction(async (trx) => {
      const user = await User.create(
        { fullName: signup.fullName, email: signup.email, password: signup.password },
        { client: trx }
      )
      const organization = await Organization.create(
        { name: signup.organizationName, slug: signup.organizationSlug },
        { client: trx }
      )

      const environments = await organization
        .related('environments')
        .createMany(DEFAULT_ENVIRONMENTS)
      for (const environment of environments) {
        await environment.createSigningKey()
      }
      await organization.related('users').attach([user.id])

      return { user, organization }
    })
  }
}
