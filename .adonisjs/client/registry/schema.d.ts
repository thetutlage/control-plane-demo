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
  'apps.settings': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/apps/:app/settings'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['settings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['settings']>>>
    }
  }
  'apps.clients.create': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/apps/:app/clients/create'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['create']>>>
    }
  }
  'apps.clients.store': {
    methods: ["POST"]
    pattern: '/w/:org/apps/:app/clients'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app_client').appClientValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; app: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/app_client').appClientValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'apps.clients.edit': {
    methods: ["GET","HEAD"]
    pattern: '/w/:org/clients/:client/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; client: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['edit']>>>
    }
  }
  'apps.clients.update': {
    methods: ["PUT","PATCH"]
    pattern: '/w/:org/clients/:client'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app_client').appClientValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; client: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/app_client').appClientValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'apps.clients.destroy': {
    methods: ["DELETE"]
    pattern: '/w/:org/clients/:client'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; client: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['destroy']>>>
    }
  }
  'apps.clients.rotate_secret': {
    methods: ["POST"]
    pattern: '/w/:org/clients/:client/secret'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; client: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['rotateSecret']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app_clients_controller').default['rotateSecret']>>>
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
  'members.sign_out_everywhere': {
    methods: ["POST"]
    pattern: '/w/:org/members/:member/sign-out'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { org: ParamValue; member: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/members_controller').default['signOutEverywhere']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/members_controller').default['signOutEverywhere']>>>
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
