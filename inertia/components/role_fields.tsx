import type { Data } from '@generated/data'

type Catalog = Data.PermissionCatalog
type Role = Data.Role.Variants['forEdit']

/**
 * Catalogue keys grouped by their area, the part before `:`
 * (`billing:invoice.read` is in `billing`). Keys without one are grouped
 * under "other".
 */
function groupByArea(permissions: Catalog['permissions']) {
  const groups = new Map<string, Catalog['permissions']>()
  for (const permission of permissions) {
    const area = permission.key.includes(':') ? permission.key.split(':')[0] : 'other'
    groups.set(area, [...(groups.get(area) ?? []), permission])
  }
  return [...groups.entries()]
}

/**
 * A role's name, description and permission keys, for the create and edit
 * forms. Keys come from the catalogue. When editing, keys the role holds
 * that have left the catalogue are listed too, ticked and flagged, until
 * unticked.
 */
export default function RoleFields({
  errors,
  catalog,
  role,
}: {
  errors: Record<string, string | undefined>
  catalog: Catalog | null
  role?: Role
}) {
  const held = new Set(role?.permissions ?? [])

  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          className="field__input"
          placeholder="Finance Admin"
          defaultValue={role?.name}
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && <span className="field__error">{errors.name}</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="field__input field__input--textarea"
          placeholder="Optional"
          defaultValue={role?.description ?? ''}
          aria-invalid={errors.description ? 'true' : 'false'}
        />
        {errors.description && <span className="field__error">{errors.description}</span>}
      </div>

      <fieldset className="field">
        <legend className="field__label">Permissions</legend>
        {!catalog ? (
          <span className="field__hint">
            No catalogue synced yet. A role without permissions still decides who can sign in to an
            app.
          </span>
        ) : (
          groupByArea(catalog.permissions).map(([area, permissions]) => (
            <div key={area} className="checks">
              <span className="checks__title mono">{area}</span>
              {permissions.map(({ key, description }) => (
                <label key={key} className="check">
                  <input
                    type="checkbox"
                    name="permissions[]"
                    value={key}
                    defaultChecked={held.has(key)}
                  />
                  <code className="mono">{key}</code>
                  {description && <span className="check__hint">{description}</span>}
                </label>
              ))}
            </div>
          ))
        )}
        {role && role.missingKeys.length > 0 && (
          <div className="checks">
            <span className="checks__title">Missing from the catalogue</span>
            {role.missingKeys.map((key) => (
              <label key={key} className="check">
                <input type="checkbox" name="permissions[]" value={key} defaultChecked />
                <code className="mono">{key}</code>
                <span className="badge badge--warn">No app checks this key any more</span>
              </label>
            ))}
          </div>
        )}
        {errors.permissions && <span className="field__error">{errors.permissions}</span>}
      </fieldset>
    </>
  )
}
