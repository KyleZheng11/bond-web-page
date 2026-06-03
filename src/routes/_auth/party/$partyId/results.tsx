import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/party/$partyId/results')({ component: Results })

function Results() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ color: 'var(--color-text-mist)' }}>Results — coming soon</p>
    </div>
  )
}
