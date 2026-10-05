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
  'organizations.show': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org',
    tokens: [{"old":"/w/:org","type":0,"val":"w","end":""},{"old":"/w/:org","type":1,"val":"org","end":""}],
    types: placeholder as Registry['organizations.show']['types'],
  },
  'overview.show': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/:environment/overview',
    tokens: [{"old":"/w/:org/:environment/overview","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/overview","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/overview","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/overview","type":0,"val":"overview","end":""}],
    types: placeholder as Registry['overview.show']['types'],
  },
  'apps.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/:environment/apps',
    tokens: [{"old":"/w/:org/:environment/apps","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/apps","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/apps","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/apps","type":0,"val":"apps","end":""}],
    types: placeholder as Registry['apps.index']['types'],
  },
  'apps.create': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/:environment/apps/create',
    tokens: [{"old":"/w/:org/:environment/apps/create","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/apps/create","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/apps/create","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/apps/create","type":0,"val":"apps","end":""},{"old":"/w/:org/:environment/apps/create","type":0,"val":"create","end":""}],
    types: placeholder as Registry['apps.create']['types'],
  },
  'apps.store': {
    methods: ["POST"],
    pattern: '/w/:org/:environment/apps',
    tokens: [{"old":"/w/:org/:environment/apps","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/apps","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/apps","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/apps","type":0,"val":"apps","end":""}],
    types: placeholder as Registry['apps.store']['types'],
  },
  'apps.show': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/:environment/apps/:app',
    tokens: [{"old":"/w/:org/:environment/apps/:app","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/apps/:app","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/apps/:app","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/apps/:app","type":0,"val":"apps","end":""},{"old":"/w/:org/:environment/apps/:app","type":1,"val":"app","end":""}],
    types: placeholder as Registry['apps.show']['types'],
  },
  'apps.destroy': {
    methods: ["DELETE"],
    pattern: '/w/:org/:environment/apps/:app',
    tokens: [{"old":"/w/:org/:environment/apps/:app","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/apps/:app","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/apps/:app","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/apps/:app","type":0,"val":"apps","end":""},{"old":"/w/:org/:environment/apps/:app","type":1,"val":"app","end":""}],
    types: placeholder as Registry['apps.destroy']['types'],
  },
  'app_members.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/:environment/apps/:app/members',
    tokens: [{"old":"/w/:org/:environment/apps/:app/members","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/apps/:app/members","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/apps/:app/members","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/apps/:app/members","type":0,"val":"apps","end":""},{"old":"/w/:org/:environment/apps/:app/members","type":1,"val":"app","end":""},{"old":"/w/:org/:environment/apps/:app/members","type":0,"val":"members","end":""}],
    types: placeholder as Registry['app_members.index']['types'],
  },
  'app_settings.show': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/:environment/apps/:app/settings',
    tokens: [{"old":"/w/:org/:environment/apps/:app/settings","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/apps/:app/settings","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/apps/:app/settings","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/apps/:app/settings","type":0,"val":"apps","end":""},{"old":"/w/:org/:environment/apps/:app/settings","type":1,"val":"app","end":""},{"old":"/w/:org/:environment/apps/:app/settings","type":0,"val":"settings","end":""}],
    types: placeholder as Registry['app_settings.show']['types'],
  },
  'app_settings.edit': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/:environment/apps/:app/settings/edit',
    tokens: [{"old":"/w/:org/:environment/apps/:app/settings/edit","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/apps/:app/settings/edit","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/apps/:app/settings/edit","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/apps/:app/settings/edit","type":0,"val":"apps","end":""},{"old":"/w/:org/:environment/apps/:app/settings/edit","type":1,"val":"app","end":""},{"old":"/w/:org/:environment/apps/:app/settings/edit","type":0,"val":"settings","end":""},{"old":"/w/:org/:environment/apps/:app/settings/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['app_settings.edit']['types'],
  },
  'app_settings.update': {
    methods: ["PUT"],
    pattern: '/w/:org/:environment/apps/:app/settings',
    tokens: [{"old":"/w/:org/:environment/apps/:app/settings","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/apps/:app/settings","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/apps/:app/settings","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/apps/:app/settings","type":0,"val":"apps","end":""},{"old":"/w/:org/:environment/apps/:app/settings","type":1,"val":"app","end":""},{"old":"/w/:org/:environment/apps/:app/settings","type":0,"val":"settings","end":""}],
    types: placeholder as Registry['app_settings.update']['types'],
  },
  'app_secrets.store': {
    methods: ["POST"],
    pattern: '/w/:org/:environment/apps/:app/secret',
    tokens: [{"old":"/w/:org/:environment/apps/:app/secret","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/apps/:app/secret","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/apps/:app/secret","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/apps/:app/secret","type":0,"val":"apps","end":""},{"old":"/w/:org/:environment/apps/:app/secret","type":1,"val":"app","end":""},{"old":"/w/:org/:environment/apps/:app/secret","type":0,"val":"secret","end":""}],
    types: placeholder as Registry['app_secrets.store']['types'],
  },
  'members.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/:environment/members',
    tokens: [{"old":"/w/:org/:environment/members","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/members","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/members","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/members","type":0,"val":"members","end":""}],
    types: placeholder as Registry['members.index']['types'],
  },
  'members.create': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/:environment/members/create',
    tokens: [{"old":"/w/:org/:environment/members/create","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/members/create","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/members/create","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/members/create","type":0,"val":"members","end":""},{"old":"/w/:org/:environment/members/create","type":0,"val":"create","end":""}],
    types: placeholder as Registry['members.create']['types'],
  },
  'members.store': {
    methods: ["POST"],
    pattern: '/w/:org/:environment/members',
    tokens: [{"old":"/w/:org/:environment/members","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/members","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/members","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/members","type":0,"val":"members","end":""}],
    types: placeholder as Registry['members.store']['types'],
  },
  'members.show': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/:environment/members/:member',
    tokens: [{"old":"/w/:org/:environment/members/:member","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/members/:member","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/members/:member","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/members/:member","type":0,"val":"members","end":""},{"old":"/w/:org/:environment/members/:member","type":1,"val":"member","end":""}],
    types: placeholder as Registry['members.show']['types'],
  },
  'member_sessions.destroy': {
    methods: ["DELETE"],
    pattern: '/w/:org/:environment/members/:member/sessions',
    tokens: [{"old":"/w/:org/:environment/members/:member/sessions","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/members/:member/sessions","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/members/:member/sessions","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/members/:member/sessions","type":0,"val":"members","end":""},{"old":"/w/:org/:environment/members/:member/sessions","type":1,"val":"member","end":""},{"old":"/w/:org/:environment/members/:member/sessions","type":0,"val":"sessions","end":""}],
    types: placeholder as Registry['member_sessions.destroy']['types'],
  },
  'roles.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/:environment/roles',
    tokens: [{"old":"/w/:org/:environment/roles","type":0,"val":"w","end":""},{"old":"/w/:org/:environment/roles","type":1,"val":"org","end":""},{"old":"/w/:org/:environment/roles","type":1,"val":"environment","end":""},{"old":"/w/:org/:environment/roles","type":0,"val":"roles","end":""}],
    types: placeholder as Registry['roles.index']['types'],
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
