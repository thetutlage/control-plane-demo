import type { HttpContext } from '@adonisjs/core/http'
import RoleTransformer from '#transformers/role_transformer'

export default class RolesController {
  async index({ inertia, environment }: HttpContext) {
    const roles = await environment.related('roles').query().orderBy('name', 'asc')
    const catalog = await environment.related('permissionCatalog').query().first()
    const catalogKeys = catalog ? new Set(Object.keys(catalog.permissions)) : null

    return inertia.render('roles/index', {
      roles: RoleTransformer.transform(roles, catalogKeys),
      catalogSynced: catalog !== null,
    })
  }
}
