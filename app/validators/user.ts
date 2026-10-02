import vine from '@vinejs/vine'

/**
 * Subdomain labels that the platform itself uses
 */
const RESERVED_SLUGS = ['www', 'api', 'app', 'console', 'admin', 'auth', 'login', 'status', 'docs']

/**
 * Validator to use when someone signs up for the control plane. The
 * organization slug becomes the login subdomain (`acme.<domain>`,
 * `acme--staging.<domain>`) and the console URL prefix (`/w/acme`), so it
 * must be a lowercase DNS label without consecutive dashes, which are
 * reserved for separating the environment.
 *
 * The "passwordConfirmation" field is declared explicitly, so that it is part
 * of the request body type shared with the frontend. Otherwise the signup form
 * has no way to know about the errors reported for this field.
 */
export const signupValidator = vine.create({
  organizationName: vine.string().trim().minLength(2).maxLength(100),
  organizationSlug: vine
    .string()
    .trim()
    .toLowerCase()
    .minLength(2)
    .maxLength(32)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .notIn(RESERVED_SLUGS)
    .unique({ table: 'organizations', column: 'slug' }),
  fullName: vine.string().trim().nullable(),
  email: vine.string().trim().email().maxLength(254).unique({ table: 'users', column: 'email' }),
  password: vine.string().minLength(8).maxLength(32),
  passwordConfirmation: vine.string().sameAs('password'),
})

/**
 * Validator to use before validating user credentials
 * during login
 */
export const loginValidator = vine.create({
  email: vine.string().email().maxLength(254),
  password: vine.string(),
})
