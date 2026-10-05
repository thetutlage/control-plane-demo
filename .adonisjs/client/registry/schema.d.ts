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
  'organizations.show': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { org: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organizations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organizations_controller').default['show']>>>
    }
  }
  'overview.show': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/:environment/overview'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/overview_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/overview_controller').default['show']>>>
    }
  }
  'apps.index': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/:environment/apps'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['index']>>>
    }
  }
  'apps.create': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/:environment/apps/create'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['create']>>>
    }
  }
  'apps.store': {
    methods: ["POST"]
    pattern: '/w/:org/:environment/apps'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app').createAppValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/app').createAppValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'apps.show': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/:environment/apps/:app'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue; app: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['show']>>>
    }
  }
  'apps.destroy': {
    methods: ["DELETE"]
    pattern: '/w/:org/:environment/apps/:app'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue; app: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['destroy']>>>
    }
  }
  'app_settings.show': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/:environment/apps/:app/settings'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue; app: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_settings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_settings_controller').default['show']>>>
    }
  }
  'app_settings.edit': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/:environment/apps/:app/settings/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue; app: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_settings_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_settings_controller').default['edit']>>>
    }
  }
  'app_settings.update': {
    methods: ["PUT"]
    pattern: '/w/:org/:environment/apps/:app/settings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app').updateAppValidator)>>
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue; app: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/app').updateAppValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_settings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'app_secrets.store': {
    methods: ["POST"]
    pattern: '/w/:org/:environment/apps/:app/secret'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue; app: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_secrets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_secrets_controller').default['store']>>>
    }
  }
  'members.index': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/:environment/members'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/members_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/members_controller').default['index']>>>
    }
  }
  'members.create': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/:environment/members/create'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/members_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/members_controller').default['create']>>>
    }
  }
  'members.store': {
    methods: ["POST"]
    pattern: '/w/:org/:environment/members'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/member').createMemberValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/member').createMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/members_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/members_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'members.show': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/:environment/members/:member'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue; member: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/members_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/members_controller').default['show']>>>
    }
  }
  'member_sessions.destroy': {
    methods: ["DELETE"]
    pattern: '/w/:org/:environment/members/:member/sessions'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue; member: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/member_sessions_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/member_sessions_controller').default['destroy']>>>
    }
  }
  'roles.index': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/:environment/roles'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; environment: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['index']>>>
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
}
