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
  'sign_in_callbacks.show': {
    methods: ["GET","HEAD"],
    pattern: '/sign-in/callback/:org',
    tokens: [{"old":"/sign-in/callback/:org","type":0,"val":"sign-in","end":""},{"old":"/sign-in/callback/:org","type":0,"val":"callback","end":""},{"old":"/sign-in/callback/:org","type":1,"val":"org","end":""}],
    types: placeholder as Registry['sign_in_callbacks.show']['types'],
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
  'apps.destroy': {
    methods: ["DELETE"],
    pattern: '/w/:org/apps/:app',
    tokens: [{"old":"/w/:org/apps/:app","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app","type":1,"val":"app","end":""}],
    types: placeholder as Registry['apps.destroy']['types'],
  },
  'app_environments.show': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/apps/:app/environments/:environment',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"environment","end":""}],
    types: placeholder as Registry['app_environments.show']['types'],
  },
  'app_environments.create': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/apps/:app/environments/:environment/create',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment/create","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment/create","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment/create","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment/create","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment/create","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment/create","type":1,"val":"environment","end":""},{"old":"/w/:org/apps/:app/environments/:environment/create","type":0,"val":"create","end":""}],
    types: placeholder as Registry['app_environments.create']['types'],
  },
  'app_environments.store': {
    methods: ["POST"],
    pattern: '/w/:org/apps/:app/environments/:environment',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"environment","end":""}],
    types: placeholder as Registry['app_environments.store']['types'],
  },
  'app_environments.edit': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/apps/:app/environments/:environment/edit',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment/edit","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment/edit","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment/edit","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment/edit","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment/edit","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment/edit","type":1,"val":"environment","end":""},{"old":"/w/:org/apps/:app/environments/:environment/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['app_environments.edit']['types'],
  },
  'app_environments.update': {
    methods: ["PUT"],
    pattern: '/w/:org/apps/:app/environments/:environment',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"environment","end":""}],
    types: placeholder as Registry['app_environments.update']['types'],
  },
  'app_environments.destroy': {
    methods: ["DELETE"],
    pattern: '/w/:org/apps/:app/environments/:environment',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment","type":1,"val":"environment","end":""}],
    types: placeholder as Registry['app_environments.destroy']['types'],
  },
  'app_secrets.store': {
    methods: ["POST"],
    pattern: '/w/:org/apps/:app/environments/:environment/secret',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment/secret","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment/secret","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment/secret","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment/secret","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment/secret","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment/secret","type":1,"val":"environment","end":""},{"old":"/w/:org/apps/:app/environments/:environment/secret","type":0,"val":"secret","end":""}],
    types: placeholder as Registry['app_secrets.store']['types'],
  },
  'app_members.create': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/apps/:app/environments/:environment/members/create',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment/members/create","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/create","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/create","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/create","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/create","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/create","type":1,"val":"environment","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/create","type":0,"val":"members","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/create","type":0,"val":"create","end":""}],
    types: placeholder as Registry['app_members.create']['types'],
  },
  'app_members.store': {
    methods: ["POST"],
    pattern: '/w/:org/apps/:app/environments/:environment/members',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment/members","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members","type":1,"val":"environment","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members","type":0,"val":"members","end":""}],
    types: placeholder as Registry['app_members.store']['types'],
  },
  'app_members.edit': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/apps/:app/environments/:environment/members/:member/edit',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment/members/:member/edit","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member/edit","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member/edit","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member/edit","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member/edit","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member/edit","type":1,"val":"environment","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member/edit","type":0,"val":"members","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member/edit","type":1,"val":"member","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['app_members.edit']['types'],
  },
  'app_members.update': {
    methods: ["PUT","PATCH"],
    pattern: '/w/:org/apps/:app/environments/:environment/members/:member',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":1,"val":"environment","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":0,"val":"members","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":1,"val":"member","end":""}],
    types: placeholder as Registry['app_members.update']['types'],
  },
  'app_members.destroy': {
    methods: ["DELETE"],
    pattern: '/w/:org/apps/:app/environments/:environment/members/:member',
    tokens: [{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":0,"val":"w","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":1,"val":"org","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":0,"val":"apps","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":1,"val":"app","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":0,"val":"environments","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":1,"val":"environment","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":0,"val":"members","end":""},{"old":"/w/:org/apps/:app/environments/:environment/members/:member","type":1,"val":"member","end":""}],
    types: placeholder as Registry['app_members.destroy']['types'],
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
  'members.show': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/members/:member',
    tokens: [{"old":"/w/:org/members/:member","type":0,"val":"w","end":""},{"old":"/w/:org/members/:member","type":1,"val":"org","end":""},{"old":"/w/:org/members/:member","type":0,"val":"members","end":""},{"old":"/w/:org/members/:member","type":1,"val":"member","end":""}],
    types: placeholder as Registry['members.show']['types'],
  },
  'member_sessions.destroy': {
    methods: ["DELETE"],
    pattern: '/w/:org/members/:member/sessions',
    tokens: [{"old":"/w/:org/members/:member/sessions","type":0,"val":"w","end":""},{"old":"/w/:org/members/:member/sessions","type":1,"val":"org","end":""},{"old":"/w/:org/members/:member/sessions","type":0,"val":"members","end":""},{"old":"/w/:org/members/:member/sessions","type":1,"val":"member","end":""},{"old":"/w/:org/members/:member/sessions","type":0,"val":"sessions","end":""}],
    types: placeholder as Registry['member_sessions.destroy']['types'],
  },
  'roles.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/roles',
    tokens: [{"old":"/w/:org/roles","type":0,"val":"w","end":""},{"old":"/w/:org/roles","type":1,"val":"org","end":""},{"old":"/w/:org/roles","type":0,"val":"roles","end":""}],
    types: placeholder as Registry['roles.index']['types'],
  },
  'roles.create': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/roles/create',
    tokens: [{"old":"/w/:org/roles/create","type":0,"val":"w","end":""},{"old":"/w/:org/roles/create","type":1,"val":"org","end":""},{"old":"/w/:org/roles/create","type":0,"val":"roles","end":""},{"old":"/w/:org/roles/create","type":0,"val":"create","end":""}],
    types: placeholder as Registry['roles.create']['types'],
  },
  'roles.store': {
    methods: ["POST"],
    pattern: '/w/:org/roles',
    tokens: [{"old":"/w/:org/roles","type":0,"val":"w","end":""},{"old":"/w/:org/roles","type":1,"val":"org","end":""},{"old":"/w/:org/roles","type":0,"val":"roles","end":""}],
    types: placeholder as Registry['roles.store']['types'],
  },
  'roles.edit': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/roles/:role/edit',
    tokens: [{"old":"/w/:org/roles/:role/edit","type":0,"val":"w","end":""},{"old":"/w/:org/roles/:role/edit","type":1,"val":"org","end":""},{"old":"/w/:org/roles/:role/edit","type":0,"val":"roles","end":""},{"old":"/w/:org/roles/:role/edit","type":1,"val":"role","end":""},{"old":"/w/:org/roles/:role/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['roles.edit']['types'],
  },
  'roles.update': {
    methods: ["PUT","PATCH"],
    pattern: '/w/:org/roles/:role',
    tokens: [{"old":"/w/:org/roles/:role","type":0,"val":"w","end":""},{"old":"/w/:org/roles/:role","type":1,"val":"org","end":""},{"old":"/w/:org/roles/:role","type":0,"val":"roles","end":""},{"old":"/w/:org/roles/:role","type":1,"val":"role","end":""}],
    types: placeholder as Registry['roles.update']['types'],
  },
  'roles.destroy': {
    methods: ["DELETE"],
    pattern: '/w/:org/roles/:role',
    tokens: [{"old":"/w/:org/roles/:role","type":0,"val":"w","end":""},{"old":"/w/:org/roles/:role","type":1,"val":"org","end":""},{"old":"/w/:org/roles/:role","type":0,"val":"roles","end":""},{"old":"/w/:org/roles/:role","type":1,"val":"role","end":""}],
    types: placeholder as Registry['roles.destroy']['types'],
  },
  'environments.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/settings/environments',
    tokens: [{"old":"/w/:org/settings/environments","type":0,"val":"w","end":""},{"old":"/w/:org/settings/environments","type":1,"val":"org","end":""},{"old":"/w/:org/settings/environments","type":0,"val":"settings","end":""},{"old":"/w/:org/settings/environments","type":0,"val":"environments","end":""}],
    types: placeholder as Registry['environments.index']['types'],
  },
  'identity_providers.index': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/settings/identity-providers',
    tokens: [{"old":"/w/:org/settings/identity-providers","type":0,"val":"w","end":""},{"old":"/w/:org/settings/identity-providers","type":1,"val":"org","end":""},{"old":"/w/:org/settings/identity-providers","type":0,"val":"settings","end":""},{"old":"/w/:org/settings/identity-providers","type":0,"val":"identity-providers","end":""}],
    types: placeholder as Registry['identity_providers.index']['types'],
  },
  'identity_providers.create': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/settings/identity-providers/create',
    tokens: [{"old":"/w/:org/settings/identity-providers/create","type":0,"val":"w","end":""},{"old":"/w/:org/settings/identity-providers/create","type":1,"val":"org","end":""},{"old":"/w/:org/settings/identity-providers/create","type":0,"val":"settings","end":""},{"old":"/w/:org/settings/identity-providers/create","type":0,"val":"identity-providers","end":""},{"old":"/w/:org/settings/identity-providers/create","type":0,"val":"create","end":""}],
    types: placeholder as Registry['identity_providers.create']['types'],
  },
  'identity_providers.store': {
    methods: ["POST"],
    pattern: '/w/:org/settings/identity-providers',
    tokens: [{"old":"/w/:org/settings/identity-providers","type":0,"val":"w","end":""},{"old":"/w/:org/settings/identity-providers","type":1,"val":"org","end":""},{"old":"/w/:org/settings/identity-providers","type":0,"val":"settings","end":""},{"old":"/w/:org/settings/identity-providers","type":0,"val":"identity-providers","end":""}],
    types: placeholder as Registry['identity_providers.store']['types'],
  },
  'identity_providers.edit': {
    methods: ["GET","HEAD"],
    pattern: '/w/:org/settings/identity-providers/:provider/edit',
    tokens: [{"old":"/w/:org/settings/identity-providers/:provider/edit","type":0,"val":"w","end":""},{"old":"/w/:org/settings/identity-providers/:provider/edit","type":1,"val":"org","end":""},{"old":"/w/:org/settings/identity-providers/:provider/edit","type":0,"val":"settings","end":""},{"old":"/w/:org/settings/identity-providers/:provider/edit","type":0,"val":"identity-providers","end":""},{"old":"/w/:org/settings/identity-providers/:provider/edit","type":1,"val":"provider","end":""},{"old":"/w/:org/settings/identity-providers/:provider/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['identity_providers.edit']['types'],
  },
  'identity_providers.update': {
    methods: ["PUT","PATCH"],
    pattern: '/w/:org/settings/identity-providers/:provider',
    tokens: [{"old":"/w/:org/settings/identity-providers/:provider","type":0,"val":"w","end":""},{"old":"/w/:org/settings/identity-providers/:provider","type":1,"val":"org","end":""},{"old":"/w/:org/settings/identity-providers/:provider","type":0,"val":"settings","end":""},{"old":"/w/:org/settings/identity-providers/:provider","type":0,"val":"identity-providers","end":""},{"old":"/w/:org/settings/identity-providers/:provider","type":1,"val":"provider","end":""}],
    types: placeholder as Registry['identity_providers.update']['types'],
  },
  'identity_providers.destroy': {
    methods: ["DELETE"],
    pattern: '/w/:org/settings/identity-providers/:provider',
    tokens: [{"old":"/w/:org/settings/identity-providers/:provider","type":0,"val":"w","end":""},{"old":"/w/:org/settings/identity-providers/:provider","type":1,"val":"org","end":""},{"old":"/w/:org/settings/identity-providers/:provider","type":0,"val":"settings","end":""},{"old":"/w/:org/settings/identity-providers/:provider","type":0,"val":"identity-providers","end":""},{"old":"/w/:org/settings/identity-providers/:provider","type":1,"val":"provider","end":""}],
    types: placeholder as Registry['identity_providers.destroy']['types'],
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
  'sign_in.destroy': {
    methods: ["DELETE"],
    pattern: '/sign-in/:signInId',
    tokens: [{"old":"/sign-in/:signInId","type":0,"val":"sign-in","end":""},{"old":"/sign-in/:signInId","type":1,"val":"signInId","end":""}],
    types: placeholder as Registry['sign_in.destroy']['types'],
  },
  'redirect_to_provider': {
    methods: ["POST"],
    pattern: '/sign-in/:signInId/provider',
    tokens: [{"old":"/sign-in/:signInId/provider","type":0,"val":"sign-in","end":""},{"old":"/sign-in/:signInId/provider","type":1,"val":"signInId","end":""},{"old":"/sign-in/:signInId/provider","type":0,"val":"provider","end":""}],
    types: placeholder as Registry['redirect_to_provider']['types'],
  },
  'sign_in_with_provider': {
    methods: ["GET","HEAD"],
    pattern: '/sign-in/:signInId/provider/callback',
    tokens: [{"old":"/sign-in/:signInId/provider/callback","type":0,"val":"sign-in","end":""},{"old":"/sign-in/:signInId/provider/callback","type":1,"val":"signInId","end":""},{"old":"/sign-in/:signInId/provider/callback","type":0,"val":"provider","end":""},{"old":"/sign-in/:signInId/provider/callback","type":0,"val":"callback","end":""}],
    types: placeholder as Registry['sign_in_with_provider']['types'],
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
