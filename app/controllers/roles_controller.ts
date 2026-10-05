import type { HttpContext } from '@adonisjs/core/http'
import type Organization from '#models/organization'
import { roleValidator } from '#validators/role'
import RoleTransformer from '#transformers/role_transformer'
import PermissionCatalogTransformer from '#transformers/permission_catalog_transformer'

/**
 * The organization's roles, used by every environment
 */
export default class RolesController {
  /**
   * The organization's catalogue, or null when none has been synced
   */
  #catalog(organization: Organization) {
    return organization.related('permissionCatalog').query().first()
  }

  /**
   * One of the organization's roles. Another organization's role is a 404.
   */
  #findRole(organization: Organization, id: string) {
    return organization.related('roles').query().where('id', id).firstOrFail()
  }

  async index({ inertia, organization }: HttpContext) {
    const roles = await organization.related('roles').query().orderBy('name', 'asc')
    const catalog = await this.#catalog(organization)
    const catalogKeys = catalog ? new Set(Object.keys(catalog.permissions)) : null

    return inertia.render('roles/index', {
      roles: RoleTransformer.transform(roles, catalogKeys),
      catalogSynced: catalog !== null,
    })
  }

  async create({ inertia, organization }: HttpContext) {
    const catalog = await this.#catalog(organization)

    return inertia.render('roles/create', {
      catalog: catalog ? PermissionCatalogTransformer.transform(catalog) : null,
    })
  }

  /**
   * Creates the role with keys from the catalogue. A role may have none:
   * it still decides who can sign in to an app.
   */
  async store({ request, response, session, organization }: HttpContext) {
    const catalog = await this.#catalog(organization)
    const payload = await request.validateUsing(roleValidator, {
      meta: {
        organizationId: organization.id,
        allowedKeys: catalog ? Object.keys(catalog.permissions) : [],
      },
    })
    const role = await organization.related('roles').create({
      name: payload.name,
      description: payload.description,
      permissions: payload.permissions ?? [],
    })

    session.flash('success', `Created ${role.name}.`)
    return response.redirect().toRoute('roles.index', { org: organization.slug })
  }

  async edit({ inertia, params, organization }: HttpContext) {
    const role = await this.#findRole(organization, params.role)
    const catalog = await this.#catalog(organization)
    const catalogKeys = catalog ? new Set(Object.keys(catalog.permissions)) : null

    const [holders] = await role.related('appMembers').query().count('* as total')

    return inertia.render('roles/edit', {
      role: RoleTransformer.transform(role, catalogKeys).useVariant('forEdit'),
      holdersCount: Number(holders.$extras.total),
      catalog: catalog ? PermissionCatalogTransformer.transform(catalog) : null,
    })
  }

  /**
   * Saves the role. Keys it holds that have left the catalogue may stay;
   * only catalogue keys may be added.
   */
  async update({ request, response, session, params, organization }: HttpContext) {
    const role = await this.#findRole(organization, params.role)
    const catalog = await this.#catalog(organization)
    const payload = await request.validateUsing(roleValidator, {
      meta: {
        organizationId: organization.id,
        roleId: role.id,
        allowedKeys: [...Object.keys(catalog?.permissions ?? {}), ...role.permissions],
      },
    })

    role.name = payload.name
    role.description = payload.description
    role.permissions = payload.permissions ?? []
    await role.save()

    session.flash('success', `Saved ${role.name}.`)
    return response.redirect().toRoute('roles.index', { org: organization.slug })
  }

  /**
   * Deletes the role in every environment. Members it was their only role
   * on an app lose access to that app, and are signed out of it.
   */
  async destroy({ response, session, params, organization }: HttpContext) {
    const role = await this.#findRole(organization, params.role)
    await role.deleteEverywhere()

    session.flash('success', `Deleted ${role.name}.`)
    return response.redirect().toRoute('roles.index', { org: organization.slug })
  }
}
