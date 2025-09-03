import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

const supabaseServiceRole = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
)

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, email } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required.'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid email address.'
      }, { status: 400 })
    }

    // Check if email is already taken by another user
    if (email.toLowerCase() !== session.user.email?.toLowerCase()) {
      const { data: existingUser, error: checkError } = await supabaseServiceRole
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json({
          success: false,
          error: 'This email address is already in use by another account.'
        }, { status: 400 })
      }
    }

    // Update user profile
    const { error: updateError } = await supabaseServiceRole
      .from('users')
      .update({
        first_name: firstName?.trim() || null,
        last_name: lastName?.trim() || null,
        email: email.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update profile.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully!'
    })

  } catch (error) {
    console.error('Update profile API error:', error)
    return NextResponse.json({
      success: false,
      error: 'An error occurred while updating your profile.'
    }, { status: 500 })
  }
}