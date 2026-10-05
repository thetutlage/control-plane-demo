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
    'organizations.show': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'overview.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'apps.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'apps.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'apps.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'apps.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'apps.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'app_members.index': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'app_settings.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'app_settings.edit': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'app_settings.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'app_secrets.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'members.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'members.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'members.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'members.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'member_sessions.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'sign_in.show': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'sign_in.store': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'organizations.show': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'overview.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'apps.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'apps.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'apps.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'app_members.index': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'app_settings.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'app_settings.edit': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'members.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'members.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'members.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'sign_in.show': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'organizations.show': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'overview.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'apps.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'apps.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'apps.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'app_members.index': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'app_settings.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'app_settings.edit': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'members.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'members.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'members.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'member': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'sign_in.show': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'apps.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'app_secrets.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'members.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'sign_in.store': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
  }
  DELETE: {
    'apps.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
    'member_sessions.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'member': ParamValue} }
  }
  PUT: {
    'app_settings.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue,'app': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}