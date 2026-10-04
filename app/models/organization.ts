import { hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { OrganizationSchema } from '#database/schema'
import User from '#models/user'
import Member from '#models/member'
import Environment from '#models/environment'
import App from '#models/app'
import AppClient from '#models/app_client'

export default class Organization extends OrganizationSchema {
  @manyToMany(() => User, {
    pivotTable: 'user_orgs',
    pivotTimestamps: { createdAt: 'created_at', updatedAt: false },
  })
  declare users: ManyToMany<typeof User>

  @hasMany(() => Environment)
  declare environments: HasMany<typeof Environment>

  /**
   * Members of every environment, for organization-wide lookups
   */
  @hasMany(() => Member)
  declare members: HasMany<typeof Member>

  @hasMany(() => App)
  declare apps: HasMany<typeof App>

  /**
   * Clients of every app, in every environment
   */
  @hasMany(() => AppClient)
  declare appClients: HasMany<typeof AppClient>
}
