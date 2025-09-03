import { NextRequest, NextResponse } from 'next/server'
import { UserManager } from '@/lib/user-management'
import { EmailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create user
    const user = await UserManager.createUser({
      email,
      password,
      firstName,
      lastName,
      role: 'user', // New users are always 'user' role by default
      emailVerified: false, // Will be verified via email
    })

    // Send email verification
    try {
      const emailResult = await EmailService.sendEmailVerification(user.id, user.email)
      
      if (emailResult.success) {
        return NextResponse.json({
          success: true,
          message: 'Account created successfully! Please check your email to verify your account.',
          requiresEmailVerification: true,
          // In development, return token for testing
          ...(process.env.NODE_ENV === 'development' && { verificationToken: emailResult.token })
        })
      } else {
        console.warn('Failed to send verification email:', emailResult.error)
        // Don't fail registration if email fails, just inform user
        return NextResponse.json({
          success: true,
          message: 'Account created successfully! However, we couldn\'t send the verification email. You can request a new one from the login page.',
          requiresEmailVerification: true
        })
      }
    } catch (emailError) {
      console.error('Email verification error during registration:', emailError)
      return NextResponse.json({
        success: true,
        message: 'Account created successfully! However, we couldn\'t send the verification email. You can request a new one from the login page.',
        requiresEmailVerification: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
        }
      })
    }

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}