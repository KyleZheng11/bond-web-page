export type Friend = {
  friendshipId: string
  userId: string
  displayName: string | null
  email: string
}

export type FriendRequest = {
  friendshipId: string
  requesterId: string
  displayName: string | null
  email: string
  createdAt: string | null
}

export type UserSearchResult = {
  id: string
  display_name: string | null
  email: string
}
