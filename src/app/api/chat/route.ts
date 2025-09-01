import { NextRequest, NextResponse } from 'next/server'
import { ElevenAIService } from '@/lib/eleven-ai'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, deviceId } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      )
    }

    // Initialize 11.ai service
    const elevenAI = new ElevenAIService()

    // Send message to 11.ai
    const response = await elevenAI.sendMessage(message, conversationId, deviceId)

    // Store conversation in Supabase
    try {
      // Get or create user session
      const { data: userSession } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('device_id', deviceId)
        .single()

      if (userSession) {
        // Get or create conversation
        let { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', response.conversation_id)
          .single()

        if (!conversation) {
          const { data: newConversation } = await supabase
            .from('conversations')
            .insert({
              id: response.conversation_id,
              user_id: userSession.id,
              title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
            })
            .select('id')
            .single()
          
          conversation = newConversation
        }

        if (conversation) {
          // Store both user message and assistant response
          await supabase
            .from('messages')
            .insert([
              {
                conversation_id: response.conversation_id,
                role: 'user',
                content: message
              },
              {
                conversation_id: response.conversation_id,
                role: 'assistant', 
                content: response.response
              }
            ])
        }
      }
    } catch (dbError) {
      console.warn('Failed to store conversation in database:', dbError)
      // Continue with response even if DB storage fails
    }

    return NextResponse.json({
      response: response.response,
      conversationId: response.conversation_id,
      messageId: response.message_id,
      usage: response.usage
    })
  } catch (error) {
    console.error('Chat API Error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: error.message },
          { status: 429 }
        )
      }
      
      if (error.message.includes('API error')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable. Please try again.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to process message. Please try again.' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  try {
    const elevenAI = new ElevenAIService()
    const isHealthy = await elevenAI.healthCheck()
    
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: '11.ai',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        service: '11.ai',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}