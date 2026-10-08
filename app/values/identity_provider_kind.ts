/**
 * How an organization's identity provider is connected. OIDC is the
 * company's own client at its provider, with pasted credentials.
 */
export const IdentityProviderKind = {
  OIDC: 0,
} as const

export type IdentityProviderKind = (typeof IdentityProviderKind)[keyof typeof IdentityProviderKind]
