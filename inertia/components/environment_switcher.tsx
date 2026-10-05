import { router, usePage } from '@inertiajs/react'

/**
 * The environment the current page shows: from `?environment=`, or the
 * one last picked, or production (see the environment middleware)
 */
export function useCurrentEnvironment() {
  const { props } = usePage()
  return (props.environments ?? []).find(({ slug }) => slug === props.currentEnvironment)
}

/**
 * Picks the environment a page shows. It reloads the same page with
 * `?environment=`, and the choice carries over to other pages.
 */
export default function EnvironmentSwitcher() {
  const { props, url } = usePage()
  const environments = props.environments ?? []
  const current = useCurrentEnvironment()
  if (!current) {
    return null
  }

  const switchTo = (slug: string) => {
    const next = new URL(url, window.location.origin)
    next.searchParams.set('environment', slug)
    router.visit(`${next.pathname}${next.search}`)
  }

  return (
    <div className="envbar">
      <label htmlFor="environment" className="envbar__label">
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
