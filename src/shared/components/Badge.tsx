import type { ReactNode } from 'react'

type BadgeVariant = 'success' | 'warn' | 'danger' | 'info' | 'neutral' | 'primary'

type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warn: 'badge-warn',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
  primary: 'badge-primary'
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return <span className={`badge ${variantMap[variant]}`}>{children}</span>
}
