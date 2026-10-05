import { router, usePage } from '@inertiajs/react'

/**
 * The environment the current console page belongs to
 */
export function useCurrentEnvironment() {
  const { props } = usePage()
  return (props.environments ?? []).find(({ slug }) => slug === props.currentEnvironment)
}

/**
 * The route params every console page's links need: the organization and
 * the current environment
 */
export function useConsoleParams() {
  const { props } = usePage()
  return { org: props.organization?.slug ?? '', environment: props.currentEnvironment ?? '' }
}

/**
 * Picks the environment the whole console shows. It keeps the current
 * section (`/w/acme/staging/apps/invoices` becomes `/w/acme/production/apps`),
 * since a record of one environment never exists in another.
 */
export default function EnvironmentSwitcher() {
  const { props, url } = usePage()
  const environments = props.environments ?? []
  const current = useCurrentEnvironment()
  if (!current) {
    return null
  }

  const switchTo = (slug: string) => {
    const [, w, org, , section] = url.split('?')[0].split('/')
    router.visit(`/${w}/${org}/${slug}/${section}`)
  }

  return (
    <div className="envbar">
      <label htmlFor="environment" className="console__label">
        Environment
      </label>
      <select
        id="environment"
        className={`field__input envswitch envswitch--${current.kind.formatted.toLowerCase()}`}
        value={current.slug}
        onChange={(event) => switchTo(event.target.value)}
      >
        {environments.map(({ slug, name }) => (
          <option key={slug} value={slug}>
            {name}
          </option>
        ))}
      </select>
    </div>
  )
}
