import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

/**
 * Placeholder for a list or page that has nothing to show yet.
 */
export default function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty__mark">
        <Icon size={22} />
      </div>
      <h2 className="empty__title">{title}</h2>
      {children && <p>{children}</p>}
    </div>
  )
}
