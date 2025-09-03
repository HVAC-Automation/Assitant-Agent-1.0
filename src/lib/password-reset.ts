import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import type { Database } from './supabase'

const supabaseServiceRole = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
)

export class PasswordResetService {
  /**
   * Initiate password reset - generates token and sends email (or returns token for now)
   */
  static async initiatePasswordReset(email: string): Promise<{
    success: boolean
    token?: string
    message: string
    error?: string
  }> {
    try {
      // Check if user exists
      const { data: user, error: userError } = await supabaseServiceRole
        .from('users')
        .select('id, email, is_active')
        .eq('email', email.toLowerCase())
        .single()

      if (userError || !user) {
        return {
          success: false,
          message: 'If this email exists in our system, you will receive a password reset link.',
          error: 'User not found'
        }
      }

      if (!user.is_active) {
        return {
          success: false,
          message: 'Account is deactivated. Please contact support.',
          error: 'Account deactivated'
        }
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const expires_at = new Date()
      expires_at.setHours(expires_at.getHours() + 1) // Token expires in 1 hour

      // Store reset token in database
      const { error: tokenError } = await supabaseServiceRole
        .from('password_reset_tokens')
        .insert([{
          user_id: user.id,
          token: resetToken,
          expires_at: expires_at.toISOString(),
          used: false
        }])

      if (tokenError) {
        console.error('Error storing reset token:', tokenError)
        return {
          success: false,
          message: 'Failed to initiate password reset.',
          error: 'Database error'
        }
      }

      // TODO: Send email with reset link
      // For now, return the token (in production this would be sent via email)
      
      return {
        success: true,
        token: resetToken,
        message: 'Password reset instructions have been sent to your email.',
      }

    } catch (error) {
      console.error('Password reset initiation error:', error)
      return {
        success: false,
        message: 'An error occurred while processing your request.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token: string, newPassword: string): Promise<{
    success: boolean
    message: string
    error?: string
  }> {
    try {
      // Validate password strength
      if (newPassword.length < 8) {
        return {
          success: false,
          message: 'Password must be at least 8 characters long.',
          error: 'Weak password'
        }
      }

      // Find valid reset token
      const { data: resetToken, error: tokenError } = await supabaseServiceRole
        .from('password_reset_tokens')
        .select('id, user_id, expires_at, used')
        .eq('token', token)
        .eq('used', false)
        .single()

      if (tokenError || !resetToken) {
        return {
          success: false,
          message: 'Invalid or expired reset token.',
          error: 'Token not found'
        }
      }

      // Check if token is expired
      const now = new Date()
      const expires_at = new Date(resetToken.expires_at)
      
      if (now > expires_at) {
        return {
          success: false,
          message: 'Reset token has expired. Please request a new one.',
          error: 'Token expired'
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12)

      // Update user password and clear lockout
      const { error: updateError } = await supabaseServiceRole
        .from('users')
        .update({
          password_hash: hashedPassword,
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', resetToken.user_id)

      if (updateError) {
        console.error('Error updating password:', updateError)
        return {
          success: false,
          message: 'Failed to reset password.',
          error: 'Database update error'
        }
      }

      // Mark token as used
      await supabaseServiceRole
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('id', resetToken.id)

      return {
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.'
      }

    } catch (error) {
      console.error('Password reset error:', error)
      return {
        success: false,
        message: 'An error occurred while resetting your password.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(user_id: string, currentPassword: string, newPassword: string): Promise<{
    success: boolean
    message: string
    error?: string
  }> {
    try {
      // Validate new password strength
      if (newPassword.length < 8) {
        return {
          success: false,
          message: 'New password must be at least 8 characters long.',
          error: 'Weak password'
        }
      }

      // Get user's current password hash
      const { data: user, error: userError } = await supabaseServiceRole
        .from('users')
        .select('id, password_hash')
        .eq('id', user_id)
        .single()

      if (userError || !user) {
        return {
          success: false,
          message: 'User not found.',
          error: 'User not found'
        }
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
      
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect.',
          error: 'Invalid current password'
        }
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12)

      // Update password
      const { error: updateError } = await supabaseServiceRole
        .from('users')
        .update({
          password_hash: hashedNewPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)

      if (updateError) {
        console.error('Error updating password:', updateError)
        return {
          success: false,
          message: 'Failed to change password.',
          error: 'Database update error'
        }
      }

      return {
        success: true,
        message: 'Password changed successfully.'
      }

    } catch (error) {
      console.error('Change password error:', error)
      return {
        success: false,
        message: 'An error occurred while changing your password.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Handle failed login attempt - track attempts and lock account if needed
   */
  static async handleFailedLogin(email: string): Promise<{
    isLocked: boolean
    attemptsLeft: number
    locked_until?: Date
  }> {
    try {
      const { data: user, error } = await supabaseServiceRole
        .from('users')
        .select('id, failed_login_attempts, locked_until')
        .eq('email', email.toLowerCase())
        .single()

      if (error || !user) {
        return { isLocked: false, attemptsLeft: 3 }
      }

      // Check if account is currently locked
      const now = new Date()
      const locked_until = user.locked_until ? new Date(user.locked_until) : null
      
      if (locked_until && now < locked_until) {
        return {
          isLocked: true,
          attemptsLeft: 0,
          locked_until
        }
      }

      // Increment failed attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1
      const maxAttempts = 3
      const attemptsLeft = maxAttempts - newAttempts

      // Lock account if max attempts reached
      let lockUntil: string | null = null
      if (newAttempts >= maxAttempts) {
        const lockDuration = new Date()
        lockDuration.setMinutes(lockDuration.getMinutes() + 15) // Lock for 15 minutes
        lockUntil = lockDuration.toISOString()
      }

      // Update user record
      await supabaseServiceRole
        .from('users')
        .update({
          failed_login_attempts: newAttempts,
          locked_until: lockUntil,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      return {
        isLocked: newAttempts >= maxAttempts,
        attemptsLeft: Math.max(0, attemptsLeft),
        locked_until: lockUntil ? new Date(lockUntil) : undefined
      }

    } catch (error) {
      console.error('Error handling failed login:', error)
      return { isLocked: false, attemptsLeft: 3 }
    }
  }

  /**
   * Clear failed login attempts on successful login
   */
  static async clearFailedAttempts(user_id: string): Promise<void> {
    try {
      await supabaseServiceRole
        .from('users')
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)
    } catch (error) {
      console.error('Error clearing failed attempts:', error)
    }
  }
}