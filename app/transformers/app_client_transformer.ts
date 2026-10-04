import type AppClient from '#models/app_client'
import type Organization from '#models/organization'
import { EnvironmentKind } from '#values/environment_kind'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class AppClientTransformer extends BaseTransformer<AppClient> {
  /**
   * The client's organization, with its environments loaded
   */
  #organization: Organization

  constructor(resource: AppClient, organization: Organization) {
    super(resource)
    this.#organization = organization
  }

  /**
   * Production secrets are shown once, when the client is created. Every
   * other environment's secret stays viewable.
   */
  toObject() {
    const environment = this.#organization.environments.find(
      ({ id }) => id === this.resource.environmentId
    )!
    const isProduction = environment.kind === EnvironmentKind.PRODUCTION

    return {
      ...this.pick(this.resource, [
        'id',
        'environmentId',
        'clientId',
        'appUrl',
        'redirectUris',
        'postLogoutRedirectUris',
      ]),
      issuerUrl: environment.issuerUrl(this.#organization.slug),
      secretHint: this.resource.clientSecretHint,
      secret: isProduction ? null : this.resource.secret,
    }
  }
}
