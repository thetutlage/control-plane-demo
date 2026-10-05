import type { Data } from '@generated/data'

/**
 * How an environment is shown everywhere in the console: a badge, colored
 * by kind, never a sentence like "in Production"
 */
export default function EnvironmentBadge({
  environment,
}: {
  environment: Pick<Data.Environment, 'name' | 'kind'>
}) {
  return (
    <span className={`badge env-badge env-badge--${environment.kind.formatted.toLowerCase()}`}>
      {environment.name}
    </span>
  )
}
