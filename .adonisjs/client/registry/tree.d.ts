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
  }
  members: {
    index: typeof routes['members.index']
  }
  roles: {
    index: typeof routes['roles.index']
  }
}
