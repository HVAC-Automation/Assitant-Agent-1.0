import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Check if user is accessing admin routes
    if (pathname.startsWith('/admin')) {
      if (!token) {
        return NextResponse.redirect(new URL('/auth/signin?callbackUrl=' + encodeURIComponent(pathname), req.url))
      }
      
      if (token.role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    // Check if user is accessing protected routes
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/settings') || pathname.startsWith('/profile')) {
      if (!token) {
        return NextResponse.redirect(new URL('/auth/signin?callbackUrl=' + encodeURIComponent(pathname), req.url))
      }

      if (!token.isActive) {
        return NextResponse.redirect(new URL('/account-deactivated', req.url))
      }
    }

    // Redirect authenticated users away from auth pages
    if (token && (pathname.startsWith('/auth/signin') || pathname.startsWith('/auth/signup'))) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Always allow access to auth pages and public pages
        if (
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/api/auth/') ||
          pathname === '/' ||
          pathname.startsWith('/public') ||
          pathname.startsWith('/_next/') ||
          pathname.startsWith('/favicon')
        ) {
          return true
        }

        // For protected routes, require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
}