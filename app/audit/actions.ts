import { defineActions, defineSubjects } from '#auditlogs/index'
import type App from '#models/app'
import type Role from '#models/role'
import type User from '#models/user'
import type Member from '#models/member'
import type Environment from '#models/environment'
import type Organization from '#models/organization'
import type AppEnvironment from '#models/app_environment'
import type IdentityProvider from '#models/identity_provider'
import { MemberSignInMethod } from '#values/member_sign_in_method'

/**
 * The kinds of things audit events involve, each with its ID and the
 * name it is known by. A kind and an ID are what a page asks for its
 * events by (`AuditEvent.involving`).
 */
export const s = defineSubjects({
  user: (user: User) => ({ id: user.id, label: user.email }),
  member: (member: Member) => ({ id: member.id, label: member.email }),
  app: (app: App) => ({ id: app.id, label: app.name }),
  role: (role: Role) => ({ id: role.id, label: role.name }),
  identityProvider: (provider: IdentityProvider) => ({ id: provider.id, label: provider.issuer }),
})

const names = (roles: Role[]) => roles.map(({ name }) => name).sort()

const method = (signInMethod: MemberSignInMethod) =>
  signInMethod === MemberSignInMethod.PROVIDER ? 'provider' : 'password'

const withMethod = (signInMethod: MemberSignInMethod) =>
  signInMethod === MemberSignInMethod.PROVIDER ? 'the identity provider' : 'a password'

/**
 * The URLs of an app's setup in an environment
 */
const urls = (
  setup: Pick<AppEnvironment, 'appUrl' | 'redirectUris' | 'postLogoutRedirectUris'>
) => ({
  appUrl: setup.appUrl,
  redirectUris: setup.redirectUris,
  postLogoutRedirectUris: setup.postLogoutRedirectUris,
})

type RoleDetails = Pick<Role, 'name' | 'description' | 'permissions'>
type ProviderDetails = Pick<IdentityProvider, 'issuer' | 'clientId' | 'admitsNewcomers'>

/**
 * Every action the audit log records, named `category.name`, in three
 * categories (plan §3, "Audit events"):
 *
 * - `access`: who can do what changed.
 * - `sign_in`: a member signed in, was turned away, or set a password.
 * - `configuration`: apps, their setups and the identity provider.
 *
 * An action says who did it, what it was done to, a sentence saying so,
 * and what else is worth keeping. Secrets and passwords never go in.
 */
export const actions = defineActions({
  /*
  |--------------------------------------------------------------------------
  | Access
  |--------------------------------------------------------------------------
  */

  'access.member_added': (admin: User, member: Member) => ({
    actor: s.user(admin),
    subjects: [s.member(member)],
    summary: `${admin.email} added ${member.email}, to sign in with ${withMethod(member.signInMethod)}`,
    data: { signInMethod: method(member.signInMethod) },
  }),

  /**
   * Someone the identity provider let through, whom no admin had added,
   * became a member, because the provider admits newcomers
   */
  'access.member_joined': (member: Member) => ({
    actor: s.member(member),
    subjects: [s.member(member)],
    summary: `${member.email} joined through the identity provider`,
  }),

  'access.granted': (
    admin: User,
    member: Member,
    app: App,
    environment: Environment,
    roles: Role[]
  ) => ({
    actor: s.user(admin),
    subjects: [s.member(member), s.app(app), ...roles.map((role) => s.role(role))],
    summary: `${admin.email} gave ${member.email} access to ${app.name} in ${environment.name}`,
    data: { roles: names(roles) },
  }),

  /**
   * The roles given or taken away are subjects, so a role's own events
   * include them
   */
  'access.roles_changed': (
    admin: User,
    member: Member,
    app: App,
    environment: Environment,
    before: Role[],
    after: Role[]
  ) => {
    const changed = [
      ...after.filter(({ id }) => !before.some((role) => role.id === id)),
      ...before.filter(({ id }) => !after.some((role) => role.id === id)),
    ]

    return {
      actor: s.user(admin),
      subjects: [s.member(member), s.app(app), ...changed.map((role) => s.role(role))],
      summary: `${admin.email} changed the roles of ${member.email} on ${app.name} in ${environment.name}`,
      data: { before: names(before), after: names(after) },
    }
  },

  'access.revoked': (
    admin: User,
    member: Member,
    app: App,
    environment: Environment,
    roles: Role[]
  ) => ({
    actor: s.user(admin),
    subjects: [s.member(member), s.app(app), ...roles.map((role) => s.role(role))],
    summary: `${admin.email} removed ${member.email}'s access to ${app.name} in ${environment.name}`,
    data: { roles: names(roles) },
  }),

  'access.role_created': (admin: User, role: Role) => ({
    actor: s.user(admin),
    subjects: [s.role(role)],
    summary: `${admin.email} created the role ${role.name}`,
    data: { description: role.description, permissions: role.permissions },
  }),

  'access.role_changed': (admin: User, role: Role, before: RoleDetails, after: RoleDetails) => ({
    actor: s.user(admin),
    subjects: [s.role(role)],
    summary: `${admin.email} changed the role ${before.name}`,
    data: { before, after },
  }),

  /**
   * Members the role was the only one of, on an app, lost access to that
   * app with it
   */
  'access.role_deleted': (admin: User, role: Role, lostAccess: number) => ({
    actor: s.user(admin),
    subjects: [s.role(role)],
    summary: `${admin.email} deleted the role ${role.name}`,
    data: { permissions: role.permissions, membersWhoLostAccess: lostAccess },
  }),

  'access.sign_in_method_changed': (
    admin: User,
    member: Member,
    before: MemberSignInMethod,
    after: MemberSignInMethod
  ) => ({
    actor: s.user(admin),
    subjects: [s.member(member)],
    summary: `${admin.email} set ${member.email} to sign in with ${withMethod(after)}`,
    data: { before: method(before), after: method(after) },
  }),

  /**
   * `subject` is the provider's ID for the member that was removed
   */
  'access.identity_dissociated': (admin: User, member: Member, subject: string) => ({
    actor: s.user(admin),
    subjects: [s.member(member)],
    summary: `${admin.email} dissociated ${member.email} from their account at the identity provider`,
    data: { providerId: subject },
  }),

  'access.signed_out_everywhere': (admin: User, member: Member) => ({
    actor: s.user(admin),
    subjects: [s.member(member)],
    summary: `${admin.email} signed ${member.email} out everywhere`,
  }),

  'access.password_setup_sent': (admin: User, member: Member) => ({
    actor: s.user(admin),
    subjects: [s.member(member)],
    summary: `${admin.email} emailed ${member.email} a link to set their password`,
  }),

  /*
  |--------------------------------------------------------------------------
  | Sign-in
  |--------------------------------------------------------------------------
  */

  /**
   * `how` is set for a sign-in through the provider: `returning`,
   * `matched_by_email` or `created`
   */
  'sign_in.succeeded': (
    member: Member,
    app: App,
    environment: Environment,
    signedInWith: 'password' | 'provider',
    how: string | null = null
  ) => ({
    actor: s.member(member),
    subjects: [s.member(member), s.app(app)],
    summary: `${member.email} signed in to ${app.name} in ${environment.name} with ${signedInWith === 'provider' ? 'the identity provider' : 'a password'}`,
    data: { method: signedInWith, ...(how ? { how } : {}) },
  }),

  /**
   * The member is a subject when the email or the provider's ID named
   * one. Nobody is the actor: who was at the keyboard isn't known.
   */
  'sign_in.refused': (
    app: App,
    environment: Environment,
    signedInWith: 'password' | 'provider',
    reason: string,
    email: string | null,
    member: Member | null = null
  ) => ({
    actor: null,
    subjects: [s.app(app), member ? s.member(member) : null],
    summary: `Sign-in to ${app.name} in ${environment.name} was refused for ${email ?? 'someone'}`,
    data: { method: signedInWith, reason, email },
  }),

  /**
   * A signed-in member opened an app they have no access to
   */
  'sign_in.access_denied': (member: Member, app: App, environment: Environment) => ({
    actor: s.member(member),
    subjects: [s.member(member), s.app(app)],
    summary: `${member.email} has no access to ${app.name} in ${environment.name}`,
  }),

  'sign_in.password_set': (member: Member) => ({
    actor: s.member(member),
    subjects: [s.member(member)],
    summary: `${member.email} set their password`,
  }),

  'sign_in.password_reset_requested': (member: Member, environment: Environment) => ({
    actor: s.member(member),
    subjects: [s.member(member)],
    summary: `${member.email} asked for a link to reset their password, in ${environment.name}`,
  }),

  /*
  |--------------------------------------------------------------------------
  | Configuration
  |--------------------------------------------------------------------------
  */

  'configuration.organization_created': (user: User, organization: Organization) => ({
    actor: s.user(user),
    subjects: [],
    summary: `${user.email} created the organization ${organization.name}`,
    data: { name: organization.name, slug: organization.slug },
  }),

  'configuration.app_created': (admin: User, app: App) => ({
    actor: s.user(admin),
    subjects: [s.app(app)],
    summary: `${admin.email} registered the app ${app.name}`,
    data: { slug: app.slug },
  }),

  'configuration.app_deleted': (admin: User, app: App) => ({
    actor: s.user(admin),
    subjects: [s.app(app)],
    summary: `${admin.email} deleted the app ${app.name}`,
    data: { slug: app.slug },
  }),

  'configuration.app_set_up': (
    admin: User,
    app: App,
    environment: Environment,
    setup: AppEnvironment
  ) => ({
    actor: s.user(admin),
    subjects: [s.app(app)],
    summary: `${admin.email} set ${app.name} up in ${environment.name}`,
    data: { clientId: setup.clientId, ...urls(setup) },
  }),

  'configuration.app_setup_changed': (
    admin: User,
    app: App,
    environment: Environment,
    before: ReturnType<typeof urls>,
    after: ReturnType<typeof urls>
  ) => ({
    actor: s.user(admin),
    subjects: [s.app(app)],
    summary: `${admin.email} changed the URLs of ${app.name} in ${environment.name}`,
    data: { before, after },
  }),

  'configuration.app_setup_removed': (admin: User, app: App, environment: Environment) => ({
    actor: s.user(admin),
    subjects: [s.app(app)],
    summary: `${admin.email} removed ${app.name} from ${environment.name}`,
  }),

  /**
   * Only the new secret's hint is kept, never the secret
   */
  'configuration.client_secret_rotated': (
    admin: User,
    app: App,
    environment: Environment,
    setup: AppEnvironment
  ) => ({
    actor: s.user(admin),
    subjects: [s.app(app)],
    summary: `${admin.email} rotated the client secret of ${app.name} in ${environment.name}`,
    data: { clientId: setup.clientId, secretHint: setup.clientSecretHint },
  }),

  'configuration.identity_provider_connected': (admin: User, provider: IdentityProvider) => ({
    actor: s.user(admin),
    subjects: [s.identityProvider(provider)],
    summary: `${admin.email} connected the identity provider ${provider.issuer}`,
    data: { issuer: provider.issuer, clientId: provider.clientId },
  }),

  /**
   * `tiesCleared` is how many members were tied to the old provider when
   * its issuer URL changed
   */
  'configuration.identity_provider_changed': (
    admin: User,
    provider: IdentityProvider,
    before: ProviderDetails,
    after: ProviderDetails,
    secretReplaced: boolean,
    tiesCleared: number
  ) => ({
    actor: s.user(admin),
    subjects: [s.identityProvider(provider)],
    summary:
      before.issuer === after.issuer
        ? `${admin.email} changed the identity provider's details`
        : `${admin.email} replaced the identity provider ${before.issuer} with ${after.issuer}`,
    data: { before, after, secretReplaced, tiesCleared },
  }),

  /**
   * `membersSwitched` is how many members signed in with it, and were
   * switched to a password
   */
  'configuration.identity_provider_removed': (
    admin: User,
    provider: IdentityProvider,
    membersSwitched: number
  ) => ({
    actor: s.user(admin),
    subjects: [s.identityProvider(provider)],
    summary: `${admin.email} removed the identity provider ${provider.issuer}`,
    data: { issuer: provider.issuer, membersSwitched },
  }),
})

export { urls as setupUrls }
