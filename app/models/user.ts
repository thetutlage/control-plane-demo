import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { UserSchema } from '#database/schema'
import Organization from '#models/organization'

/**
 * A control plane account: someone who signed up and runs the console for
 * one or more organizations.
 */
export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  @manyToMany(() => Organization, {
    pivotTable: 'user_orgs',
    pivotTimestamps: { createdAt: 'created_at', updatedAt: false },
  })
  declare organizations: ManyToMany<typeof Organization>

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
