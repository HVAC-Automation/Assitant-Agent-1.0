import { NextRequest, NextResponse } from 'next/server'
import { UserManager } from '@/lib/user-management'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token, newPassword } = body

    if (email && !token && !newPassword) {
      // Request password reset token
      try {
        const resetToken = await UserManager.createPasswordResetToken(email)
        
        // In a real app, you would send this token via email
        // For demo purposes, we'll return it (don't do this in production!)
        return NextResponse.json({
          success: true,
          message: 'Password reset token created',
          // Remove this in production - send via email instead
          token: resetToken,
          email: email
        })
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    } else if (token && newPassword) {
      // Reset password using token
      try {
        await UserManager.resetPasswordWithToken(token, newPassword)
        
        return NextResponse.json({
          success: true,
          message: 'Password reset successfully'
        })
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid request. Provide either email (for token) or token + newPassword' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Password reset API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}