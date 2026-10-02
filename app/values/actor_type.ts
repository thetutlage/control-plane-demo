/**
 * The kinds of actors that can hold roles and appear in audit events.
 */
export const ActorType = {
  MEMBER: 0,
  APP: 1,
  AGENT: 2,
} as const

export type ActorType = (typeof ActorType)[keyof typeof ActorType]
