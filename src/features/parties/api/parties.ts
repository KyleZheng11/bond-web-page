import { supabase } from '#/lib/supabase'

export async function getMyParties(userId: string) {
  return supabase
    .from('parties')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })
}
