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
    show: typeof routes['organizations.show']
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
  appMembers: {
    index: typeof routes['app_members.index']
  }
  appSettings: {
    show: typeof routes['app_settings.show']
    edit: typeof routes['app_settings.edit']
    update: typeof routes['app_settings.update']
  }
  appSecrets: {
    store: typeof routes['app_secrets.store']
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
  }
  signIn: {
    show: typeof routes['sign_in.show']
    store: typeof routes['sign_in.store']
  }
}
