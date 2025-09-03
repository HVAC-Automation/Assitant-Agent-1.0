import { NextRequest, NextResponse } from 'next/server'
import { PasswordResetService } from '@/lib/password-reset'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token, newPassword } = body

    // If email is provided, initiate password reset
    if (email && !token) {
      const result = await PasswordResetService.initiatePasswordReset(email)
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message,
          // In development, return the token. In production, this would be sent via email
          ...(process.env.NODE_ENV === 'development' && { token: result.token })
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.message
        }, { status: result.error === 'User not found' ? 200 : 400 }) // Return 200 for security (don't reveal if user exists)
      }
    }

    // If token and newPassword are provided, reset password
    if (token && newPassword) {
      const result = await PasswordResetService.resetPassword(token, newPassword)
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.message
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid request. Provide either email or token with newPassword.'
    }, { status: 400 })

  } catch (error) {
    console.error('Password reset API error:', error)
    return NextResponse.json({
      success: false,
      error: 'An error occurred while processing your request.'
    }, { status: 500 })
  }
}