import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'forward_provider_answer': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'overview.show': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'apps.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'app_environments.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_environments.create': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_environments.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_environments.edit': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_environments.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_environments.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_secrets.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_members.create': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_members.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_members.edit': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'app_members.update': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'app_members.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'members.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
    'member_sessions.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
    'members.password_resets.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
    'members.identities.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue,'identity': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'roles.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'roles.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'roles.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'role': ParamValue} }
    'roles.update': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'role': ParamValue} }
    'roles.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'role': ParamValue} }
    'environments.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'identity_providers.update': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'identity_providers.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'identity_providers.members.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'identity_providers.members.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'identity_providers.members.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue,'member': ParamValue} }
    'sign_in.show': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'sign_in.store': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'sign_in.destroy': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'redirect_to_provider': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'sign_in_with_provider': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'password_resets.create': { paramsTuple?: []; params?: {} }
    'password_resets.store': { paramsTuple?: []; params?: {} }
    'password_resets.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'password_resets.update': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'forward_provider_answer': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'overview.show': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'app_environments.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_environments.create': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_environments.edit': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_members.create': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_members.edit': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'members.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'roles.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'roles.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'role': ParamValue} }
    'environments.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'identity_providers.members.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'sign_in.show': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'sign_in_with_provider': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'password_resets.create': { paramsTuple?: []; params?: {} }
    'password_resets.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'forward_provider_answer': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'overview.show': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'app_environments.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_environments.create': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_environments.edit': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_members.create': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_members.edit': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'members.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'roles.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'roles.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'role': ParamValue} }
    'environments.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'identity_providers.members.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'sign_in.show': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'sign_in_with_provider': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'password_resets.create': { paramsTuple?: []; params?: {} }
    'password_resets.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'apps.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'app_environments.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_secrets.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_members.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'members.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.password_resets.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
    'roles.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'identity_providers.members.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'sign_in.store': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'redirect_to_provider': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'password_resets.store': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'apps.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'app_environments.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_members.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'member_sessions.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
    'members.identities.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue,'identity': ParamValue} }
    'roles.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'role': ParamValue} }
    'identity_providers.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'identity_providers.members.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue,'member': ParamValue} }
    'sign_in.destroy': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
  }
  PUT: {
    'app_environments.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue} }
    'app_members.update': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'roles.update': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'role': ParamValue} }
    'identity_providers.update': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'password_resets.update': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
  PATCH: {
    'app_members.update': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'roles.update': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'role': ParamValue} }
    'identity_providers.update': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'provider': ParamValue} }
    'password_resets.update': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}