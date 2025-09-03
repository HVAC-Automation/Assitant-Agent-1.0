import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PasswordResetService } from '@/lib/password-reset'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        success: false,
        error: 'Both current password and new password are required.'
      }, { status: 400 })
    }

    const result = await PasswordResetService.changePassword(
      session.user.id, 
      currentPassword, 
      newPassword
    )

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

  } catch (error) {
    console.error('Change password API error:', error)
    return NextResponse.json({
      success: false,
      error: 'An error occurred while changing your password.'
    }, { status: 500 })
  }
}