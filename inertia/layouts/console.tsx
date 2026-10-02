import { urlFor } from '~/client'
import Logo from '~/components/logo'
import { type ReactNode } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import FlashToasts from '~/components/flash_toasts'
import ThemeToggle from '~/components/theme_toggle'
import NavLink, { type NavItem } from '~/components/nav_link'
import { AppWindow, House, KeyRound, LogOut, Users } from 'lucide-react'

/**
 * Organization pages are shared by every environment.
 */
const organizationNav: NavItem[] = [
  { label: 'Overview', route: 'overview.show', icon: House },
  { label: 'Apps', route: 'apps.index', icon: AppWindow },
]

/**
 * Environment pages only ever show the data of the selected environment.
 */
const environmentNav: NavItem[] = [
  { label: 'Members', route: 'members.index', icon: Users },
  { label: 'Roles', route: 'roles.index', icon: KeyRound },
]

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const { props, url } = usePage()
  const org = props.organization?.slug ?? ''
  const environments = props.environments ?? []

  /**
   * On an environment page the switcher keeps the current section and only
   * swaps the environment. Elsewhere it opens that environment's members.
   * Without a current environment, the environment links use the first
   * (least sensitive) environment.
   */
  const current = environments.find(({ slug }) => slug === props.currentEnvironment)
  const selected = current ?? environments[0]
  const switchTo = (slug: string) =>
    current
      ? url.split('?')[0].replace(`/environments/${current.slug}/`, `/environments/${slug}/`)
      : urlFor('members.index', { org, environment: slug })

  return (
    <>
      <header className="header header--bar">
        <div className="header__inner">
          <div className="console__brand">
            <Logo size={26} />
            <span className="console__org">{props.organization?.name}</span>
            {selected && (
              <>
                <span className="console__sep" aria-hidden="true">
                  /
                </span>
                <select
                  aria-label="Environment"
                  className="field__input envswitch"
                  value={selected.slug}
                  onChange={(event) => router.visit(switchTo(event.target.value))}
                >
                  {environments.map(({ slug, name }) => (
                    <option key={slug} value={slug}>
                      {name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
          <div className="header__right">
            <ThemeToggle />
            <Form route="session.destroy">
              <button type="submit" className="btn btn--secondary btn--sm">
                <LogOut size={15} /> Log out
              </button>
            </Form>
          </div>
        </div>
      </header>

      <div className="console">
        <aside className="console__sidebar">
          <nav className="console__group" aria-label="Organization">
            <span className="console__label">Organization</span>
            {organizationNav.map(({ label, route, icon: Icon }) => (
              <NavLink
                key={label}
                route={route}
                routeParams={{ org }}
                className="sidebar-layout__item"
              >
                {Icon && <Icon size={16} />}
                {label}
              </NavLink>
            ))}
          </nav>

          {selected && (
            <nav className="console__group" aria-label={`${selected.name} environment`}>
              <span className="console__label">{selected.name}</span>
              {environmentNav.map(({ label, route, icon: Icon }) => (
                <NavLink
                  key={label}
                  route={route}
                  routeParams={{ org, environment: selected.slug }}
                  className="sidebar-layout__item"
                >
                  {Icon && <Icon size={16} />}
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
        </aside>

        <main className="console__main">
          {current && !current.isProduction && (
            <div className="env-banner" role="note">
              You are in <strong>{current.name}</strong>. Changes here never affect other
              environments.
            </div>
          )}
          {children}
        </main>
      </div>
      <FlashToasts />
    </>
  )
}
