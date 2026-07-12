import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getAuthState } from '#/features/auth'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const auth = await getAuthState()
    if (!auth) throw redirect({ to: '/welcome' })
    return { auth }
  },
  component: () => <Outlet />,
})
