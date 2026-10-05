import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import App from '#models/app'
import Actor from '#models/actor'
import Member from '#models/member'
import AppMember from '#models/app_member'
import { ActorType } from '#values/actor_type'
import { MemberStatus } from '#values/member_status'
import { setupApp } from '#tests/helpers/oidc'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

/**
 * The composite foreign keys must make cross-environment and cross-tenant
 * rows impossible, even for code that bypasses the console's scoping.
 */
test.group('Database environment boundaries', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an app cannot be set up in another organization’s environment', async ({ assert }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const globexApp = await App.create({
      organizationId: globex.organization.id,
      name: 'Billing',
      slug: 'billing',
    })

    await assert.rejects(
      () =>
        acme.production.setUpApp(globexApp, {
          appUrl: 'https://billing.globex.test',
          redirectUris: [],
        }),
      /app_environments_organization_id_app_id_foreign/
    )
  })

  test('access cannot be given to an app not set up in that environment', async ({ assert }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const stagingSetup = await setupApp(acme.staging)
    const member = await acme.organization.createMember({
      email: 'ada@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })

    await assert.rejects(
      () =>
        AppMember.create({
          organizationId: acme.organization.id,
          environmentId: acme.production.id,
          actorId: member.actorId,
          appId: stagingSetup.appId,
        }),
      /app_members_environment_id_app_id_foreign/
    )
  })

  test('a role of another organization cannot be held on an app', async ({ assert }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const setup = await setupApp(acme.production)
    const member = await acme.organization.createMember({
      email: 'ada@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })
    const appMember = await AppMember.create({
      organizationId: acme.organization.id,
      environmentId: acme.production.id,
      actorId: member.actorId,
      appId: setup.appId,
    })
    const globexRole = await globex.organization
      .related('roles')
      .create({ name: 'Admin', permissions: [] })

    await assert.rejects(
      () => appMember.syncRoles([globexRole.id]),
      /app_member_roles_organization_id_role_id_foreign/
    )
  })

  test('a member’s actor must belong to the member’s organization', async ({ assert }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const globexActor = await Actor.create({
      organizationId: globex.organization.id,
      type: ActorType.MEMBER,
    })

    await assert.rejects(
      () =>
        Member.create({
          organizationId: acme.organization.id,
          actorId: globexActor.id,
          email: 'ada@acme.test',
          fullName: null,
          status: MemberStatus.ACTIVE,
        }),
      /members_organization_id_actor_id_foreign/
    )
  })
})
