import { supabase } from '#/lib/supabase'

const REDIRECT_URL = `${window.location.origin}/home`

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: REDIRECT_URL },
  })
}


export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: REDIRECT_URL },
  })
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}
