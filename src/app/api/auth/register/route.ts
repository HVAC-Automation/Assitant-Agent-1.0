import { NextRequest, NextResponse } from 'next/server'
import { UserManager } from '@/lib/user-management'

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
      emailVerified: false, // Email verification will be implemented later
    })

    // Return user data (without sensitive information)
    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
      }
    })

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