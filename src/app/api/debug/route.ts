import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey,
      url: supabaseUrl?.substring(0, 30) + '...',
      keyPrefix: serviceRoleKey?.substring(0, 20) + '...'
    })

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey
      }, { status: 500 })
    }

    // Test database connection
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role, is_active')
      .eq('email', 'admin@example.com')
      .single()

    console.log('Database query result:', { user: user?.email, error })

    if (error) {
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Test password verification
    const testPassword = 'admin123'
    const isValidPassword = await bcrypt.compare(testPassword, user.password_hash)
    
    // Generate a fresh hash for admin123 using our bcrypt
    const freshHash = await bcrypt.hash('admin123', 12)
    
    // Test the fresh hash
    const freshHashWorks = await bcrypt.compare('admin123', freshHash)
    
    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        hasPasswordHash: !!user.password_hash,
        passwordHashLength: user.password_hash?.length,
        passwordVerification: isValidPassword,
        currentHash: user.password_hash,
        freshHash: freshHash,
        freshHashWorks: freshHashWorks
      }
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}