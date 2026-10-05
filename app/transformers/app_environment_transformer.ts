import type AppEnvironment from '#models/app_environment'
import { EnvironmentKind } from '#values/environment_kind'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * An app's setup in one environment. Production secrets are shown once,
 * when the app is set up there or its secret rotated. Every other
 * environment's secret stays viewable. Expects `environment` to be
 * preloaded.
 */
export default class AppEnvironmentTransformer extends BaseTransformer<AppEnvironment> {
  toObject() {
    const isProduction = this.resource.environment.kind === EnvironmentKind.PRODUCTION

    return {
      ...this.pick(this.resource, [
        'id',
        'clientId',
        'appUrl',
        'redirectUris',
        'postLogoutRedirectUris',
      ]),
      secretHint: this.resource.clientSecretHint,
      secret: isProduction ? null : this.resource.secret,
    }
  }
}
