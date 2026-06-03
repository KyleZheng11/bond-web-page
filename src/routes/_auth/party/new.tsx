import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/party/new')({ component: NewParty })

function NewParty() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ color: 'var(--color-text-mist)' }}>Create party — coming soon</p>
    </div>
  )
}
