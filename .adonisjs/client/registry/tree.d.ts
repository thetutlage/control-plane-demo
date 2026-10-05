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
  overview: {
    show: typeof routes['overview.show']
  }
  apps: {
    index: typeof routes['apps.index']
    create: typeof routes['apps.create']
    store: typeof routes['apps.store']
    show: typeof routes['apps.show']
    settings: typeof routes['apps.settings']
    clients: {
      create: typeof routes['apps.clients.create']
      store: typeof routes['apps.clients.store']
      edit: typeof routes['apps.clients.edit']
      update: typeof routes['apps.clients.update']
      destroy: typeof routes['apps.clients.destroy']
      rotateSecret: typeof routes['apps.clients.rotate_secret']
    }
  }
  members: {
    index: typeof routes['members.index']
    create: typeof routes['members.create']
    store: typeof routes['members.store']
  }
  roles: {
    index: typeof routes['roles.index']
  }
  signIn: {
    show: typeof routes['sign_in.show']
    store: typeof routes['sign_in.store']
  }
}
