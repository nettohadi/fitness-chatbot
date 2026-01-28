import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { rateLimiters } from "@/lib/security/rateLimit"

export const authOptions: NextAuthOptions = {
  providers: [
    // Admin login with email/password
    CredentialsProvider({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        // Rate limit login attempts per email
        const rateLimit = rateLimiters.login(credentials.email)
        if (!rateLimit.allowed) {
          throw new Error("Too many login attempts. Please try again in 15 minutes.")
        }

        // Find admin user by email
        const admin = await prisma.adminUser.findUnique({
          where: { email: credentials.email },
        })

        if (!admin) {
          throw new Error("Invalid email or password")
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          admin.passwordHash
        )

        if (!isValidPassword) {
          throw new Error("Invalid email or password")
        }

        // Update last login time
        await prisma.adminUser.update({
          where: { id: admin.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: admin.id,
          email: admin.email,
          name: admin.fullName,
          role: admin.role,
        }
      },
    }),

    // User login with OTP
    CredentialsProvider({
      id: "user-otp",
      name: "User OTP",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "text" },
        otpCode: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.otpCode) {
          throw new Error("Phone number and OTP code are required")
        }

        // Find valid OTP session
        const otpSession = await prisma.otpSession.findFirst({
          where: {
            phoneNumber: credentials.phoneNumber,
            otpCode: credentials.otpCode,
            verified: false,
            expiresAt: {
              gt: new Date(), // Not expired
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        })

        if (!otpSession) {
          throw new Error("Invalid or expired OTP code")
        }

        // Mark OTP as verified (prevent reuse)
        await prisma.otpSession.update({
          where: { id: otpSession.id },
          data: { verified: true },
        })

        // Find user by phone number
        const user = await prisma.user.findUnique({
          where: { phoneNumber: credentials.phoneNumber },
        })

        if (!user) {
          throw new Error("User not found")
        }

        return {
          id: user.id,
          name: user.fullName || user.nickname || "User",
          phoneNumber: user.phoneNumber,
          role: "user",
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/admin/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      // On sign in, add custom fields to token
      if (user) {
        token.role = user.role
        token.phoneNumber = user.phoneNumber
      }
      return token
    },

    async session({ session, token }) {
      // Add custom fields to session
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
        session.user.phoneNumber = token.phoneNumber as string
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}
