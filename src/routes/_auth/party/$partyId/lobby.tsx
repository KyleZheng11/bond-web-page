import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/party/$partyId/lobby')({ component: Lobby })

function Lobby() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ color: 'var(--color-text-mist)' }}>Lobby — coming soon</p>
    </div>
  )
}
