import { createClient } from '@supabase/supabase-js';

// WARNING: Service role key bypasses RLS policies! Only use on trusted server-side API routes after verifying admin authorization.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tuhnxwpnlwfllvouhpvu.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('CRITICAL SECURITY ERROR: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
