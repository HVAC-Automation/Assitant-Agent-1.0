import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { UserManager } from '@/lib/user-management'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, userIds } = body

    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: action and userIds' },
        { status: 400 }
      )
    }

    if (!['activate', 'deactivate', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be activate, deactivate, or delete' },
        { status: 400 }
      )
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const userId of userIds) {
      try {
        switch (action) {
          case 'activate':
            await UserManager.reactivateUser(userId)
            successCount++
            break
          case 'deactivate':
            await UserManager.deactivateUser(userId)
            successCount++
            break
          case 'delete':
            await UserManager.deleteUser(userId)
            successCount++
            break
        }
      } catch (error: any) {
        errorCount++
        errors.push(`User ${userId}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${action} operation completed`,
      results: {
        total: userIds.length,
        success: successCount,
        errors: errorCount,
        errorDetails: errors
      }
    })
  } catch (error: any) {
    console.error('Bulk user operation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}