import Logo from '~/components/logo'
import { type ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import FlashToasts from '~/components/flash_toasts'
import ThemeToggle from '~/components/theme_toggle'
import NavLink, { type NavItem } from '~/components/nav_link'
import { AppWindow, Fingerprint, House, KeyRound, Layers, LogOut, Users } from 'lucide-react'

/**
 * Every console page belongs to the organization. Environments appear on
 * the pages of apps and members, where something differs per environment.
 */
const nav: NavItem[] = [
  { label: 'Overview', route: 'overview.show', icon: House },
  { label: 'Apps', route: 'apps.index', icon: AppWindow },
  { label: 'Members', route: 'members.index', icon: Users },
  { label: 'Roles', route: 'roles.index', icon: KeyRound },
]

const settingsNav: NavItem[] = [
  { label: 'Environments', route: 'environments.index', icon: Layers },
  { label: 'Authentication', route: 'identity_providers.index', icon: Fingerprint },
]

function NavGroup({ label, items, org }: { label: string; items: NavItem[]; org: string }) {
  return (
    <nav className="console__group" aria-label={label}>
      {items.map(({ label: itemLabel, route, icon: Icon }) => (
        <NavLink
          key={itemLabel}
          route={route}
          routeParams={{ org }}
          className="sidebar-layout__item"
        >
          {Icon && <Icon size={16} />}
          {itemLabel}
        </NavLink>
      ))}
    </nav>
  )
}

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const { props } = usePage()
  const org = props.organization?.slug ?? ''

  return (
    <>
      <header className="header header--bar">
        <div className="header__inner">
          <div className="console__brand">
            <Logo size={26} />
            <span className="console__org">{props.organization?.name}</span>
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
          <NavGroup label="Console" items={nav} org={org} />
          <NavGroup label="Settings" items={settingsNav} org={org} />
        </aside>

        <main className="console__main">{children}</main>
      </div>
      <FlashToasts />
    </>
  )
}
