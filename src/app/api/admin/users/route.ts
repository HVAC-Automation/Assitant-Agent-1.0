import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { UserManager } from '@/lib/user-management'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || undefined
    const role = searchParams.get('role') || undefined
    const status = searchParams.get('status') || undefined

    const filters = {
      search,
      role,
      status: status === 'active' ? 'active' : status === 'inactive' ? 'inactive' : undefined
    }

    const result = await UserManager.listUsers(page, limit, filters)

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Error listing users:', error)
    return NextResponse.json(
      { error: 'Failed to list users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, password, firstName, lastName, role, emailVerified } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const result = await UserManagement.createUser({
      email,
      password,
      firstName,
      lastName,
      role: role || 'user',
      emailVerified: emailVerified || false
    })

    return NextResponse.json({
      success: true,
      user: result
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}