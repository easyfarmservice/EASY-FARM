import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// This route handles the redirect from Supabase email confirmation links.
// Supabase sends: yoursite.com/auth/callback?code=XXXX
// We exchange the code for a session and redirect the user in.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/baskets';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component — ignore
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Successfully confirmed email and created session — send to app
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Code exchange failed
    return NextResponse.redirect(
      `${origin}/login?error=confirmation_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  // No code present — redirect to login with error
  return NextResponse.redirect(
    `${origin}/login?error=missing_code&message=${encodeURIComponent('Email confirmation link is invalid or expired. Please request a new one.')}`
  );
}
