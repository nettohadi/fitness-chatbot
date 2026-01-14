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
