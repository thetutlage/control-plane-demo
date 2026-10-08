/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  home: typeof routes['home']
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  organizations: {
    index: typeof routes['organizations.index']
  }
  signInCallbacks: {
    show: typeof routes['sign_in_callbacks.show']
  }
  overview: {
    show: typeof routes['overview.show']
  }
  apps: {
    index: typeof routes['apps.index']
    create: typeof routes['apps.create']
    store: typeof routes['apps.store']
    show: typeof routes['apps.show']
    destroy: typeof routes['apps.destroy']
  }
  appEnvironments: {
    show: typeof routes['app_environments.show']
    create: typeof routes['app_environments.create']
    store: typeof routes['app_environments.store']
    edit: typeof routes['app_environments.edit']
    update: typeof routes['app_environments.update']
    destroy: typeof routes['app_environments.destroy']
  }
  appSecrets: {
    store: typeof routes['app_secrets.store']
  }
  appMembers: {
    create: typeof routes['app_members.create']
    store: typeof routes['app_members.store']
    edit: typeof routes['app_members.edit']
    update: typeof routes['app_members.update']
    destroy: typeof routes['app_members.destroy']
  }
  members: {
    index: typeof routes['members.index']
    create: typeof routes['members.create']
    store: typeof routes['members.store']
    show: typeof routes['members.show']
  }
  memberSessions: {
    destroy: typeof routes['member_sessions.destroy']
  }
  roles: {
    index: typeof routes['roles.index']
    create: typeof routes['roles.create']
    store: typeof routes['roles.store']
    edit: typeof routes['roles.edit']
    update: typeof routes['roles.update']
    destroy: typeof routes['roles.destroy']
  }
  environments: {
    index: typeof routes['environments.index']
  }
  identityProviders: {
    index: typeof routes['identity_providers.index']
    create: typeof routes['identity_providers.create']
    store: typeof routes['identity_providers.store']
    edit: typeof routes['identity_providers.edit']
    update: typeof routes['identity_providers.update']
    destroy: typeof routes['identity_providers.destroy']
  }
  signIn: {
    show: typeof routes['sign_in.show']
    store: typeof routes['sign_in.store']
    destroy: typeof routes['sign_in.destroy']
  }
  redirectToProvider: typeof routes['redirect_to_provider']
  signInWithProvider: typeof routes['sign_in_with_provider']
}
