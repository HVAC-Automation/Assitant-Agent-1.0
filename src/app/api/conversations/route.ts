import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const conversationId = searchParams.get('conversationId')

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      )
    }

    // Get user session
    const { data: userSession } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('device_id', deviceId)
      .single()

    if (!userSession) {
      return NextResponse.json(
        { error: 'User session not found' },
        { status: 404 }
      )
    }

    if (conversationId) {
      // Get specific conversation with messages
      const { data: conversation } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          messages (
            id,
            role,
            content,
            created_at
          )
        `)
        .eq('id', conversationId)
        .eq('user_id', userSession.id)
        .single()

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        conversationId: conversation.id,
        title: conversation.title,
        messages: conversation.messages?.map((msg: {
          id: string;
          role: string;
          content: string;
          created_at: string;
        }) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at
        })) || []
      })
    } else {
      // Get all conversations for user
      const { data: conversations } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          created_at,
          updated_at
        `)
        .eq('user_id', userSession.id)
        .order('updated_at', { ascending: false })

      return NextResponse.json({
        conversations: conversations || []
      })
    }
  } catch (error) {
    console.error('Conversations API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const conversationId = searchParams.get('conversationId')

    if (!deviceId || !conversationId) {
      return NextResponse.json(
        { error: 'Device ID and Conversation ID are required' },
        { status: 400 }
      )
    }

    // Get user session
    const { data: userSession } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('device_id', deviceId)
      .single()

    if (!userSession) {
      return NextResponse.json(
        { error: 'User session not found' },
        { status: 404 }
      )
    }

    // Delete conversation (messages will be deleted via CASCADE)
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userSession.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}