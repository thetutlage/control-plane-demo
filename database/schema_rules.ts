import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

/**
 * Integer-backed enum column typed with its `as const` object from
 * `app/values`.
 */
const valueColumn = (name: string, file: string) => ({
  tsType: name,
  decorators: [{ name: '@column' }],
  imports: [{ source: `#values/${file}`, typeImports: [name] }],
})

export default {
  types: {
    /**
     * pg returns int8 as a string to avoid precision loss
     */
    bigint: {
      tsType: 'string',
      decorators: [{ name: '@column' }],
    },
  },
  columns: {
    metadata: {
      tsType: 'Record<string, unknown>',
      decorators: [{ name: '@column' }],
    },
  },
  tables: {
    environments: {
      columns: { kind: valueColumn('EnvironmentKind', 'environment_kind') },
    },
    members: {
      columns: { status: valueColumn('MemberStatus', 'member_status') },
    },
    actors: {
      columns: { type: valueColumn('ActorType', 'actor_type') },
    },
    permission_catalogs: {
      columns: {
        permissions: {
          tsType: 'Record<string, { description?: string }>',
          decorators: [{ name: '@column' }],
        },
      },
    },
    roles: {
      columns: {
        permissions: { tsType: 'string[]', decorators: [{ name: '@column' }] },
      },
    },
    app_environments: {
      columns: {
        redirect_uris: { tsType: 'string[]', decorators: [{ name: '@column' }] },
        post_logout_redirect_uris: { tsType: 'string[]', decorators: [{ name: '@column' }] },
      },
    },
    identity_providers: {
      columns: {
        kind: valueColumn('IdentityProviderKind', 'identity_provider_kind'),
      },
    },
  },
  primaryKey: undefined,
} satisfies SchemaRules
