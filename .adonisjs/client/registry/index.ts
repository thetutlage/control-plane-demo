/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['home']['types'],
  },
  'new_account.create': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.create']['types'],
  },
  'new_account.store': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.store']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.store']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['session.destroy']['types'],
  },
  'organizations.index': {
    methods: ["GET","HEAD"],
    pattern: '/w',
    tokens: [{"old":"/w","type":0,"val":"w","end":""}],
    types: placeholder as Registry['organizations.index']['types'],
  },
  'overview.show': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/overview',
    tokens: [{"old":"/w/:org/overview","type":0,"val":"w","end":""},{"old":"/w/:org/overview","type":1,"val":"org","end":""},{"old":"/w/:org/overview","type":0,"val":"overview","end":""}],
    types: placeholder as Registry['overview.show']['types'],
  },
  'apps.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/apps',
    tokens: [{"old":"/w/:org/apps","type":0,"val":"w","end":""},{"old":"/w/:org/apps","type":1,"val":"org","end":""},{"old":"/w/:org/apps","type":0,"val":"apps","end":""}],
    types: placeholder as Registry['apps.index']['types'],
  },
  'members.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/environments/:environment/members',
    tokens: [{"old":"/w/:org/environments/:environment/members","type":0,"val":"w","end":""},{"old":"/w/:org/environments/:environment/members","type":1,"val":"org","end":""},{"old":"/w/:org/environments/:environment/members","type":0,"val":"environments","end":""},{"old":"/w/:org/environments/:environment/members","type":1,"val":"environment","end":""},{"old":"/w/:org/environments/:environment/members","type":0,"val":"members","end":""}],
    types: placeholder as Registry['members.index']['types'],
  },
  'roles.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/environments/:environment/roles',
    tokens: [{"old":"/w/:org/environments/:environment/roles","type":0,"val":"w","end":""},{"old":"/w/:org/environments/:environment/roles","type":1,"val":"org","end":""},{"old":"/w/:org/environments/:environment/roles","type":0,"val":"environments","end":""},{"old":"/w/:org/environments/:environment/roles","type":1,"val":"environment","end":""},{"old":"/w/:org/environments/:environment/roles","type":0,"val":"roles","end":""}],
    types: placeholder as Registry['roles.index']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
