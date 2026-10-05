import type PermissionCatalog from '#models/permission_catalog'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PermissionCatalogTransformer extends BaseTransformer<PermissionCatalog> {
  /**
   * The catalogue's keys, sorted, each with its description
   */
  toObject() {
    return {
      permissions: Object.entries(this.resource.permissions)
        .map(([key, { description }]) => ({ key, description: description ?? null }))
        .sort((a, b) => a.key.localeCompare(b.key)),
      syncedAt: this.resource.syncedAt?.toFormat('d LLL yyyy, HH:mm') ?? null,
    }
  }
}
