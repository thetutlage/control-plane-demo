import vine from '@vinejs/vine'

const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

/**
 * Email domains come from a text box, one per line. Commas and spaces
 * separate them too, a leading `@` is dropped, and duplicates collapse.
 */
export function emailDomainLines(value: string) {
  const domains = value
    .toLowerCase()
    .split(/[\s,]+/)
    .map((domain) => domain.replace(/^@/, ''))
    .filter(Boolean)

  return [...new Set(domains)]
}

/**
 * Between 1 and 20 email domains, such as `acme.com`
 */
export const emailDomainList = vine.createRule((value, _, field) => {
  const domains = emailDomainLines(String(value))
  if (domains.length === 0) {
    return field.report('Add at least one email domain', 'emailDomainList', field)
  }
  if (domains.length > 20) {
    return field.report('Add at most 20 email domains', 'emailDomainList', field)
  }

  const invalid = domains.find((domain) => !DOMAIN.test(domain))
  if (invalid) {
    field.report(
      `"${invalid}" is not an email domain. Enter domains like acme.com`,
      'emailDomainList',
      field
    )
  }
})
