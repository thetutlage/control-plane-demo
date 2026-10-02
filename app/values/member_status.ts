/**
 * Lifecycle of a member inside an environment.
 */
export const MemberStatus = {
  INVITED: 0,
  ACTIVE: 1,
  SUSPENDED: 2,
} as const

export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus]
