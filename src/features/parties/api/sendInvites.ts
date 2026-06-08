import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const sendInvites = createServerFn()
  .inputValidator((d: { partyId: string; phoneNumbers: string[] }) => d)
  .handler(async ({ data }) => {
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

    const members = data.phoneNumbers.map((phone) => ({
      party_id: data.partyId,
      phone_number: phone,
      guest_token: crypto.randomUUID(),
      expires_at: expiresAt,
    }))

    const { error } = await supabaseServer.from('party_members').insert(members)
    if (error) throw new Error(error.message)

    // TODO: replace with real Twilio calls once credentials are added
    members.forEach((m) => {
      console.log(`[SMS stub] → ${m.phone_number}: /invite/${m.guest_token}`)
    })

    return { ok: true }
  })
