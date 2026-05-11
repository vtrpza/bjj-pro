import type { ReactNode } from 'react'

type StateViewProps = {
  action?: ReactNode
  description: string
  title: string
}

function StateView({ action, description, title }: StateViewProps) {
  return (
    <section className="state-view card" aria-live="polite">
      <h1>{title}</h1>
      <p>{description}</p>
      {action ? <div className="state-action">{action}</div> : null}
    </section>
  )
}

export function LoadingState({ description = 'Buscando dados do Jiu-Jitsu.', title = 'Carregando' }: Partial<StateViewProps>) {
  return (
    <section className="state-view card state-view-loading" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  )
}

export function ErrorState({ action, description, title }: StateViewProps) {
  return <StateView title={title} description={description} action={action} />
}

export function EmptyState({ action, description, title }: StateViewProps) {
  return <StateView title={title} description={description} action={action} />
}
