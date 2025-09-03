import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { UserManager } from '@/lib/user-management'
import { EmailService } from '@/lib/email-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details
    const user = await UserManager.getUserById(params.id)
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'User email is already verified' },
        { status: 400 }
      )
    }

    // Send verification email
    const result = await EmailService.sendEmailVerification(user.id, user.email)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Verification email sent to ${user.email}`,
        // In development, return token for testing
        ...(process.env.NODE_ENV === 'development' && { token: result.token })
      })
    } else {
      return NextResponse.json(
        { error: result.message || 'Failed to send verification email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Send verification email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}