import type Environment from '#models/environment'
import { EnvironmentKind } from '#values/environment_kind'
import { BaseTransformer } from '@adonisjs/core/transformers'

const KIND_LABELS: Record<EnvironmentKind, string> = {
  [EnvironmentKind.DEVELOPMENT]: 'Development',
  [EnvironmentKind.STAGING]: 'Staging',
  [EnvironmentKind.PRODUCTION]: 'Production',
}

export default class EnvironmentTransformer extends BaseTransformer<Environment> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'name', 'slug']),
      kind: { raw: this.resource.kind, formatted: KIND_LABELS[this.resource.kind] },
      isProduction: this.resource.kind === EnvironmentKind.PRODUCTION,
    }
  }

  /**
   * Expects the query to load `withCount('members')`
   */
  forOverview() {
    return {
      ...this.toObject(),
      membersCount: Number(this.resource.$extras.members_count ?? 0),
    }
  }
}
