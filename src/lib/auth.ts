import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import type { Database } from './supabase'
import { PasswordResetService } from './password-reset'

// Create Supabase client for NextAuth (service role for admin operations)
const supabaseServiceRole = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
)

const authConfig = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-key',
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
  }),
  session: {
    strategy: 'jwt',
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
            .select('id, email, password_hash, first_name, last_name, role, is_active, email_verified, failed_login_attempts, locked_until')
            .eq('email', credentials.email.toLowerCase())
            .single()

          if (error || !user) {
            // Handle failed login attempt even if user doesn't exist (security)
            await PasswordResetService.handleFailedLogin(credentials.email as string)
            throw new Error('Invalid email or password')
          }

          // Check if account is locked
          const now = new Date()
          const lockedUntil = user.locked_until ? new Date(user.locked_until) : null
          
          if (lockedUntil && now < lockedUntil) {
            const minutesLeft = Math.ceil((lockedUntil.getTime() - now.getTime()) / (1000 * 60))
            throw new Error(`Account is temporarily locked due to too many failed login attempts. Please try again in ${minutesLeft} minutes or reset your password.`)
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
            // Handle failed login attempt
            const lockoutInfo = await PasswordResetService.handleFailedLogin(credentials.email as string)
            
            if (lockoutInfo.isLocked) {
              throw new Error('Too many failed login attempts. Your account has been temporarily locked. Please reset your password or try again later.')
            } else if (lockoutInfo.attemptsLeft > 0) {
              throw new Error(`Invalid email or password. ${lockoutInfo.attemptsLeft} attempt${lockoutInfo.attemptsLeft === 1 ? '' : 's'} remaining before account lockout.`)
            }
            
            throw new Error('Invalid email or password')
          }

          // Clear failed attempts on successful login
          await PasswordResetService.clearFailedAttempts(user.id)

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
    async jwt({ token, user, account, trigger }) {
      // Persist user data in JWT token
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = (user as any).role
        token.emailVerified = (user as any).emailVerified
        token.isActive = (user as any).isActive
      }
      
      // Refresh user data from database when session is updated
      if (trigger === 'update' && token.id) {
        try {
          const { data: userData, error } = await supabaseServiceRole
            .from('users')
            .select('id, email, first_name, last_name, role, email_verified, is_active')
            .eq('id', token.id as string)
            .single()

          if (userData && !error) {
            token.email = userData.email
            token.role = userData.role
            token.emailVerified = userData.email_verified
            token.isActive = userData.is_active
            // Update name from first_name and last_name
            const fullName = userData.first_name 
              ? `${userData.first_name} ${userData.last_name || ''}`.trim()
              : userData.email
            token.name = fullName
          }
        } catch (error) {
          console.error('Error refreshing user data in JWT:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        ;(session.user as any).role = token.role as string
        ;(session.user as any).emailVerified = token.emailVerified as boolean
        ;(session.user as any).isActive = token.isActive as boolean
      }
      return session
    },
    async signIn({ user, account, profile }) {
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
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User ${user.email} signed in`)
    },
    async signOut({ session, token }) {
      console.log(`User signed out`)
    },
  },
})

export const { handlers, auth, signIn, signOut } = authConfig