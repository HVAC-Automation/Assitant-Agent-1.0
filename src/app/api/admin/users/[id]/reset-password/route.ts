import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { UserManager } from '@/lib/user-management'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user to verify they exist
    const user = await UserManager.getUserById(userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate and set new temporary password
    const temporaryPassword = await UserManager.adminResetPassword(userId)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      temporaryPassword,
      userEmail: user.email,
    })
  } catch (error: any) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}