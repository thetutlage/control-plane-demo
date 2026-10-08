import db from '@adonisjs/lucid/services/db'
import Member from '#models/member'
import Organization from '#models/organization'
import MemberIdentity from '#models/member_identity'
import type IdentityProvider from '#models/identity_provider'
import { MemberStatus } from '#values/member_status'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import { MemberIdentityOrigin } from '#values/member_identity_origin'
import { DateTime } from 'luxon'

type Profile = {
  subject: string
  email: string | null
  emailVerified: boolean | null
  name: string | null
}

type Outcome =
  { member: Member; how: 'returning' | 'matched_by_email' | 'created' } | { refusal: string }

/**
 * Finds the member for someone the organization's identity provider has
 * just signed in, from the claims of their verified ID token.
 *
 * A member is found by the provider's permanent ID for them. Email is
 * only looked at the first time, to pick up a member an admin had
 * already added; an email can change or be given to someone else, so it
 * never finds a member who is already tied to an ID.
 *
 * Only members an admin set to sign in with the provider get in. Nothing
 * here changes that setting (plan §3, "Sign-in").
 */
export default class ProviderSignInService {
  /**
   * The member to sign in and how they were found, or why they can't be.
   * Someone no admin added becomes a member, with no access, only when
   * the provider admits newcomers.
   */
  async admit(identityProvider: IdentityProvider, profile: Profile): Promise<Outcome> {
    return db.transaction(async (trx): Promise<Outcome> => {
      const identity = await MemberIdentity.query({ client: trx })
        .where('identity_provider_id', identityProvider.id)
        .where('subject', profile.subject)
        .preload('member')
        .first()

      if (identity) {
        return this.#returning(identity, profile)
      }
      if (!profile.email) {
        return { refusal: 'no_email' }
      }

      /**
       * Refused only when the provider says so. Entra never says either
       * way, and its staff are still the company's own.
       */
      if (profile.emailVerified === false) {
        return { refusal: 'email_unverified' }
      }

      const member = await Member.query({ client: trx })
        .where('organization_id', identityProvider.organizationId)
        .where('email', profile.email)
        .first()

      if (!member) {
        if (!identityProvider.admitsNewcomers) {
          return { refusal: 'not_a_member' }
        }

        const organization = await Organization.findOrFail(identityProvider.organizationId, {
          client: trx,
        })
        const created = await organization.createMember({
          email: profile.email,
          fullName: profile.name,
          status: MemberStatus.ACTIVE,
          signInMethod: MemberSignInMethod.PROVIDER,
        })
        await this.#tie(created, identityProvider, profile, MemberIdentityOrigin.JOINED)
        return { member: created, how: 'created' }
      }

      if (member.status === MemberStatus.SUSPENDED) {
        return { refusal: 'suspended' }
      }
      if (member.signInMethod !== MemberSignInMethod.PROVIDER) {
        return { refusal: 'signs_in_with_a_password' }
      }

      /**
       * Someone else already signs in as this member. The address may
       * have been given to a new person, who must not inherit the roles.
       */
      const taken = await MemberIdentity.query({ client: trx })
        .where('identity_provider_id', identityProvider.id)
        .where('member_id', member.id)
        .first()
      if (taken) {
        return { refusal: 'email_belongs_to_another_account' }
      }

      member.status = MemberStatus.ACTIVE
      member.fullName ??= profile.name
      await member.save()
      await this.#tie(member, identityProvider, profile, MemberIdentityOrigin.MATCHED_BY_EMAIL)
      return { member, how: 'matched_by_email' }
    })
  }

  /**
   * A member who has signed in before. Their name and email follow the
   * provider's, unless another member already has the email. Their
   * identity keeps the email the provider sent either way, for the admin
   * to see.
   */
  async #returning(identity: MemberIdentity, profile: Profile): Promise<Outcome> {
    const { member } = identity
    if (member.status === MemberStatus.SUSPENDED) {
      return { refusal: 'suspended' }
    }
    if (member.signInMethod !== MemberSignInMethod.PROVIDER) {
      return { refusal: 'signs_in_with_a_password' }
    }

    member.fullName = profile.name ?? member.fullName
    if (profile.email && profile.email !== member.email) {
      const inUse = await Member.query({ client: member.$trx })
        .where('organization_id', member.organizationId)
        .where('email', profile.email)
        .first()
      member.email = inUse ? member.email : profile.email
    }
    await member.save()

    identity.email = profile.email ?? identity.email
    identity.lastSignedInAt = DateTime.now()
    await identity.save()

    return { member, how: 'returning' }
  }

  #tie(
    member: Member,
    identityProvider: IdentityProvider,
    profile: Profile,
    origin: MemberIdentityOrigin
  ) {
    return MemberIdentity.create(
      {
        organizationId: identityProvider.organizationId,
        identityProviderId: identityProvider.id,
        memberId: member.id,
        subject: profile.subject,
        email: profile.email,
        origin,
        lastSignedInAt: DateTime.now(),
      },
      { client: member.$trx }
    )
  }
}
