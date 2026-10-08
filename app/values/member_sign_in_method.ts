/**
 * How a member signs in. An admin sets it; the other way is refused for
 * the member.
 */
export const MemberSignInMethod = {
  PASSWORD: 0,
  PROVIDER: 1,
} as const

export type MemberSignInMethod = (typeof MemberSignInMethod)[keyof typeof MemberSignInMethod]
