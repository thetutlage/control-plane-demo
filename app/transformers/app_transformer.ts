import type App from '#models/app'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class AppTransformer extends BaseTransformer<App> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'name', 'slug']),
      createdAt: this.resource.createdAt.toFormat('d LLL yyyy'),
    }
  }
}
