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
   * The environment's issuer URL and how many apps are set up in it.
   * Expects `organization` to be preloaded and the query to load
   * `withCount('appEnvironments')`.
   */
  forSettings() {
    return {
      ...this.toObject(),
      issuerUrl: this.resource.issuerUrl(this.resource.organization.slug),
      appsCount: Number(this.resource.$extras.appEnvironments_count ?? 0),
    }
  }
}
