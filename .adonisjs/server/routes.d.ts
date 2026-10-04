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
    'overview.show': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'apps.clients.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'apps.clients.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'members.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'members.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'members.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'sign_in.show': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
    'sign_in.store': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'overview.show': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'apps.clients.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'members.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'members.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'sign_in.show': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'overview.show': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'apps.clients.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'members.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'members.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'sign_in.show': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'apps.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.clients.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'members.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'sign_in.store': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}