import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import App from '#models/app'
import Actor from '#models/actor'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import { ActorType } from '#values/actor_type'
import { MemberStatus } from '#values/member_status'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

/**
 * The composite foreign keys must make cross-environment and cross-tenant
 * rows impossible, even for code that bypasses the console's scoping.
 */
test.group('Database environment boundaries', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a staging member cannot be assigned a production role', async ({ assert }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const productionRole = await Role.create({
      organizationId: acme.organization.id,
      environmentId: acme.production.id,
      name: 'Finance',
      description: null,
      permissions: [],
    })
    const stagingMember = await acme.staging.createMember({
      email: 'ada@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })

    await assert.rejects(
      () =>
        RoleAssignment.create({
          organizationId: acme.organization.id,
          environmentId: acme.production.id,
          roleId: productionRole.id,
          actorId: stagingMember.actorId,
          expiresAt: null,
        }),
      /role_assignments_environment_id_actor_id_foreign/
    )
  })

  test('an app of one organization cannot get a client in another organization’s environment', async ({
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const globexApp = await App.create({
      organizationId: globex.organization.id,
      name: 'Billing',
      slug: 'billing',
    })

    await assert.rejects(
      () =>
        acme.production.createAppClient(globexApp, {
          appUrl: 'https://billing.globex.test',
          redirectUris: [],
        }),
      /app_clients_organization_id_app_id_foreign/
    )
  })

  test('a row’s organization must match its environment’s organization', async ({ assert }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })

    await assert.rejects(
      () =>
        Actor.create({
          organizationId: globex.organization.id,
          environmentId: acme.production.id,
          type: ActorType.MEMBER,
        }),
      /actors_organization_id_environment_id_foreign/
    )
  })
})
