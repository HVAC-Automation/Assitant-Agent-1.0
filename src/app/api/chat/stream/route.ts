import { NextRequest, NextResponse } from 'next/server'
import { ElevenAIService } from '@/lib/eleven-ai'

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

    // Get streaming response
    const stream = await elevenAI.streamMessage(message, conversationId, deviceId)

    // Create a readable stream that formats the response for the client
    const responseStream = new ReadableStream({
      start(controller) {
        const reader = stream.getReader()
        
        const pump = async (): Promise<void> => {
          try {
            const { done, value } = await reader.read()
            
            if (done) {
              // Send final message to close the stream
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
              controller.close()
              return
            }

            // Format as Server-Sent Events
            const sseData = `data: ${JSON.stringify(value)}\n\n`
            controller.enqueue(new TextEncoder().encode(sseData))
            
            return pump()
          } catch (error) {
            console.error('Streaming error:', error)
            controller.error(error)
          }
        }
        
        return pump()
      }
    })

    // Return streaming response
    return new NextResponse(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  } catch (error) {
    console.error('Chat Stream API Error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: error.message },
          { status: 429 }
        )
      }
      
      if (error.message.includes('API error')) {
        return NextResponse.json(
          { error: 'AI streaming service temporarily unavailable. Please try again.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to start message stream. Please try again.' },
      { status: 500 }
    )
  }
}