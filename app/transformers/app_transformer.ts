import type App from '#models/app'
import { EnvironmentKind } from '#values/environment_kind'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class AppTransformer extends BaseTransformer<App> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'name', 'slug', 'clientId', 'appUrl']),
      createdAt: this.resource.createdAt.toFormat('d LLL yyyy'),
    }
  }

  /**
   * The app's client secret and URLs. Production secrets are shown
   * once, when the app is registered or its secret rotated. Every other
   * environment's secret stays viewable. Expects `environment` to be
   * preloaded.
   */
  forSettings() {
    const isProduction = this.resource.environment.kind === EnvironmentKind.PRODUCTION

    return {
      ...this.toObject(),
      ...this.pick(this.resource, ['redirectUris', 'postLogoutRedirectUris']),
      secretHint: this.resource.clientSecretHint,
      secret: isProduction ? null : this.resource.secret,
    }
  }
}
