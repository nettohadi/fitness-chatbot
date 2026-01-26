# NextAuth Setup Guide

This guide covers installing and configuring NextAuth for the admin and user dashboard authentication system.

## Overview

The dashboard uses two authentication methods:
1. **Admin Login** - Email/password authentication using NextAuth CredentialsProvider
2. **User Login** - OTP (One-Time Password) authentication via Telegram

## Step 1: Install Dependencies

Run the following command to install NextAuth and related packages:

```bash
npm install next-auth@beta bcryptjs
npm install --save-dev @types/bcryptjs
```

**Package Details:**
- `next-auth@beta` - NextAuth v5 (beta) with App Router support
- `bcryptjs` - Password hashing library
- `@types/bcryptjs` - TypeScript types for bcryptjs

### Verify Installation

Check that packages were added to `package.json`:

```bash
grep -A 5 '"dependencies"' package.json | grep next-auth
grep -A 5 '"dependencies"' package.json | grep bcryptjs
```

---

## Step 2: Environment Variables

Add the following to your `.env` file:

```env
# NextAuth Configuration
NEXTAUTH_SECRET=<generate-with-command-below>
NEXTAUTH_URL=http://localhost:3000

# OTP Settings
OTP_EXPIRY_MINUTES=10
```

### Generate NEXTAUTH_SECRET

Use OpenSSL to generate a secure random secret:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the `NEXTAUTH_SECRET` value in `.env`.

**Example:**
```env
NEXTAUTH_SECRET=<paste-your-generated-secret-here>
```

### Production Environment

For production (Vercel), update `NEXTAUTH_URL`:

```env
NEXTAUTH_URL=https://your-domain.vercel.app
```

---

## Step 3: NextAuth Configuration

Create the NextAuth configuration file at:
`src/app/api/auth/[...nextauth]/route.ts`

This file will contain:
- Two CredentialsProviders (admin-login, user-otp)
- JWT and session callbacks
- Custom pages configuration

**File will be created in next step.**

---

## Step 4: Create Admin Creation Script

The script at `scripts/create-admin.ts` will allow you to create admin users with hashed passwords.

**Usage after creation:**
```bash
npx tsx scripts/create-admin.ts admin@example.com MySecurePassword123 "Admin Name"
```

**File will be created in next step.**

---

## Step 5: Type Definitions

Update NextAuth types to include custom session fields.

Create `src/types/next-auth.d.ts`:

```typescript
import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role: string
      phoneNumber?: string
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    role: string
    phoneNumber?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    phoneNumber?: string
  }
}
```

---

## Step 6: Middleware (Optional but Recommended)

Protect admin routes with middleware.

Create `src/middleware.ts`:

```typescript
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
        // Protect /admin routes - require admin role
        if (req.nextUrl.pathname.startsWith("/admin/dashboard")) {
          return token?.role === "admin"
        }

        // Protect /dashboard routes - require user or admin role
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return token?.role === "user" || token?.role === "admin"
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/admin/dashboard/:path*",
    "/dashboard/:path*"
  ],
}
```

---

## Step 7: Session Provider (Client Component)

For client-side session access, wrap your app with SessionProvider.

Create `src/components/providers/SessionProvider.tsx`:

```typescript
"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { ReactNode } from "react"

export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
```

Then wrap your app in `src/app/layout.tsx`:

```typescript
import { SessionProvider } from "@/components/providers/SessionProvider"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

---

## Step 8: Testing Authentication

### Test Admin Login

1. Create an admin user:
   ```bash
   npx tsx scripts/create-admin.ts admin@example.com TestPass123 "Test Admin"
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Navigate to:
   ```
   http://localhost:3000/admin/login
   ```

4. Login with:
   - Email: `admin@example.com`
   - Password: `TestPass123`

### Test User OTP

1. Send message to bot: "I want to see my dashboard"
2. Bot generates 6-digit OTP
3. Click dashboard link from bot
4. Enter OTP code
5. Should access user dashboard

---

## Troubleshooting

### Error: "Module not found: Can't resolve 'next-auth'"

**Solution:** Ensure you installed the beta version:
```bash
npm install next-auth@beta --save
```

### Error: "NEXTAUTH_SECRET is not defined"

**Solution:** Add `NEXTAUTH_SECRET` to your `.env` file:
```bash
openssl rand -base64 32
```

### Error: "Callback URL mismatch"

**Solution:** Ensure `NEXTAUTH_URL` in `.env` matches your dev/production URL.

Development:
```env
NEXTAUTH_URL=http://localhost:3000
```

Production:
```env
NEXTAUTH_URL=https://your-app.vercel.app
```

### Error: "Invalid credentials" (Admin Login)

**Solution:**
1. Verify admin user exists in database:
   ```bash
   npx tsx -e "import { prisma } from './src/lib/prisma'; prisma.adminUser.findMany().then(console.log)"
   ```

2. Check password hash is valid (bcrypt format starts with `$2a$` or `$2b$`)

3. Recreate admin user if needed

### Session not persisting

**Solution:**
1. Check that `SessionProvider` wraps your app
2. Verify cookies are enabled in browser
3. Check browser console for errors

---

## Security Best Practices

### Password Requirements

Enforce strong passwords when creating admins:
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, and symbols
- No common passwords

### Rate Limiting

Implement rate limiting on login endpoints:
- Max 5 failed attempts per email/phone number
- Lockout period: 15 minutes

### OTP Security

- OTPs expire after 10 minutes
- Mark as `verified=true` after use (prevent reuse)
- Clean up expired OTPs periodically

### JWT Secret Rotation

Rotate `NEXTAUTH_SECRET` periodically (every 3-6 months):
1. Generate new secret
2. Update `.env` file
3. All users will need to re-login

---

## NextAuth Configuration Options

### Session Strategy

We use JWT strategy (default) for stateless sessions:

```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days
}
```

### Custom Pages

Override default auth pages:

```typescript
pages: {
  signIn: "/admin/login",      // Custom admin login page
  error: "/auth/error",         // Error page
  signOut: "/auth/signout",     // Sign out confirmation
}
```

### Callbacks

We use callbacks to add custom data to JWT and session:

```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.role = user.role
      token.phoneNumber = user.phoneNumber
    }
    return token
  },
  async session({ session, token }) {
    session.user.role = token.role
    session.user.id = token.sub
    session.user.phoneNumber = token.phoneNumber
    return session
  }
}
```

---

## API Usage Examples

### Server Components (App Router)

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    redirect("/admin/login")
  }

  return <div>Welcome, {session.user.name}!</div>
}
```

### Client Components

```typescript
"use client"

import { useSession } from "next-auth/react"

export default function UserProfile() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    return <div>Not authenticated</div>
  }

  return <div>Hello, {session.user.name}</div>
}
```

### API Routes

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Proceed with authenticated request
  return NextResponse.json({ data: "Secret data" })
}
```

---

## Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [NextAuth v5 Beta](https://authjs.dev/getting-started/migrating-to-v5)
- [Credentials Provider](https://next-auth.js.org/providers/credentials)
- [JWT Session Strategy](https://next-auth.js.org/configuration/options#session)

---

## Next Steps

After completing this setup:

1. ✅ Install dependencies (npm install)
2. ✅ Add environment variables to `.env`
3. ✅ Create NextAuth configuration file
4. ✅ Create admin creation script
5. ✅ Create type definitions
6. ✅ Test admin login
7. 🚀 Build dashboard pages

---

## Summary Checklist

- [ ] Install `next-auth@beta` and `bcryptjs`
- [ ] Generate and add `NEXTAUTH_SECRET` to `.env`
- [ ] Create NextAuth route handler
- [ ] Create admin creation script
- [ ] Add NextAuth type definitions
- [ ] (Optional) Add middleware for route protection
- [ ] Wrap app with SessionProvider
- [ ] Create first admin user
- [ ] Test admin login flow
- [ ] Test OTP flow (after webhook implementation)
