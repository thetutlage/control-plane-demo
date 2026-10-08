/**
 * How a member came to be tied to their account at the identity
 * provider: an admin had added them and their first sign-in matched by
 * email, or they joined on their own because the provider admits
 * newcomers.
 */
export const MemberIdentityOrigin = {
  MATCHED_BY_EMAIL: 0,
  JOINED: 1,
} as const

export type MemberIdentityOrigin = (typeof MemberIdentityOrigin)[keyof typeof MemberIdentityOrigin]
