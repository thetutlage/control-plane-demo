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
  'apps.create': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/apps/create',
    tokens: [{"old":"/w/:org/apps/create","type":0,"val":"w","end":""},{"old":"/w/:org/apps/create","type":1,"val":"org","end":""},{"old":"/w/:org/apps/create","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/create","type":0,"val":"create","end":""}],
    types: placeholder as Registry['apps.create']['types'],
  },
  'apps.store': {
    methods: ["POST"],
    pattern: '/w/:org/apps',
    tokens: [{"old":"/w/:org/apps","type":0,"val":"w","end":""},{"old":"/w/:org/apps","type":1,"val":"org","end":""},{"old":"/w/:org/apps","type":0,"val":"apps","end":""}],
    types: placeholder as Registry['apps.store']['types'],
  },
  'apps.show': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/apps/:app',
    tokens: [{"old":"/w/:org/apps/:app","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app","type":1,"val":"app","end":""}],
    types: placeholder as Registry['apps.show']['types'],
  },
  'apps.settings': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/apps/:app/settings',
    tokens: [{"old":"/w/:org/apps/:app/settings","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/settings","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/settings","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/settings","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/settings","type":0,"val":"settings","end":""}],
    types: placeholder as Registry['apps.settings']['types'],
  },
  'apps.clients.create': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/apps/:app/clients/create',
    tokens: [{"old":"/w/:org/apps/:app/clients/create","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/clients/create","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/clients/create","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/clients/create","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/clients/create","type":0,"val":"clients","end":""},{"old":"/w/:org/apps/:app/clients/create","type":0,"val":"create","end":""}],
    types: placeholder as Registry['apps.clients.create']['types'],
  },
  'apps.clients.store': {
    methods: ["POST"],
    pattern: '/w/:org/apps/:app/clients',
    tokens: [{"old":"/w/:org/apps/:app/clients","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/clients","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/clients","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/clients","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/clients","type":0,"val":"clients","end":""}],
    types: placeholder as Registry['apps.clients.store']['types'],
  },
  'members.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/members',
    tokens: [{"old":"/w/:org/members","type":0,"val":"w","end":""},{"old":"/w/:org/members","type":1,"val":"org","end":""},{"old":"/w/:org/members","type":0,"val":"members","end":""}],
    types: placeholder as Registry['members.index']['types'],
  },
  'members.create': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/members/create',
    tokens: [{"old":"/w/:org/members/create","type":0,"val":"w","end":""},{"old":"/w/:org/members/create","type":1,"val":"org","end":""},{"old":"/w/:org/members/create","type":0,"val":"members","end":""},{"old":"/w/:org/members/create","type":0,"val":"create","end":""}],
    types: placeholder as Registry['members.create']['types'],
  },
  'members.store': {
    methods: ["POST"],
    pattern: '/w/:org/members',
    tokens: [{"old":"/w/:org/members","type":0,"val":"w","end":""},{"old":"/w/:org/members","type":1,"val":"org","end":""},{"old":"/w/:org/members","type":0,"val":"members","end":""}],
    types: placeholder as Registry['members.store']['types'],
  },
  'roles.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/roles',
    tokens: [{"old":"/w/:org/roles","type":0,"val":"w","end":""},{"old":"/w/:org/roles","type":1,"val":"org","end":""},{"old":"/w/:org/roles","type":0,"val":"roles","end":""}],
    types: placeholder as Registry['roles.index']['types'],
  },
  'apps.clients.edit': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/clients/:client/edit',
    tokens: [{"old":"/w/:org/clients/:client/edit","type":0,"val":"w","end":""},{"old":"/w/:org/clients/:client/edit","type":1,"val":"org","end":""},{"old":"/w/:org/clients/:client/edit","type":0,"val":"clients","end":""},{"old":"/w/:org/clients/:client/edit","type":1,"val":"client","end":""},{"old":"/w/:org/clients/:client/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['apps.clients.edit']['types'],
  },
  'apps.clients.update': {
    methods: ["PUT","PATCH"],
    pattern: '/w/:org/clients/:client',
    tokens: [{"old":"/w/:org/clients/:client","type":0,"val":"w","end":""},{"old":"/w/:org/clients/:client","type":1,"val":"org","end":""},{"old":"/w/:org/clients/:client","type":0,"val":"clients","end":""},{"old":"/w/:org/clients/:client","type":1,"val":"client","end":""}],
    types: placeholder as Registry['apps.clients.update']['types'],
  },
  'apps.clients.destroy': {
    methods: ["DELETE"],
    pattern: '/w/:org/clients/:client',
    tokens: [{"old":"/w/:org/clients/:client","type":0,"val":"w","end":""},{"old":"/w/:org/clients/:client","type":1,"val":"org","end":""},{"old":"/w/:org/clients/:client","type":0,"val":"clients","end":""},{"old":"/w/:org/clients/:client","type":1,"val":"client","end":""}],
    types: placeholder as Registry['apps.clients.destroy']['types'],
  },
  'apps.clients.rotate_secret': {
    methods: ["POST"],
    pattern: '/w/:org/clients/:client/secret',
    tokens: [{"old":"/w/:org/clients/:client/secret","type":0,"val":"w","end":""},{"old":"/w/:org/clients/:client/secret","type":1,"val":"org","end":""},{"old":"/w/:org/clients/:client/secret","type":0,"val":"clients","end":""},{"old":"/w/:org/clients/:client/secret","type":1,"val":"client","end":""},{"old":"/w/:org/clients/:client/secret","type":0,"val":"secret","end":""}],
    types: placeholder as Registry['apps.clients.rotate_secret']['types'],
  },
  'members.show': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/members/:member',
    tokens: [{"old":"/w/:org/members/:member","type":0,"val":"w","end":""},{"old":"/w/:org/members/:member","type":1,"val":"org","end":""},{"old":"/w/:org/members/:member","type":0,"val":"members","end":""},{"old":"/w/:org/members/:member","type":1,"val":"member","end":""}],
    types: placeholder as Registry['members.show']['types'],
  },
  'members.sign_out_everywhere': {
    methods: ["POST"],
    pattern: '/w/:org/members/:member/sign-out',
    tokens: [{"old":"/w/:org/members/:member/sign-out","type":0,"val":"w","end":""},{"old":"/w/:org/members/:member/sign-out","type":1,"val":"org","end":""},{"old":"/w/:org/members/:member/sign-out","type":0,"val":"members","end":""},{"old":"/w/:org/members/:member/sign-out","type":1,"val":"member","end":""},{"old":"/w/:org/members/:member/sign-out","type":0,"val":"sign-out","end":""}],
    types: placeholder as Registry['members.sign_out_everywhere']['types'],
  },
  'sign_in.show': {
    methods: ["GET","HEAD"],
    pattern: '/sign-in/:signInId',
    tokens: [{"old":"/sign-in/:signInId","type":0,"val":"sign-in","end":""},{"old":"/sign-in/:signInId","type":1,"val":"signInId","end":""}],
    types: placeholder as Registry['sign_in.show']['types'],
  },
  'sign_in.store': {
    methods: ["POST"],
    pattern: '/sign-in/:signInId',
    tokens: [{"old":"/sign-in/:signInId","type":0,"val":"sign-in","end":""},{"old":"/sign-in/:signInId","type":1,"val":"signInId","end":""}],
    types: placeholder as Registry['sign_in.store']['types'],
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
