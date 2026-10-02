/**
 * What an environment is used for. Production is the strict one: https-only
 * redirects, secrets shown once, production rate limits.
 */
export const EnvironmentKind = {
  DEVELOPMENT: 0,
  STAGING: 1,
  PRODUCTION: 2,
} as const

export type EnvironmentKind = (typeof EnvironmentKind)[keyof typeof EnvironmentKind]
