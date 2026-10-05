import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

/**
 * Placeholder for a list or page that has nothing to show yet, with an
 * optional action to get started
 */
export default function EmptyState({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon
  title: string
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty__mark">
        <Icon size={22} />
      </div>
      <h2 className="empty__title">{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
