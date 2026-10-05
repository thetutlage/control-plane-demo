import type Role from '#models/role'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class RoleTransformer extends BaseTransformer<Role> {
  /**
   * Keys of the organization's permission catalogue, or null when it has
   * not synced one yet
   */
  #catalogKeys: Set<string> | null

  constructor(resource: Role, catalogKeys: Set<string> | null) {
    super(resource)
    this.#catalogKeys = catalogKeys
  }

  toObject() {
    const catalogKeys = this.#catalogKeys

    return {
      ...this.pick(this.resource, ['id', 'name', 'description']),
      permissionsCount: this.resource.permissions.length,
      missingKeys: catalogKeys
        ? this.resource.permissions.filter((key) => !catalogKeys.has(key))
        : [],
    }
  }

  /**
   * The role with its keys, for the edit form
   */
  forEdit() {
    return {
      ...this.toObject(),
      permissions: this.resource.permissions,
    }
  }
}
