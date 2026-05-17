import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🟢 CART PROTECTION
  if (pathname.startsWith('/cart')) {
    const sessionCookie = request.cookies.get('tavolarapida_session');

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 🟢 ADMIN PROTECTION
  if (pathname.startsWith('/admin')) {
    let response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 🔴 NON LOGGATO → redirect login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/cart'],
};