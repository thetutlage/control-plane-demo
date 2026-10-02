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
    'members.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'audit_events.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'overview.show': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'audit_events.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'overview.show': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'apps.index': { paramsTuple: [ParamValue]; params: {'org': ParamValue} }
    'members.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'roles.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
    'audit_events.index': { paramsTuple: [ParamValue,ParamValue]; params: {'org': ParamValue,'environment': ParamValue} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}