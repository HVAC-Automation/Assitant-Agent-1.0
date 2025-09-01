import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import type { Database } from '@/lib/supabase'

const supabaseServiceRole = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
)

const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-key',
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
  }),
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'Enter your email'
        },
        password: { 
          label: 'Password', 
          type: 'password',
          placeholder: 'Enter your password'
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        // Check if environment variables are properly configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.error('Missing Supabase environment variables')
          throw new Error('Authentication service is not properly configured')
        }

        try {
          // Get user from database
          const { data: user, error } = await supabaseServiceRole
            .from('users')
            .select('id, email, password_hash, first_name, last_name, role, is_active, email_verified')
            .eq('email', credentials.email.toLowerCase())
            .single()

          if (error || !user) {
            throw new Error('Invalid email or password')
          }

          // Check if user is active
          if (!user.is_active) {
            throw new Error('Account is deactivated. Please contact support.')
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(
            credentials.password as string, 
            user.password_hash
          )

          if (!isValidPassword) {
            throw new Error('Invalid email or password')
          }

          // Return user object (password_hash excluded for security)
          return {
            id: user.id,
            email: user.email,
            name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email,
            role: user.role,
            emailVerified: user.email_verified,
            isActive: user.is_active,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }: any) {
      // Persist user data in JWT token
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = (user as any).role
        token.emailVerified = (user as any).emailVerified
        token.isActive = (user as any).isActive
      }
      return token
    },
    async session({ session, token }: any) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        ;(session.user as any).role = token.role as string
        ;(session.user as any).emailVerified = token.emailVerified as boolean
        ;(session.user as any).isActive = token.isActive as boolean
      }
      return session
    },
    async signIn({ user, account, profile }: any) {
      // Additional sign-in validation can be added here
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  events: {
    async signIn({ user, account, profile, isNewUser }: any) {
      console.log(`User ${user.email} signed in`)
    },
    async signOut({ session, token }: any) {
      console.log(`User signed out`)
    },
  },
}

const handler = NextAuth(authOptions)

export const GET = handler.GET
export const POST = handler.POST