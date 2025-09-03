const nodemailer = require('nodemailer')
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

const supabaseServiceRole = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
)

// Create transporter based on environment configuration
const createTransporter = () => {
  // For development, use a test service like Mailtrap or log emails
  if (process.env.NODE_ENV === 'development') {
    // Return a test transporter that logs emails
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    })
  }

  // Production configuration - use your preferred email service
  // Examples for common providers:
  
  if (process.env.EMAIL_PROVIDER === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    })
  }

  if (process.env.EMAIL_PROVIDER === 'sendgrid') {
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    })
  }

  if (process.env.EMAIL_PROVIDER === 'resend') {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 587,
      secure: false,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
      }
    })
  }

  // Default SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

export class EmailService {
  private static transporter = createTransporter()

  /**
   * Send email verification token to user
   */
  static async sendEmailVerification(userId: string, email: string): Promise<{
    success: boolean
    token?: string
    message: string
    error?: string
  }> {
    try {
      // Generate verification token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // Token expires in 24 hours

      // Store verification token in database
      const { error: tokenError } = await supabaseServiceRole
        .from('email_verification_tokens')
        .insert([{
          user_id: userId,
          token,
          expires_at: expiresAt.toISOString()
        }])

      if (tokenError) {
        console.error('Error storing verification token:', tokenError)
        return {
          success: false,
          message: 'Failed to create verification token.',
          error: 'Database error'
        }
      }

      // Create verification URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`

      // Email template
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
        to: email,
        subject: 'Verify Your Email Address',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Verify Your Email</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e9ecef; }
              .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
              .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
              .button:hover { background: #0056b3; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; color: #007bff;">AI Assistant</h1>
              </div>
              <div class="content">
                <h2>Verify Your Email Address</h2>
                <p>Thank you for signing up! Please click the button below to verify your email address and complete your account setup.</p>
                
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </p>
                
                <p>If you can't click the button, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                  ${verificationUrl}
                </p>
                
                <p><strong>This link will expire in 24 hours.</strong></p>
                
                <p>If you didn't create an account with us, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>This email was sent from AI Assistant. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Verify Your Email Address
          
          Thank you for signing up! Please visit the link below to verify your email address and complete your account setup.
          
          ${verificationUrl}
          
          This link will expire in 24 hours.
          
          If you didn't create an account with us, please ignore this email.
        `
      }

      // Send email
      if (process.env.NODE_ENV === 'development') {
        // In development, log the email instead of sending
        console.log('📧 EMAIL VERIFICATION (Development Mode)')
        console.log('To:', email)
        console.log('Subject:', mailOptions.subject)
        console.log('Verification URL:', verificationUrl)
        console.log('Token:', token)
        console.log('---')
        
        return {
          success: true,
          token, // Return token in development for testing
          message: 'Verification email logged (development mode). Check console for details.'
        }
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log('Verification email sent:', info.messageId)

      return {
        success: true,
        message: 'Verification email sent successfully!'
      }

    } catch (error) {
      console.error('Email verification sending error:', error)
      return {
        success: false,
        message: 'Failed to send verification email.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Verify email token and mark email as verified
   */
  static async verifyEmailToken(token: string): Promise<{
    success: boolean
    message: string
    error?: string
  }> {
    try {
      // Find valid verification token
      const { data: verificationToken, error: tokenError } = await supabaseServiceRole
        .from('email_verification_tokens')
        .select('id, user_id, expires_at')
        .eq('token', token)
        .single()

      if (tokenError || !verificationToken) {
        return {
          success: false,
          message: 'Invalid or expired verification token.',
          error: 'Token not found'
        }
      }

      // Check if token is expired
      const now = new Date()
      const expiresAt = new Date(verificationToken.expires_at)
      
      if (now > expiresAt) {
        // Delete expired token
        await supabaseServiceRole
          .from('email_verification_tokens')
          .delete()
          .eq('id', verificationToken.id)

        return {
          success: false,
          message: 'Verification token has expired. Please request a new one.',
          error: 'Token expired'
        }
      }

      // Mark user email as verified
      const { error: updateError } = await supabaseServiceRole
        .from('users')
        .update({
          email_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', verificationToken.user_id)

      if (updateError) {
        console.error('Error updating user email verification:', updateError)
        return {
          success: false,
          message: 'Failed to verify email.',
          error: 'Database update error'
        }
      }

      // Delete used token
      await supabaseServiceRole
        .from('email_verification_tokens')
        .delete()
        .eq('id', verificationToken.id)

      return {
        success: true,
        message: 'Email verified successfully!'
      }

    } catch (error) {
      console.error('Email verification error:', error)
      return {
        success: false,
        message: 'An error occurred while verifying your email.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Resend email verification
   */
  static async resendEmailVerification(email: string): Promise<{
    success: boolean
    token?: string
    message: string
    error?: string
  }> {
    try {
      // Find user by email
      const { data: user, error: userError } = await supabaseServiceRole
        .from('users')
        .select('id, email, email_verified')
        .eq('email', email.toLowerCase())
        .single()

      if (userError || !user) {
        return {
          success: false,
          message: 'User not found.',
          error: 'User not found'
        }
      }

      if (user.email_verified) {
        return {
          success: false,
          message: 'Email is already verified.',
          error: 'Already verified'
        }
      }

      // Delete any existing tokens for this user
      await supabaseServiceRole
        .from('email_verification_tokens')
        .delete()
        .eq('user_id', user.id)

      // Send new verification email
      return await this.sendEmailVerification(user.id, user.email)

    } catch (error) {
      console.error('Resend email verification error:', error)
      return {
        success: false,
        message: 'Failed to resend verification email.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}