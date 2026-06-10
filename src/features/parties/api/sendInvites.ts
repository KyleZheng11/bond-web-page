import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const sendInvites = createServerFn()
  .inputValidator((d: { partyId: string; phoneNumbers: string[] }) => d)
  .handler(async ({ data }) => {
    const { partyId, phoneNumbers } = data
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

    const members = phoneNumbers.map((phone) => ({
      party_id: partyId,
      phone_number: phone,
      guest_token: crypto.randomUUID(),
      expires_at: expiresAt,
    }))

    const { error } = await supabaseServer.from('party_members').insert(members)
    if (error) throw new Error(error.message)

    return { ok: true }
  })
