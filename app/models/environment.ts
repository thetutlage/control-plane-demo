import db from '@adonisjs/lucid/services/db'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { EnvironmentSchema } from '#database/schema'
import { ActorType } from '#values/actor_type'
import Organization from '#models/organization'
import Actor from '#models/actor'
import Member from '#models/member'
import AppClient from '#models/app_client'
import PermissionCatalog from '#models/permission_catalog'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import AuditEvent from '#models/audit_event'

export default class Environment extends EnvironmentSchema {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => Actor)
  declare actors: HasMany<typeof Actor>

  @hasMany(() => Member)
  declare members: HasMany<typeof Member>

  @hasMany(() => AppClient)
  declare appClients: HasMany<typeof AppClient>

  @hasOne(() => PermissionCatalog)
  declare permissionCatalog: HasOne<typeof PermissionCatalog>

  @hasMany(() => Role)
  declare roles: HasMany<typeof Role>

  @hasMany(() => RoleAssignment)
  declare roleAssignments: HasMany<typeof RoleAssignment>

  @hasMany(() => AuditEvent)
  declare auditEvents: HasMany<typeof AuditEvent>

  /**
   * Adds a member to this environment, together with the actor that
   * represents them in role assignments and audit events.
   */
  async createMember(values: Pick<Member, 'email' | 'fullName' | 'status'>) {
    return db.transaction(async (trx) => {
      const scope = { organizationId: this.organizationId, environmentId: this.id }

      const actor = await Actor.create({ ...scope, type: ActorType.MEMBER }, { client: trx })
      return Member.create({ ...values, ...scope, actorId: actor.id }, { client: trx })
    })
  }
}
