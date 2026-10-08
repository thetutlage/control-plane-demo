/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'home': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'new_account.create': {
    methods: ["GET","HEAD"]
    pattern: '/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
    }
  }
  'new_account.store': {
    methods: ["POST"]
    pattern: '/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.create': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
    }
  }
  'session.store': {
    methods: ["POST"]
    pattern: '/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.destroy': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
  'organizations.index': {
    methods: ["GET","HEAD"]
    pattern: '/w'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organizations_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organizations_controller').default['index']>>>
    }
  }
  'overview.show': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/overview'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/overview_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/overview_controller').default['show']>>>
    }
  }
  'apps.index': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/apps'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['index']>>>
    }
  }
  'apps.create': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/apps/create'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['create']>>>
    }
  }
  'apps.store': {
    methods: ["POST"]
    pattern: '/w/:org/apps'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app').createAppValidator)>>
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/app').createAppValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'apps.show': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/apps/:app'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['show']>>>
    }
  }
  'apps.destroy': {
    methods: ["DELETE"]
    pattern: '/w/:org/apps/:app'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['destroy']>>>
    }
  }
  'app_environments.show': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/apps/:app/environments/:environment'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['show']>>>
    }
  }
  'app_environments.create': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/apps/:app/environments/:environment/create'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['create']>>>
    }
  }
  'app_environments.store': {
    methods: ["POST"]
    pattern: '/w/:org/apps/:app/environments/:environment'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app').appEnvironmentValidator)>>
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/app').appEnvironmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'app_environments.edit': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/apps/:app/environments/:environment/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['edit']>>>
    }
  }
  'app_environments.update': {
    methods: ["PUT"]
    pattern: '/w/:org/apps/:app/environments/:environment'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app').appEnvironmentValidator)>>
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/app').appEnvironmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'app_environments.destroy': {
    methods: ["DELETE"]
    pattern: '/w/:org/apps/:app/environments/:environment'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_environments_controller').default['destroy']>>>
    }
  }
  'app_secrets.store': {
    methods: ["POST"]
    pattern: '/w/:org/apps/:app/environments/:environment/secret'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_secrets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_secrets_controller').default['store']>>>
    }
  }
  'app_members.create': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/apps/:app/environments/:environment/members/create'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_members_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_members_controller').default['create']>>>
    }
  }
  'app_members.store': {
    methods: ["POST"]
    pattern: '/w/:org/apps/:app/environments/:environment/members'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app_member').createAppMemberValidator)>>
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/app_member').createAppMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_members_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_members_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'app_members.edit': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/apps/:app/environments/:environment/members/:member/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue; member: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_members_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_members_controller').default['edit']>>>
    }
  }
  'app_members.update': {
    methods: ["PUT","PATCH"]
    pattern: '/w/:org/apps/:app/environments/:environment/members/:member'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app_member').updateAppMemberValidator)>>
      paramsTuple: [ParamValue, ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue; member: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/app_member').updateAppMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_members_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_members_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'app_members.destroy': {
    methods: ["DELETE"]
    pattern: '/w/:org/apps/:app/environments/:environment/members/:member'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue; environment: ParamValue; member: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_members_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_members_controller').default['destroy']>>>
    }
  }
  'members.index': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/members'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/members_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/members_controller').default['index']>>>
    }
  }
  'members.create': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/members/create'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/members_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/members_controller').default['create']>>>
    }
  }
  'members.store': {
    methods: ["POST"]
    pattern: '/w/:org/members'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/member').createMemberValidator)>>
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/member').createMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/members_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/members_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'members.show': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/members/:member'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; member: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/members_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/members_controller').default['show']>>>
    }
  }
  'member_sessions.destroy': {
    methods: ["DELETE"]
    pattern: '/w/:org/members/:member/sessions'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; member: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/member_sessions_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/member_sessions_controller').default['destroy']>>>
    }
  }
  'roles.index': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/roles'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['index']>>>
    }
  }
  'roles.create': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/roles/create'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['create']>>>
    }
  }
  'roles.store': {
    methods: ["POST"]
    pattern: '/w/:org/roles'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').roleValidator)>>
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role').roleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'roles.edit': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/roles/:role/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; role: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['edit']>>>
    }
  }
  'roles.update': {
    methods: ["PUT","PATCH"]
    pattern: '/w/:org/roles/:role'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').roleValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; role: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role').roleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'roles.destroy': {
    methods: ["DELETE"]
    pattern: '/w/:org/roles/:role'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; role: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['destroy']>>>
    }
  }
  'environments.index': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/settings/environments'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/environments_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/environments_controller').default['index']>>>
    }
  }
  'identity_providers.index': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/settings/identity-providers'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['index']>>>
    }
  }
  'identity_providers.create': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/settings/identity-providers/create'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['create']>>>
    }
  }
  'identity_providers.store': {
    methods: ["POST"]
    pattern: '/w/:org/settings/identity-providers'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/identity_provider').createIdentityProviderValidator)>>
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/identity_provider').createIdentityProviderValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'identity_providers.edit': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/settings/identity-providers/:provider/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; provider: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['edit']>>>
    }
  }
  'identity_providers.update': {
    methods: ["PUT","PATCH"]
    pattern: '/w/:org/settings/identity-providers/:provider'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/identity_provider').updateIdentityProviderValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; provider: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/identity_provider').updateIdentityProviderValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'identity_providers.destroy': {
    methods: ["DELETE"]
    pattern: '/w/:org/settings/identity-providers/:provider'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; provider: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/identity_providers_controller').default['destroy']>>>
    }
  }
  'sign_in.show': {
    methods: ["GET","HEAD"]
    pattern: '/sign-in/:signInId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { signInId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sign_in_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sign_in_controller').default['show']>>>
    }
  }
  'sign_in.store': {
    methods: ["POST"]
    pattern: '/sign-in/:signInId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/member').memberLoginValidator)>>
      paramsTuple: [ParamValue]
      params: { signInId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/member').memberLoginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sign_in_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sign_in_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'sign_in.destroy': {
    methods: ["DELETE"]
    pattern: '/sign-in/:signInId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { signInId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sign_in_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sign_in_controller').default['destroy']>>>
    }
  }
}
