import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Allow request to proceed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname

        // Protect /admin/dashboard routes - require admin role
        if (pathname.startsWith("/admin/dashboard")) {
          return token?.role === "admin"
        }

        // Protect /dashboard routes - require user or admin role
        if (pathname.startsWith("/dashboard")) {
          return token?.role === "user" || token?.role === "admin"
        }

        // Allow all other routes
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/admin/dashboard/:path*",
    "/dashboard/:path*",
  ],
}
