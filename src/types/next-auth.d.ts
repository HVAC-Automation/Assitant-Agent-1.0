import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: 'admin' | 'user'
      emailVerified: boolean
      isActive: boolean
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: 'admin' | 'user'
    emailVerified: boolean
    isActive: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    role: 'admin' | 'user'
    emailVerified: boolean
    isActive: boolean
  }
}