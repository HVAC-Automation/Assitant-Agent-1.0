import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

// Create Supabase client with service role for admin operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface CreateUserData {
  email: string
  password: string
  firstName?: string
  lastName?: string
  role?: 'admin' | 'user'
  emailVerified?: boolean
}

export interface UserProfile {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: 'admin' | 'user'
  emailVerified: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export class UserManager {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Create a new user
   */
  static async createUser(userData: CreateUserData): Promise<UserProfile> {
    const {
      email,
      password,
      firstName,
      lastName,
      role = 'user',
      emailVerified = false
    } = userData

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Hash password
    const passwordHash = await this.hashPassword(password)

    // Create user
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName || null,
        last_name: lastName || null,
        role,
        email_verified: emailVerified,
        is_active: true,
      })
      .select('id, email, first_name, last_name, role, email_verified, is_active, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      throw new Error('Failed to create user account')
    }

    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      role: newUser.role,
      emailVerified: newUser.email_verified,
      isActive: newUser.is_active,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at,
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<UserProfile | null> {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, email_verified, is_active, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<UserProfile | null> {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, email_verified, is_active, created_at, updated_at')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const updateData: any = {}

    if (updates.firstName !== undefined) updateData.first_name = updates.firstName
    if (updates.lastName !== undefined) updateData.last_name = updates.lastName
    if (updates.role !== undefined) updateData.role = updates.role
    if (updates.emailVerified !== undefined) updateData.email_verified = updates.emailVerified
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, first_name, last_name, role, email_verified, is_active, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error updating user:', error)
      throw new Error('Failed to update user')
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      role: updatedUser.role,
      emailVerified: updatedUser.email_verified,
      isActive: updatedUser.is_active,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    const passwordHash = await this.hashPassword(newPassword)

    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId)

    if (error) {
      console.error('Error changing password:', error)
      throw new Error('Failed to change password')
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_active: false })
      .eq('id', userId)

    if (error) {
      console.error('Error deactivating user:', error)
      throw new Error('Failed to deactivate user')
    }
  }

  /**
   * Reactivate user account
   */
  static async reactivateUser(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_active: true })
      .eq('id', userId)

    if (error) {
      console.error('Error reactivating user:', error)
      throw new Error('Failed to reactivate user')
    }
  }

  /**
   * Delete user account
   */
  static async deleteUser(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Error deleting user:', error)
      throw new Error('Failed to delete user')
    }
  }

  /**
   * List all users with pagination (admin only)
   */
  static async listUsers(page: number = 1, limit: number = 50): Promise<{
    users: UserProfile[]
    total: number
    page: number
    totalPages: number
  }> {
    const offset = (page - 1) * limit

    // Get total count
    const { count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Get paginated users
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, email_verified, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error listing users:', error)
      throw new Error('Failed to retrieve users')
    }

    const userProfiles: UserProfile[] = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }))

    return {
      users: userProfiles,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    }
  }
}