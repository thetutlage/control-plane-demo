import Logo from '~/components/logo'
import { type ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import FlashToasts from '~/components/flash_toasts'
import ThemeToggle from '~/components/theme_toggle'
import NavLink, { type NavItem } from '~/components/nav_link'
import { AppWindow, House, KeyRound, LogOut, Users } from 'lucide-react'

/**
 * Every console page. Pages that show one environment's data have their
 * own environment switcher.
 */
const nav: NavItem[] = [
  { label: 'Overview', route: 'overview.show', icon: House },
  { label: 'Apps', route: 'apps.index', icon: AppWindow },
  { label: 'Members', route: 'members.index', icon: Users },
  { label: 'Roles', route: 'roles.index', icon: KeyRound },
]

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
          <nav className="console__group" aria-label="Console">
            {nav.map(({ label, route, icon: Icon }) => (
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
        </aside>

        <main className="console__main">{children}</main>
      </div>
      <FlashToasts />
    </>
  )
}
