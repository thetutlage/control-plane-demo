import { hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { OrganizationSchema } from '#database/schema'
import User from '#models/user'
import Environment from '#models/environment'

export default class Organization extends OrganizationSchema {
  @manyToMany(() => User, {
    pivotTable: 'user_orgs',
    pivotTimestamps: { createdAt: 'created_at', updatedAt: false },
  })
  declare users: ManyToMany<typeof User>

  @hasMany(() => Environment)
  declare environments: HasMany<typeof Environment>
}
