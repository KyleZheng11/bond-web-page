import type { Tables } from '#/types/database'

export type Party = Tables<'parties'>
export type PartyMember = Tables<'party_members'>
export type PartyStatus = 'open' | 'searching' | 'voting' | 'resolved'
