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
    'apps.settings': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'apps.clients.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'apps.clients.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'members.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.clients.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'client': ParamValue} }
    'apps.clients.update': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'client': ParamValue} }
    'apps.clients.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'client': ParamValue} }
    'apps.clients.rotate_secret': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'client': ParamValue} }
    'members.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
    'members.sign_out_everywhere': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
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
    'apps.settings': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'apps.clients.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'members.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.clients.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'client': ParamValue} }
    'members.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
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
    'apps.settings': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'apps.clients.create': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'members.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.create': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.clients.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'client': ParamValue} }
    'members.show': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
    'sign_in.show': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'apps.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.clients.store': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'app': ParamValue} }
    'members.store': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.clients.rotate_secret': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'client': ParamValue} }
    'members.sign_out_everywhere': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'member': ParamValue} }
    'sign_in.store': { paramsTuple: [ParamValue]; params: {'signInId': ParamValue} }
  }
  PUT: {
    'apps.clients.update': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'client': ParamValue} }
  }
  PATCH: {
    'apps.clients.update': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'client': ParamValue} }
  }
  DELETE: {
    'apps.clients.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'client': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}