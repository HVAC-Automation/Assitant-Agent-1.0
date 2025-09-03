import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, email, action } = body

    // Handle token verification
    if (token) {
      const result = await EmailService.verifyEmailToken(token)
      
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

    // Handle resend verification email
    if (action === 'resend' && email) {
      const result = await EmailService.resendEmailVerification(email)
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message,
          // In development, return the token for testing
          ...(process.env.NODE_ENV === 'development' && { token: result.token })
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
      error: 'Invalid request. Provide either token or email with action=resend.'
    }, { status: 400 })

  } catch (error) {
    console.error('Email verification API error:', error)
    return NextResponse.json({
      success: false,
      error: 'An error occurred while processing your request.'
    }, { status: 500 })
  }
}