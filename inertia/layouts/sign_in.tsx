import { type ReactNode } from 'react'
import FlashToasts from '~/components/flash_toasts'
import ThemeToggle from '~/components/theme_toggle'

/**
 * The frame of an issuer's login page, which members see when an app asks
 * them to sign in. It is the organization's page, not the console's, so it
 * carries no console navigation.
 */
export default function SignInLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="signin">
        <div className="signin__top">
          <ThemeToggle />
        </div>
        <div className="auth__form-wrap">{children}</div>
      </div>
      <FlashToasts />
    </>
  )
}
