import { createClient } from '@supabase/supabase-js'

// PKCE : le retour de connexion Google arrive dans ?code=…, avant le #.
// En flux implicite, le jeton atterrit dans le fragment et écrase la route.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } },
)
