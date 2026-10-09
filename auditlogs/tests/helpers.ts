import { defineActions, defineSubjects } from '../index.js'

type User = { id: number; email: string }
type Member = { id: number; email: string }
type App = { id: number; name: string }

export const ADA: User = { id: 1, email: 'ada@acme.test' }
export const SARA: Member = { id: 12, email: 'sara@acme.test' }
export const BEN: Member = { id: 13, email: 'ben@acme.test' }
export const INVOICES: App = { id: 7, name: 'Invoices' }

export const s = defineSubjects({
  user: (user: User) => ({ id: user.id, label: user.email }),
  member: (member: Member) => ({ id: member.id, label: member.email }),
  app: (app: App) => ({ id: app.id, label: app.name }),
})

/**
 * A small catalogue: an action with data, one with two subjects of the
 * same kind, one with a subject that may be missing and no actor, and
 * one with nothing but an actor
 */
export const actions = defineActions({
  'access.role_assigned': (
    admin: User,
    member: Member,
    app: App,
    before: string[],
    after: string[]
  ) => ({
    actor: s.user(admin),
    subjects: [s.member(member), s.app(app)],
    summary: `${admin.email} changed the roles of ${member.email} on ${app.name}`,
    data: { before, after },
  }),

  'access.transferred': (admin: User, from: Member, to: Member, app: App) => ({
    actor: s.user(admin),
    subjects: [s.member(from), s.member(to), s.app(app)],
    summary: `${admin.email} moved ${from.email}'s access to ${app.name} over to ${to.email}`,
  }),

  'sign_in.refused': (app: App, email: string, member: Member | null) => ({
    actor: null,
    subjects: [s.app(app), member ? s.member(member) : null],
    summary: `Sign-in to ${app.name} was refused for ${email}`,
    data: { email },
  }),

  'configuration.viewed': (admin: User) => ({
    actor: s.user(admin),
    subjects: [],
    summary: `${admin.email} viewed the configuration`,
  }),
})
