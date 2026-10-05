import type { Data } from '@generated/data'
import { Link } from '@adonisjs/inertia/react'

/**
 * The organization's roles as checkboxes, for giving a member roles on an
 * app. At least one is required. `checked` ticks the roles already held.
 */
export default function RoleCheckboxes({
  roles,
  checked = [],
  error,
  org,
}: {
  roles: Data.Role[]
  checked?: number[]
  error?: string
  org: string
}) {
  return (
    <fieldset className="field">
      <legend className="field__label">Roles</legend>
      {roles.length === 0 ? (
        <span className="field__hint">
          No roles yet.{' '}
          <Link route="roles.create" routeParams={{ org }}>
            Create a role
          </Link>{' '}
          first.
        </span>
      ) : (
        <div className="checks">
          {roles.map((role) => (
            <label key={role.id} className="check">
              <input
                type="checkbox"
                name="roleIds[]"
                value={role.id}
                defaultChecked={checked.includes(role.id)}
              />
              {role.name}
              {role.description && <span className="check__hint">{role.description}</span>}
            </label>
          ))}
        </div>
      )}
      {error && <span className="field__error">{error}</span>}
    </fieldset>
  )
}
