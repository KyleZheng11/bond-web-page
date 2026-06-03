import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/profile')({ component: Profile })

function Profile() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ color: 'var(--color-text-mist)' }}>Profile — coming soon</p>
    </div>
  )
}
